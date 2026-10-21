import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os produtos
    const produtos = await base44.asServiceRole.entities.Produto.list();
    
    const results = {
      total: produtos.length,
      synced: 0,
      errors: [],
    };

    for (const produto of produtos) {
      try {
        let stripeProductId = produto.stripe_product_id;
        let stripePriceId = produto.stripe_price_id;
        let needsUpdate = false;

        // Buscar produto existente no Stripe pelo base44_id nos metadados
        if (!stripeProductId) {
          const existingProducts = await stripe.products.search({
            query: `metadata['base44_id']:'${produto.id}'`,
            limit: 1,
          });
          
          if (existingProducts.data.length > 0) {
            stripeProductId = existingProducts.data[0].id;
            needsUpdate = true;
          }
        }

        // Criar ou atualizar produto no Stripe
        if (!stripeProductId) {
          const stripeProduct = await stripe.products.create({
            name: produto.nome,
            description: produto.descricao || '',
            images: produto.imagem_url ? [produto.imagem_url] : [],
            active: produto.ativo,
            metadata: {
              base44_id: produto.id,
              tipo: produto.tipo,
            }
          });
          stripeProductId = stripeProduct.id;
          needsUpdate = true;
        } else {
          // Atualizar produto existente
          await stripe.products.update(stripeProductId, {
            name: produto.nome,
            description: produto.descricao || '',
            images: produto.imagem_url ? [produto.imagem_url] : [],
            active: produto.ativo,
          });
        }

        // Buscar preço ativo do produto
        const prices = await stripe.prices.list({
          product: stripeProductId,
          active: true,
          limit: 1,
        });

        const precoAtualizado = Math.round(produto.preco * 100);
        
        // Verificar se o preço mudou ou não existe
        if (prices.data.length === 0 || prices.data[0].unit_amount !== precoAtualizado) {
          // Arquivar preço antigo se existir
          if (prices.data.length > 0) {
            await stripe.prices.update(prices.data[0].id, { active: false });
          }
          
          // Criar novo preço
          const stripePrice = await stripe.prices.create({
            product: stripeProductId,
            unit_amount: precoAtualizado,
            currency: 'brl',
            metadata: {
              base44_id: produto.id,
            }
          });
          stripePriceId = stripePrice.id;
          needsUpdate = true;
        } else {
          stripePriceId = prices.data[0].id;
          if (produto.stripe_price_id !== stripePriceId) {
            needsUpdate = true;
          }
        }

        // Atualizar produto no banco apenas se necessário
        if (needsUpdate || produto.stripe_product_id !== stripeProductId || produto.stripe_price_id !== stripePriceId) {
          await base44.asServiceRole.entities.Produto.update(produto.id, {
            stripe_product_id: stripeProductId,
            stripe_price_id: stripePriceId,
          });
        }

        results.synced++;
      } catch (error) {
        results.errors.push({
          produto_id: produto.id,
          produto_nome: produto.nome,
          error: error.message,
        });
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('Erro ao sincronizar produtos:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});