import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const profissionais = await base44.asServiceRole.entities.Profissional.list('-created_date');

    // Remover senhas antes de retornar
    const profissionaisSemSenha = profissionais.map(p => {
      const { senha_acesso, ...semSenha } = p;
      return semSenha;
    });

    return Response.json({
      success: true,
      profissionais: profissionaisSemSenha
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar profissionais' }, { status: 500 });
  }
});