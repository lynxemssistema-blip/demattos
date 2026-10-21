import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { combo_id } = await req.json();

    const combos = await base44.asServiceRole.entities.Combo.filter({ id: combo_id });
    if (!combos || combos.length === 0) {
      return Response.json({ error: 'Combo não encontrado' }, { status: 404 });
    }

    const combo = combos[0];

    // Criar ou atualizar produto no Stripe
    let stripeProductId = combo.stripe_product_id;

    if (stripeProductId) {
      await stripe.products.update(stripeProductId, {
        name: combo.nome,
        description: combo.descricao || `Combo: ${combo.nome}`,
        images: combo.imagem_url ? [combo.imagem_url] : [],
        metadata: { tipo: 'combo', combo_id: combo.id }
      });

      // Arquivar preço antigo e criar novo
      if (combo.stripe_price_id) {
        await stripe.prices.update(combo.stripe_price_id, { active: false });
      }
    } else {
      const stripeProduct = await stripe.products.create({
        name: combo.nome,
        description: combo.descricao || `Combo: ${combo.nome}`,
        images: combo.imagem_url ? [combo.imagem_url] : [],
        metadata: { tipo: 'combo', combo_id: combo.id }
      });
      stripeProductId = stripeProduct.id;
    }

    // Criar novo preço
    const stripePrice = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: Math.round(combo.preco * 100),
      currency: 'brl',
    });

    // Atualizar combo com IDs do Stripe
    await base44.asServiceRole.entities.Combo.update(combo.id, {
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePrice.id
    });

    return Response.json({ success: true, stripe_product_id: stripeProductId, stripe_price_id: stripePrice.id });

  } catch (error) {
    console.error('Erro ao sincronizar combo com Stripe:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});