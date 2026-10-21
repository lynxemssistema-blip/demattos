import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // SEGURANÇA: Verificar autenticação
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { cliente_id } = await req.json();

    if (!cliente_id) {
      return Response.json({ error: 'ID do cliente obrigatório' }, { status: 400 });
    }

    // SEGURANÇA: Verificar ownership - cliente pertence ao usuário autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ 
      id: cliente_id,
      email: user.email 
    });
    
    if (clientes.length === 0) {
      return Response.json({ error: 'Sem permissão para acessar estas conversas' }, { status: 403 });
    }

    // Buscar apenas conversas do cliente logado
    const conversas = await base44.asServiceRole.entities.ConversaDeMattos.filter({
      cliente_id
    }, '-created_date');

    // Gerar signed URLs para fotos e prévias
    const conversasComURLs = await Promise.all(conversas.map(async (conversa) => {
      const conversaAtualizada = { ...conversa };

      // Fotos enviadas
      if (conversa.fotos_urls && Array.isArray(conversa.fotos_urls)) {
        conversaAtualizada.fotos_urls = await Promise.all(
          conversa.fotos_urls.map(async (url) => {
            if (url.startsWith('private/')) {
              try {
                const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
                  file_uri: url,
                  expires_in: 3600
                });
                return signed_url;
              } catch {
                return null;
              }
            }
            return url;
          })
        );
      }

      // Prévia gerada por IA
      if (conversa.previa_url && conversa.previa_url.startsWith('private/')) {
        try {
          const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
            file_uri: conversa.previa_url,
            expires_in: 3600
          });
          conversaAtualizada.previa_url = signed_url;
        } catch {
          conversaAtualizada.previa_url = null;
        }
      }

      return conversaAtualizada;
    }));

    return Response.json({
      success: true,
      conversas: conversasComURLs
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar conversas' }, { status: 500 });
  }
});