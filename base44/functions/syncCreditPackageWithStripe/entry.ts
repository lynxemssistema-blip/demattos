import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { pacoteId, action } = await req.json();

    if (!pacoteId || !action) {
      return Response.json({ error: 'pacoteId e action são obrigatórios' }, { status: 400 });
    }

    // Buscar pacote
    const pacotes = await base44.asServiceRole.entities.PacoteCredito.filter({ id: pacoteId });
    if (pacotes.length === 0) {
      return Response.json({ error: 'Pacote não encontrado' }, { status: 404 });
    }

    const pacote = pacotes[0];

    if (action === 'create' || action === 'update') {
      let stripeProductId = pacote.stripe_product_id;
      let stripePriceId = pacote.stripe_price_id;

      // Verificar se já existe produto no Stripe antes de criar
      if (!stripeProductId) {
        // Buscar produto existente por metadata
        const existingProducts = await stripe.products.search({
          query: `metadata['base44_pacote_id']:'${pacote.id}'`
        });

        if (existingProducts.data.length > 0) {
          // Produto já existe, usar o existente
          stripeProductId = existingProducts.data[0].id;
        } else {
          // Criar novo produto
          const stripeProduct = await stripe.products.create({
            name: pacote.nome,
            description: `Pacote de ${pacote.quantidade_tokens} créditos IA`,
            metadata: {
              base44_pacote_id: pacote.id,
              tipo: 'creditos_ia'
            }
          });
          stripeProductId = stripeProduct.id;
        }
      } else {
        // Atualizar produto existente
        await stripe.products.update(stripeProductId, {
          name: pacote.nome,
          description: `Pacote de ${pacote.quantidade_tokens} créditos IA`,
        });
      }

      // Verificar se price já existe com mesmo valor
      const existingPrices = await stripe.prices.list({
        product: stripeProductId,
        active: true,
        limit: 100
      });

      const precoAtualEmCentavos = Math.round(pacote.preco_reais * 100);
      const priceExistente = existingPrices.data.find(
        p => p.unit_amount === precoAtualEmCentavos && p.currency === 'brl'
      );

      if (priceExistente) {
        // Usar price existente
        stripePriceId = priceExistente.id;
      } else {
        // Criar novo price apenas se o valor mudou
        const stripePrice = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: precoAtualEmCentavos,
          currency: 'brl',
          metadata: {
            base44_pacote_id: pacote.id
          }
        });
        stripePriceId = stripePrice.id;
      }

      // Atualizar pacote com IDs do Stripe
      await base44.asServiceRole.entities.PacoteCredito.update(pacote.id, {
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId
      });

      return Response.json({
        success: true,
        message: 'Pacote sincronizado com Stripe',
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId
      });
    }

    if (action === 'delete') {
      if (pacote.stripe_product_id) {
        // Arquivar produto no Stripe
        await stripe.products.update(pacote.stripe_product_id, {
          active: false
        });
      }

      return Response.json({
        success: true,
        message: 'Pacote arquivado no Stripe'
      });
    }

    if (action === 'activate' || action === 'deactivate') {
      if (pacote.stripe_product_id) {
        await stripe.products.update(pacote.stripe_product_id, {
          active: action === 'activate'
        });
      }

      return Response.json({
        success: true,
        message: `Pacote ${action === 'activate' ? 'ativado' : 'desativado'} no Stripe`
      });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao sincronizar pacote:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});