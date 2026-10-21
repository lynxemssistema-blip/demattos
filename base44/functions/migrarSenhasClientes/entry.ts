import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as bcrypt from 'npm:bcrypt@5.1.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar se é admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar todos os clientes com canal
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ tem_canal: true });

    let migrados = 0;
    let erros = 0;
    const detalhes = [];

    for (const cliente of clientes) {
      try {
        // Verificar se a senha já está hashada (bcrypt hashes começam com $2)
        if (cliente.senha_canal && !cliente.senha_canal.startsWith('$2')) {
          // Senha em texto puro - fazer hash
          const senhaHash = await bcrypt.hash(cliente.senha_canal, 10);
          
          await base44.asServiceRole.entities.Cliente.update(cliente.id, {
            senha_canal: senhaHash
          });

          migrados++;
          detalhes.push({
            id: cliente.id,
            email: cliente.email,
            status: 'migrado'
          });
        } else {
          detalhes.push({
            id: cliente.id,
            email: cliente.email,
            status: 'já_hashada'
          });
        }
      } catch (error) {
        erros++;
        detalhes.push({
          id: cliente.id,
          email: cliente.email,
          status: 'erro',
          erro: error.message
        });
      }
    }

    return Response.json({ 
      success: true,
      total: clientes.length,
      migrados,
      erros,
      detalhes
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});