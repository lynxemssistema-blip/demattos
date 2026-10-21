import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      deleted: 0,
      errors: [],
    };

    // Listar todos os produtos da Stripe
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const products = await stripe.products.list({
        limit: 100,
        starting_after: startingAfter,
      });

      for (const product of products.data) {
        try {
          // Listar TODOS os preços (ativos e inativos)
          const allPrices = await stripe.prices.list({
            product: product.id,
            limit: 100,
          });

          // Arquivar todos os preços
          for (const price of allPrices.data) {
            if (price.active) {
              await stripe.prices.update(price.id, { active: false });
            }
          }

          // Excluir o produto
          await stripe.products.del(product.id);
          results.deleted++;
        } catch (error) {
          results.errors.push({
            product_id: product.id,
            product_name: product.name,
            error: error.message,
          });
        }
      }

      hasMore = products.has_more;
      if (hasMore && products.data.length > 0) {
        startingAfter = products.data[products.data.length - 1].id;
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('Erro ao excluir produtos:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});