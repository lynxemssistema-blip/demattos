import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const profissionais = await base44.asServiceRole.entities.Profissional.filter({ ativo: true });

    // Retornar apenas dados públicos (SEM senha_acesso)
    const profissionaisPublicos = profissionais.map(p => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      foto_url: p.foto_url,
      historico_profissional: p.historico_profissional,
      servicos_ids: p.servicos_ids,
      destaque_home: p.destaque_home,
      ativo: p.ativo
    }));

    return Response.json({
      success: true,
      profissionais: profissionaisPublicos
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar profissionais' }, { status: 500 });
  }
});