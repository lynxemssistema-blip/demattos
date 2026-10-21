import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as bcrypt from 'npm:bcrypt@5.1.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, senha } = await req.json();

    if (!email || !senha) {
      return Response.json({ error: 'Credenciais inválidas' }, { status: 400 });
    }

    const profissionais = await base44.asServiceRole.entities.Profissional.filter({
      email,
      ativo: true
    });

    if (profissionais.length === 0) {
      return Response.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const profissional = profissionais[0];

    // Verificar senha com bcrypt
    const senhaValida = await bcrypt.compare(senha, profissional.senha_acesso);

    if (!senhaValida) {
      return Response.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Retornar dados do profissional SEM senha
    const { senha_acesso, ...profissionalSeguro } = profissional;

    return Response.json({
      success: true,
      profissional: profissionalSeguro
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao processar login' }, { status: 500 });
  }
});