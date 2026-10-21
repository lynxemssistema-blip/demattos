import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [todosProdutos, combos] = await Promise.all([
      base44.asServiceRole.entities.Produto.filter({ ativo: true }),
      base44.asServiceRole.entities.Combo.filter({ ativo: true })
    ]);

    // Apenas produtos digitais com exibir_no_catalogo = true
    const produtos = todosProdutos.filter(p => p.tipo === 'digital' && p.exibir_no_catalogo === true);

    // Retornar apenas dados públicos, SEM arquivo_pdf_url (sensível para produtos digitais)
    const produtosPublicos = produtos.map(p => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      tipo: p.tipo,
      preco: p.preco,
      estoque: p.estoque,
      imagem_url: p.imagem_url,
      arquivo_previa_url: p.arquivo_previa_url,
      creditos_ia: p.creditos_ia || 0,
      destaque_home: p.destaque_home,
      _item_kind: 'produto'
    }));

    const combosPublicos = combos.map(c => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      tipo: 'digital', // combos são sempre digitais
      preco: c.preco,
      estoque: null,
      imagem_url: c.imagem_url,
      arquivo_previa_url: null,
      creditos_ia: 0,
      destaque_home: true,
      produtos_ids: c.produtos_ids || [],
      _item_kind: 'combo'
    }));

    return Response.json({
      success: true,
      produtos: [...produtosPublicos, ...combosPublicos]
    });
  } catch (error) {
    return Response.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
});