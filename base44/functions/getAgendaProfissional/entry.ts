import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Verificar autenticação e autorização
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const { profissional_id } = await req.json();

    if (!profissional_id) {
      return Response.json({ error: 'ID do profissional obrigatório' }, { status: 400 });
    }

    // Verificar se é admin ou o próprio profissional
    let autorizado = user.role === 'admin';
    
    if (!autorizado) {
      const profissionais = await base44.asServiceRole.entities.Profissional.filter({
        id: profissional_id,
        email: user.email,
        ativo: true
      });
      autorizado = profissionais.length > 0;
    }
    
    if (!autorizado) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar agendamentos do profissional
    const agendamentos = await base44.asServiceRole.entities.Agendamento.filter({
      profissional_id
    }, '-data');

    // Buscar dados dos clientes apenas para telefones necessários
    const telefones = [...new Set(agendamentos.map(a => a.cliente_telefone))];
    const clientesMap = {};
    
    for (const telefone of telefones) {
      const clientes = await base44.asServiceRole.entities.Cliente.filter({ telefone });
      if (clientes.length > 0) {
        const cliente = clientes[0];
        clientesMap[telefone] = {
          nome: cliente.nome,
          email: cliente.email,
          foto_url: cliente.foto_url,
          telefone: cliente.telefone
        };
      }
    }

    return Response.json({
      success: true,
      agendamentos,
      clientes: clientesMap
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar agenda' }, { status: 500 });
  }
});