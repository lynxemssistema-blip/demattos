import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // SEGURANÇA: Usar o usuário autenticado, não o email do frontend
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const { carrinho } = await req.json();

    // Remover itens existentes + buscar dados dos itens em paralelo
    const itensValidos = carrinho.filter(item => item.id && item.tipo && item.nome);

    const [itensExistentes, ...dadosItens] = await Promise.all([
      base44.asServiceRole.entities.ItemCarrinho.filter({ cliente_email: user.email }),
      ...itensValidos.map(item =>
        item.tipo === 'produto'
          ? base44.asServiceRole.entities.Produto.filter({ id: item.id, ativo: true })
          : base44.asServiceRole.entities.Servico.filter({ id: item.id, ativo: true })
      )
    ]);

    // Deletar itens existentes em paralelo
    await Promise.all(itensExistentes.map(i => base44.asServiceRole.entities.ItemCarrinho.delete(i.id)));

    // Criar novos itens em paralelo (com preços validados do servidor)
    const criacoes = [];
    for (let i = 0; i < itensValidos.length; i++) {
      const item = itensValidos[i];
      const resultado = dadosItens[i];
      if (!resultado || resultado.length === 0) continue;

      const entidade = resultado[0];
      const precoReal = entidade.preco;
      const produtoTipo = item.tipo === 'produto' ? entidade.tipo : null;
      const arquivoPdfUrl = item.tipo === 'produto' ? (entidade.arquivo_pdf_url || null) : null;

      criacoes.push(base44.asServiceRole.entities.ItemCarrinho.create({
        cliente_email: user.email,
        item_tipo: item.tipo,
        item_id: item.id,
        item_nome: item.nome,
        item_preco: precoReal,
        quantidade: Math.min(Math.max(1, item.quantidade || 1), 99),
        produto_tipo: produtoTipo,
        produto_arquivo_pdf_url: arquivoPdfUrl
      }));
    }
    await Promise.all(criacoes);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Erro ao sincronizar carrinho' }, { status: 500 });
  }
});