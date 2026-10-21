import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as bcrypt from 'npm:bcrypt@5.1.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { profissionalData, configAgenda } = await req.json();

    if (!profissionalData.nome || !profissionalData.email || !profissionalData.senha_acesso) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(profissionalData.senha_acesso, 10);

    // Criar profissional com senha criptografada
    const profissional = await base44.asServiceRole.entities.Profissional.create({
      ...profissionalData,
      senha_acesso: senhaHash
    });

    // Criar configuração de agenda
    await base44.asServiceRole.entities.ConfigAgendaProfissional.create({
      profissional_id: profissional.id,
      ...configAgenda
    });

    // Gerar horários disponíveis do mês
    try {
      await base44.functions.invoke('gerarHorariosDisponiveisMes', {
        profissional_id: profissional.id
      });
    } catch (error) {
      // Continua mesmo se falhar
    }

    // Retornar sem senha
    const { senha_acesso, ...profissionalSemSenha } = profissional;

    return Response.json({
      success: true,
      profissional: profissionalSemSenha
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao criar profissional' }, { status: 500 });
  }
});