import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { id } = await req.json();

    if (!id) {
      return Response.json({ success: false, error: 'ID não informado' }, { status: 400 });
    }

    // Tentar produto primeiro
    let produto = null;
    try {
      produto = await base44.asServiceRole.entities.Produto.get(id);
    } catch (e) {
      produto = null;
    }

    if (produto && produto.ativo) {
      return Response.json({
        success: true,
        produto: {
          id: produto.id,
          nome: produto.nome,
          descricao: produto.descricao,
          tipo: produto.tipo,
          preco: produto.preco,
          estoque: produto.estoque,
          imagem_url: produto.imagem_url,
          arquivo_previa_url: produto.arquivo_previa_url,
          arquivo_pdf_url: produto.arquivo_pdf_url,
          creditos_ia: produto.creditos_ia || 0,
          _item_kind: 'produto'
        }
      });
    }

    // Tentar combo
    let combo = null;
    try {
      combo = await base44.asServiceRole.entities.Combo.get(id);
    } catch (e) {
      combo = null;
    }

    if (combo && combo.ativo) {
      return Response.json({
        success: true,
        produto: {
          id: combo.id,
          nome: combo.nome,
          descricao: combo.descricao,
          tipo: 'digital',
          preco: combo.preco,
          estoque: null,
          imagem_url: combo.imagem_url,
          arquivo_previa_url: null,
          arquivo_pdf_url: null,
          creditos_ia: 0,
          produtos_ids: combo.produtos_ids || [],
          _item_kind: 'combo'
        }
      });
    }

    return Response.json({ success: false, error: 'Produto não encontrado' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});