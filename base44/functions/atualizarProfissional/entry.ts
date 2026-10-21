import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.email !== 'luandemattos102030@gmail.com')) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { profissional_id, profissionalData, configAgenda, configId } = await req.json();

    if (!profissional_id) {
      return Response.json({ error: 'ID do profissional obrigatório' }, { status: 400 });
    }

    // Se foi enviada nova senha, fazer hash
    let dadosAtualizacao = { ...profissionalData };
    if (profissionalData.senha_acesso && profissionalData.senha_acesso.length > 0) {
      dadosAtualizacao.senha_acesso = bcrypt.hashSync(profissionalData.senha_acesso, 10);
    } else {
      delete dadosAtualizacao.senha_acesso;
    }

    // Atualizar profissional
    await base44.asServiceRole.entities.Profissional.update(profissional_id, dadosAtualizacao);

    // Preparar dados da configuração de agenda
    const configAgendaFinal = {
      profissional_id,
      dias_semana: Array.isArray(configAgenda?.dias_semana) ? configAgenda.dias_semana : [1, 2, 3, 4, 5, 6],
      horario_inicio: configAgenda?.horario_inicio || '09:00',
      horario_fim: configAgenda?.horario_fim || '18:00',
      horario_almoco_inicio: configAgenda?.horario_almoco_inicio || '',
      horario_almoco_fim: configAgenda?.horario_almoco_fim || '',
      intervalo_minutos: configAgenda?.intervalo_minutos || 30
    };

    // Atualizar ou criar configuração de agenda
    if (configId) {
      await base44.asServiceRole.entities.ConfigAgendaProfissional.update(configId, configAgendaFinal);
    } else {
      await base44.asServiceRole.entities.ConfigAgendaProfissional.create(configAgendaFinal);
    }

    return Response.json({ success: true, message: 'Profissional atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar profissional:', error);
    return Response.json({ error: 'Erro ao atualizar profissional: ' + error.message }, { status: 500 });
  }
});