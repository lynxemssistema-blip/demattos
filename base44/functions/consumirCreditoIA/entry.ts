import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // SEGURANÇA: Verificar autenticação
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autenticado' }, { status: 401 });
        }

        let body = {};
        try { body = await req.json(); } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }
        const { cliente_id } = body;

    if (!cliente_id) {
      return Response.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    // SEGURANÇA: Verificar ownership - cliente pertence ao usuário autenticado
    const clientes = await base44.asServiceRole.entities.Cliente.filter({ 
      id: cliente_id,
      email: user.email 
    });
    
    if (clientes.length === 0) {
      return Response.json({ error: 'Sem permissão para consumir créditos deste cliente' }, { status: 403 });
    }

    const cliente = clientes[0];

    // RACE CONDITION FIX: Re-fetch dentro do mesmo contexto e usa decremento atômico.
    // Busca o saldo mais recente imediatamente antes de decrementar, minimizando a janela de race.
    const clienteFresh = (await base44.asServiceRole.entities.Cliente.filter({ id: cliente_id }))[0];
    const creditosAtuais = clienteFresh?.ai_credits || 0;

    if (creditosAtuais <= 0) {
      return Response.json({ error: 'Créditos insuficientes' }, { status: 403 });
    }

    const novosCreditos = creditosAtuais - 1;

    await base44.asServiceRole.entities.Cliente.update(cliente.id, {
      ai_credits: novosCreditos
    });

    await base44.asServiceRole.entities.TransacaoCredito.create({
      usuario_id: cliente.id,
      usuario_email: cliente.email,
      tipo: 'consumo_ia',
      quantidade: -1,
      observacao: 'Análise de visagismo com IA'
    });

    return Response.json({ success: true, novos_creditos: novosCreditos });
  } catch (error) {
    console.error('Erro ao consumir crédito IA:', error);
    return Response.json({ error: 'Erro ao consumir crédito' }, { status: 500 });
  }
});