import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      const profissionais = await base44.asServiceRole.entities.Profissional.filter({
        email: user.email,
        tem_acesso_admin: true,
        ativo: true
      });
      if (profissionais.length === 0) {
        return Response.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    // Buscar agendamentos ativos (pendentes + confirmados) separadamente para evitar buscar 65k
    const [pendentes, confirmados, clientes, servicos, produtos, profissionais, galeria, depoimentos] = await Promise.all([
      base44.asServiceRole.entities.Agendamento.filter({ status: 'pendente' }, '-created_date').catch(() => []),
      base44.asServiceRole.entities.Agendamento.filter({ status: 'confirmado' }, '-created_date').catch(() => []),
      base44.asServiceRole.entities.Cliente.filter({}, '-created_date').catch(() => []),
      base44.asServiceRole.entities.Servico.filter({}, '-created_date').catch(() => []),
      base44.asServiceRole.entities.Produto.filter({}, '-created_date').catch(() => []),
      base44.asServiceRole.entities.Profissional.filter({}, '-created_date').catch(() => []),
      base44.asServiceRole.entities.ImagemGaleria.filter({}, '-created_date').catch(() => []),
      base44.asServiceRole.entities.Depoimento.filter({}, '-created_date').catch(() => []),
    ]);

    return Response.json({
      success: true,
      stats: {
        agendamentos: (Array.isArray(pendentes) ? pendentes.length : 0) + (Array.isArray(confirmados) ? confirmados.length : 0),
        clientes: Array.isArray(clientes) ? clientes.length : 0,
        servicos: Array.isArray(servicos) ? servicos.length : 0,
        produtos: Array.isArray(produtos) ? produtos.length : 0,
        profissionais: Array.isArray(profissionais) ? profissionais.length : 0,
        galeria: Array.isArray(galeria) ? galeria.length : 0,
        depoimentos: Array.isArray(depoimentos) ? depoimentos.length : 0,
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return Response.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
});