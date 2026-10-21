import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função para normalizar telefone: remove tudo exceto números
function normalizarTelefone(telefone) {
  if (!telefone) return '';
  return telefone.replace(/\D/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Usar o usuário autenticado, não o email do frontend
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const { dadosAtualizacao } = await req.json();

    // Buscar cliente autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });

    if (clientes.length === 0) {
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const cliente = clientes[0];

    // Campos permitidos para atualização
    const camposPermitidos = {
      nome: dadosAtualizacao.nome,
      telefone: dadosAtualizacao.telefone ? normalizarTelefone(dadosAtualizacao.telefone) : undefined,
      data_nascimento: dadosAtualizacao.data_nascimento,
      profissao: dadosAtualizacao.profissao,
      instagram: dadosAtualizacao.instagram,
      facebook: dadosAtualizacao.facebook,
      foto_url: dadosAtualizacao.foto_url,
    };

    // Remover campos undefined
    Object.keys(camposPermitidos).forEach(key => {
      if (camposPermitidos[key] === undefined) {
        delete camposPermitidos[key];
      }
    });

    // Atualizar cliente
    await base44.asServiceRole.entities.Cliente.update(cliente.id, camposPermitidos);

    // Se tem depoimentos, atualizar informações sincronizadas
    if (dadosAtualizacao.nome || dadosAtualizacao.profissao || dadosAtualizacao.foto_url) {
      const depoimentos = await base44.asServiceRole.entities.Depoimento.filter({
        cliente_id: cliente.id
      });

      for (const depoimento of depoimentos) {
        await base44.asServiceRole.entities.Depoimento.update(depoimento.id, {
          cliente_nome: dadosAtualizacao.nome || depoimento.cliente_nome,
          cliente_profissao: dadosAtualizacao.profissao || depoimento.cliente_profissao,
          cliente_foto_url: dadosAtualizacao.foto_url || depoimento.cliente_foto_url,
        });
      }
    }

    // Retornar cliente atualizado sem senha
    const clienteAtualizado = await base44.asServiceRole.entities.Cliente.filter({ email: user.email });
    const { senha_canal, observacoes, ...dadosPublicos } = clienteAtualizado[0];

    return Response.json({
      success: true,
      cliente: dadosPublicos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
});