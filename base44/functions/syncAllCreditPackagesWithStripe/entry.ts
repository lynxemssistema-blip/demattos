import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
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

    // Buscar todos os pacotes
    const pacotes = await base44.asServiceRole.entities.PacoteCredito.filter({});

    const syncResults = [];
    const errors = [];

    for (const pacote of pacotes) {
      try {
        let stripeProductId = pacote.stripe_product_id;
        let stripePriceId = pacote.stripe_price_id;

        // Criar produto no Stripe se não existir
        if (!stripeProductId) {
          const stripeProduct = await stripe.products.create({
            name: pacote.nome,
            description: `Pacote de ${pacote.quantidade_tokens} créditos IA`,
            active: pacote.ativo,
            metadata: {
              base44_pacote_id: pacote.id,
              tipo: 'creditos_ia'
            }
          });
          stripeProductId = stripeProduct.id;
        } else {
          // Atualizar produto existente
          await stripe.products.update(stripeProductId, {
            name: pacote.nome,
            description: `Pacote de ${pacote.quantidade_tokens} créditos IA`,
            active: pacote.ativo,
          });
        }

        // Criar novo price
        const stripePrice = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: Math.round(pacote.preco_reais * 100),
          currency: 'brl',
          metadata: {
            base44_pacote_id: pacote.id
          }
        });
        stripePriceId = stripePrice.id;

        // Atualizar pacote com IDs do Stripe
        await base44.asServiceRole.entities.PacoteCredito.update(pacote.id, {
          stripe_product_id: stripeProductId,
          stripe_price_id: stripePriceId
        });

        syncResults.push({
          pacote_id: pacote.id,
          nome: pacote.nome,
          stripe_product_id: stripeProductId,
          stripe_price_id: stripePriceId
        });

      } catch (error) {
        errors.push({
          pacote_id: pacote.id,
          nome: pacote.nome,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `${syncResults.length} pacotes sincronizados com Stripe`,
      synced: syncResults,
      errors: errors
    });

  } catch (error) {
    console.error('Erro ao sincronizar pacotes:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});