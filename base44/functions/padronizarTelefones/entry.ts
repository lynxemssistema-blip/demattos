import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função para normalizar telefone: remove tudo exceto números
function normalizarTelefone(telefone) {
  if (!telefone) return '';
  return telefone.replace(/\D/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar todos os clientes
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    let clientesAtualizados = 0;

    for (const cliente of clientes) {
      if (cliente.telefone) {
        const telefoneNormalizado = normalizarTelefone(cliente.telefone);
        if (telefoneNormalizado !== cliente.telefone) {
          await base44.asServiceRole.entities.Cliente.update(cliente.id, {
            telefone: telefoneNormalizado
          });
          clientesAtualizados++;
        }
      }
    }

    // Buscar todos os agendamentos
    const agendamentos = await base44.asServiceRole.entities.Agendamento.list();
    let agendamentosAtualizados = 0;

    for (const agendamento of agendamentos) {
      if (agendamento.cliente_telefone) {
        const telefoneNormalizado = normalizarTelefone(agendamento.cliente_telefone);
        if (telefoneNormalizado !== agendamento.cliente_telefone) {
          await base44.asServiceRole.entities.Agendamento.update(agendamento.id, {
            cliente_telefone: telefoneNormalizado
          });
          agendamentosAtualizados++;
        }
      }
    }

    return Response.json({
      success: true,
      clientesAtualizados,
      agendamentosAtualizados,
      totalClientes: clientes.length,
      totalAgendamentos: agendamentos.length
    });
  } catch (error) {
    console.error('Erro ao padronizar telefones:', error);
    return Response.json({ 
      error: 'Erro ao padronizar telefones',
      details: error.message 
    }, { status: 500 });
  }
});