import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { nome, quantidade_tokens, preco_reais, descricao } = await req.json();

    if (!nome || !quantidade_tokens || !preco_reais) {
      return Response.json({ 
        error: 'Nome, quantidade_tokens e preco_reais são obrigatórios' 
      }, { status: 400 });
    }

    // Criar produto no Stripe
    const product = await stripe.products.create({
      name: nome,
      description: descricao || `${quantidade_tokens} créditos para DeMattos IA`,
      metadata: {
        quantidade_tokens: quantidade_tokens.toString(),
      },
    });

    // Criar preço no Stripe (em centavos)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(preco_reais * 100), // Converter para centavos
      currency: 'brl',
      metadata: {
        quantidade_tokens: quantidade_tokens.toString(),
      },
    });

    return Response.json({
      success: true,
      product_id: product.id,
      price_id: price.id,
    });

  } catch (error) {
    console.error('Erro ao criar produto no Stripe:', error);
    return Response.json({ 
      error: error.message || 'Erro ao criar produto no Stripe' 
    }, { status: 500 });
  }
});