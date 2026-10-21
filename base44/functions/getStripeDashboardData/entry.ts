import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar balance do Stripe
    const balance = await stripe.balance.retrieve();

    // Data de início do mês atual
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const timestampMes = Math.floor(primeiroDiaMes.getTime() / 1000);

    // Buscar charges do mês atual
    const chargesMes = await stripe.charges.list({
      created: { gte: timestampMes },
      limit: 100
    });

    // Buscar todas as charges (últimos 100)
    const chargesTotal = await stripe.charges.list({
      limit: 100
    });

    // Calcular métricas do mês
    const chargesConfirmadas = chargesMes.data.filter(c => c.status === 'succeeded');
    const volumeBrutoMes = chargesConfirmadas.reduce((acc, c) => acc + c.amount, 0) / 100;
    const quantidadeVendasMes = chargesConfirmadas.length;

    // Calcular métricas totais
    const chargesConfirmadasTotal = chargesTotal.data.filter(c => c.status === 'succeeded');
    const volumeBrutoTotal = chargesConfirmadasTotal.reduce((acc, c) => acc + c.amount, 0) / 100;
    const quantidadeVendasTotal = chargesConfirmadasTotal.length;

    // Charges pendentes
    const chargesPendentes = chargesMes.data.filter(c => c.status === 'pending');
    const valorPendente = chargesPendentes.reduce((acc, c) => acc + c.amount, 0) / 100;

    // Últimos 7 dias
    const ultimos7Dias = [];
    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      data.setHours(0, 0, 0, 0);
      
      const proximoDia = new Date(data);
      proximoDia.setDate(proximoDia.getDate() + 1);
      
      const timestampInicio = Math.floor(data.getTime() / 1000);
      const timestampFim = Math.floor(proximoDia.getTime() / 1000);
      
      const vendasDia = chargesTotal.data.filter(c => {
        return c.status === 'succeeded' && c.created >= timestampInicio && c.created < timestampFim;
      });
      
      const totalDia = vendasDia.reduce((acc, c) => acc + c.amount, 0) / 100;
      
      ultimos7Dias.push({
        dia: data.getDate(),
        mes: data.getMonth() + 1,
        total: totalDia
      });
    }

    return Response.json({
      balance: {
        available: balance.available[0]?.amount / 100 || 0,
        pending: balance.pending[0]?.amount / 100 || 0
      },
      volumeBrutoMes,
      volumeBrutoTotal,
      quantidadeVendasMes,
      quantidadeVendasTotal,
      valorPendente,
      comprasPendentesQtd: chargesPendentes.length,
      ultimos7Dias
    });
  } catch (error) {
    console.error('Erro ao buscar dados do Stripe:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});