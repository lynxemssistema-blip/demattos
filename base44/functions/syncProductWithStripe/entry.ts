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

    const { productId, action } = await req.json();

    // Buscar produto
    const produtos = await base44.asServiceRole.entities.Produto.list();
    const produto = produtos.find(p => p.id === productId);

    if (!produto) {
      return Response.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    let stripeProductId = produto.stripe_product_id;
    let stripePriceId = produto.stripe_price_id;

    if (action === 'create' || action === 'update') {
      // Criar ou atualizar produto no Stripe
      if (!stripeProductId) {
        // Criar novo produto no Stripe
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
      } else {
        // Atualizar produto existente
        await stripe.products.update(stripeProductId, {
          name: produto.nome,
          description: produto.descricao || '',
          images: produto.imagem_url ? [produto.imagem_url] : [],
          active: produto.ativo,
        });
      }

      // Gerenciar preço
      if (!stripePriceId || action === 'update') {
        // Desativar preço antigo se existir
        if (stripePriceId) {
          await stripe.prices.update(stripePriceId, { active: false });
        }

        // Criar novo preço
        const stripePrice = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: Math.round(produto.preco * 100),
          currency: 'brl',
          metadata: {
            base44_id: produto.id,
          }
        });
        stripePriceId = stripePrice.id;
      }

      // Atualizar produto com IDs do Stripe
      await base44.asServiceRole.entities.Produto.update(productId, {
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      });

      return Response.json({
        success: true,
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      });
    }

    if (action === 'delete') {
      // Arquivar produto no Stripe (não pode deletar)
      if (stripeProductId) {
        await stripe.products.update(stripeProductId, { active: false });
      }

      return Response.json({ success: true });
    }

    if (action === 'deactivate') {
      // Desativar produto no Stripe
      if (stripeProductId) {
        await stripe.products.update(stripeProductId, { active: false });
      }

      return Response.json({ success: true });
    }

    if (action === 'activate') {
      // Ativar produto no Stripe
      if (stripeProductId) {
        await stripe.products.update(stripeProductId, { active: true });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ 
      error: 'Erro ao sincronizar produto com Stripe'
    }, { status: 500 });
  }
});