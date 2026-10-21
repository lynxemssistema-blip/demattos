import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, RefreshCw, Package, CheckSquare, Square, ArrowLeft, Upload, Loader2, Link2, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AIProductDescriptionAssistant from '@/components/admin/AIProductDescriptionAssistant';

export default function AdminCombos() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [comboEditando, setComboEditando] = useState(null);
  const [sincronizando, setSincronizando] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [gerandoDescricao, setGerandoDescricao] = useState(false);

  const copiarLink = (comboId) => {
    const link = `${window.location.origin}/ComboLanding?id=${comboId}`;
    navigator.clipboard.writeText(link);
    setCopiadoId(comboId);
    toast.success('Link copiado! Cole no Instagram.');
    setTimeout(() => setCopiadoId(null), 2000);
  };
  const [uploadando, setUploadando] = useState(false);
  const [estilizarImagem, setEstilizarImagem] = useState(false);
  const [form, setForm] = useState({
    nome: '', descricao: '', preco: '', produtos_ids: [], imagem_url: '', instagram_url: '', ativo: true
  });
  const [descontoPercent, setDescontoPercent] = useState('');

  const { data: combos = [] } = useQuery({
    queryKey: ['combos'],
    queryFn: () => base44.entities.Combo.list('-created_date', 100)
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-digitais'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true, tipo: 'digital' })
  });

  const salvarMutation = useMutation({
    mutationFn: async (dados) => {
      if (comboEditando) return base44.entities.Combo.update(comboEditando.id, dados);
      return base44.entities.Combo.create(dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      setModalAberto(false);
      setComboEditando(null);
      toast.success(comboEditando ? 'Combo atualizado!' : 'Combo criado!');
    }
  });

  const excluirMutation = useMutation({
    mutationFn: (id) => base44.entities.Combo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      toast.success('Combo excluído!');
    }
  });

  const abrirModal = (combo = null) => {
    setDescontoPercent('');
    if (combo) {
      setComboEditando(combo);
      setForm({
        nome: combo.nome,
        descricao: combo.descricao || '',
        preco: combo.preco,
        produtos_ids: combo.produtos_ids || [],
        imagem_url: combo.imagem_url || '',
        instagram_url: combo.instagram_url || '',
        ativo: combo.ativo !== false
      });
    } else {
      setComboEditando(null);
      setForm({ nome: '', descricao: '', preco: '', produtos_ids: [], imagem_url: '', instagram_url: '', ativo: true });
    }
    setModalAberto(true);
  };

  const somaFormProdutos = form.produtos_ids.reduce((sum, id) => {
    const p = produtos.find(x => x.id === id);
    return sum + (p?.preco || 0);
  }, 0);

  const toggleProduto = (produtoId) => {
    setForm(prev => {
      const novosIds = prev.produtos_ids.includes(produtoId)
        ? prev.produtos_ids.filter(id => id !== produtoId)
        : [...prev.produtos_ids, produtoId];
      // Recalcular preço com base no desconto atual
      const novasSoma = novosIds.reduce((sum, id) => {
        const p = produtos.find(x => x.id === id);
        return sum + (p?.preco || 0);
      }, 0);
      const desc = parseFloat(descontoPercent) || 0;
      const novoPreco = desc > 0 ? (novasSoma * (1 - desc / 100)).toFixed(2) : (novasSoma > 0 ? novasSoma.toFixed(2) : prev.preco);
      return { ...prev, produtos_ids: novosIds, preco: novasSoma > 0 ? novoPreco : prev.preco };
    });
  };

  const aplicarDesconto = (percentStr) => {
    setDescontoPercent(percentStr);
    const percent = parseFloat(percentStr) || 0;
    if (somaFormProdutos > 0) {
      const novoPreco = somaFormProdutos * (1 - percent / 100);
      setForm(prev => ({ ...prev, preco: novoPreco.toFixed(2) }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (estilizarImagem) {
        const { url } = await base44.integrations.Core.GenerateImage({
          prompt: `Professional product bundle photography for barbershop. ${form.nome || 'Combo'}. Dark background, luxurious lighting, premium styling, gold accents, masculine aesthetic. High-end commercial photography style.`,
          existing_image_urls: [file_url]
        });
        setForm(prev => ({ ...prev, imagem_url: url }));
      } else {
        const { url } = await base44.integrations.Core.GenerateImage({
          prompt: `Adjust this image to fit product display: resize to square format, add dark black background if needed, maintain original content exactly as is, no style changes, just frame adjustment.`,
          existing_image_urls: [file_url]
        });
        setForm(prev => ({ ...prev, imagem_url: url }));
      }
    } catch {
      toast.error('Erro ao processar imagem');
    } finally {
      setUploadando(false);
    }
  };

  // Monta nome e descrição do combo para o assistente de marketing
  const nomeComboParaIA = () => {
    const produtosSelecionados = form.produtos_ids
      .map(id => produtos.find(p => p.id === id))
      .filter(Boolean);
    const nomes = produtosSelecionados.map(p => p.nome).join(' + ');
    return form.nome ? `${form.nome} (${nomes})` : nomes;
  };

  const contextoComboParaIA = () => {
    const produtosSelecionados = form.produtos_ids
      .map(id => produtos.find(p => p.id === id))
      .filter(Boolean);
    return produtosSelecionados
      .map(p => `${p.nome}${p.descricao ? ': ' + p.descricao : ''}`)
      .join('\n');
  };

  const salvar = () => {
    if (!form.nome || !form.preco || form.produtos_ids.length === 0) {
      toast.error('Preencha nome, preço e selecione ao menos um produto');
      return;
    }
    salvarMutation.mutate({ ...form, preco: parseFloat(form.preco) });
  };

  const sincronizarStripe = async (combo) => {
    setSincronizando(combo.id);
    try {
      const response = await base44.functions.invoke('syncComboWithStripe', { combo_id: combo.id });
      if (response.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['combos'] });
        toast.success('Sincronizado com Stripe!');
      } else {
        toast.error('Erro ao sincronizar: ' + (response.data?.error || 'Desconhecido'));
      }
    } catch {
      toast.error('Erro ao sincronizar com Stripe');
    } finally {
      setSincronizando(null);
    }
  };

  const getProdutosDoCombo = (combo) =>
    (combo.produtos_ids || []).map(id => produtos.find(p => p.id === id)).filter(Boolean);

  const somaOriginal = (combo) =>
    getProdutosDoCombo(combo).reduce((sum, p) => sum + (p.preco || 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8 flex-wrap">
          <Link to={createPageUrl('Admin')}>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Combos de Produtos</h1>
            <p className="text-gray-500 text-sm">Crie combos com múltiplos PDFs a um preço especial</p>
          </div>
          <Button onClick={() => abrirModal()} className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-bold gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Combo</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Lista */}
        <div className="grid gap-4">
          {combos.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum combo criado ainda</p>
            </div>
          )}
          {combos.map(combo => {
            const produtosDoCombo = getProdutosDoCombo(combo);
            const soma = somaOriginal(combo);
            const desconto = soma > 0 ? Math.round((1 - combo.preco / soma) * 100) : 0;
            return (
              <Card key={combo.id} className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                      {combo.imagem_url && (
                        <img src={combo.imagem_url} alt={combo.nome} className="w-16 h-16 rounded-lg object-contain bg-[#0a0a0a] border border-[#2a2a2a] shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-white font-bold text-lg">{combo.nome}</h3>
                          {combo.ativo
                            ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>
                            : <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Inativo</Badge>}
                          {combo.stripe_price_id && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">✓ Stripe</Badge>}
                          {desconto > 0 && <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30">{desconto}% OFF</Badge>}
                        </div>
                        {combo.descricao && <p className="text-gray-400 text-sm mb-3">{combo.descricao}</p>}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl font-bold text-[#D4AF37]">R$ {combo.preco?.toFixed(2)}</span>
                          {soma > combo.preco && <span className="text-gray-500 line-through text-sm">R$ {soma.toFixed(2)}</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {produtosDoCombo.map(p => (
                            <Badge key={p.id} className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs">📄 {p.nome}</Badge>
                          ))}
                        </div>
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copiarLink(combo.id)}
                            className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 gap-1.5"
                          >
                            {copiadoId === combo.id ? (
                              <><Check className="w-3.5 h-3.5" /> Link Copiado!</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> Copiar Link de Venda</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col flex-row gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => sincronizarStripe(combo)} disabled={sincronizando === combo.id} className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-1">
                        <RefreshCw className={`w-4 h-4 ${sincronizando === combo.id ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Stripe</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => abrirModal(combo)} className="border-[#2a2a2a] text-gray-400 hover:text-white gap-1">
                        <Pencil className="w-4 h-4" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => excluirMutation.mutate(combo.id)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1">
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37]">
              {comboEditando ? 'Editar Combo' : 'Novo Combo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">

            {/* Nome */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nome do combo *</label>
              <Input
                placeholder="Ex: Pacote Completo de Cortes"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                className="bg-[#0a0a0a] border-[#3a3a3a] text-white"
              />
            </div>

            {/* Produtos */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Produtos incluídos * ({form.produtos_ids.length} selecionados)
              </label>
              {produtos.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum produto digital ativo encontrado</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {produtos.map(produto => {
                    const selecionado = form.produtos_ids.includes(produto.id);
                    return (
                      <div
                        key={produto.id}
                        onClick={() => toggleProduto(produto.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selecionado ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {selecionado
                          ? <CheckSquare className="w-5 h-5 text-[#D4AF37] shrink-0" />
                          : <Square className="w-5 h-5 text-gray-500 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{produto.nome}</p>
                          <p className="text-gray-400 text-xs">R$ {produto.preco?.toFixed(2)}</p>
                        </div>
                        {produto.arquivo_pdf_url && (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs shrink-0">PDF ✓</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Descrição com Assistente de Marketing */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-400">Descrição</label>
                {form.produtos_ids.length > 0 && (
                  <AIProductDescriptionAssistant
                    productName={nomeComboParaIA()}
                    currentDescription={form.descricao}
                    pdfUrl={null}
                    comboContext={contextoComboParaIA()}
                    onUseDescription={(desc) => setForm(prev => ({ ...prev, descricao: desc }))}
                  />
                )}
              </div>
              <Textarea
                placeholder="Descreva o que está incluso no combo ou use o assistente de marketing..."
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                className="bg-[#0a0a0a] border-[#3a3a3a] text-white"
                rows={3}
              />
              {form.produtos_ids.length === 0 && (
                <p className="text-gray-600 text-xs mt-1">Selecione produtos acima para habilitar o assistente de marketing</p>
              )}
            </div>

            {/* Preço com sugestão e desconto */}
            {form.produtos_ids.length > 0 && (
              <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Soma dos produtos:</span>
                  <span className="text-gray-300 font-medium">R$ {somaFormProdutos.toFixed(2)}</span>
                </div>

                {/* Desconto */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Desconto (%)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      placeholder="Ex: 20"
                      value={descontoPercent}
                      onChange={e => aplicarDesconto(e.target.value)}
                      className="bg-[#1a1a1a] border-[#3a3a3a] text-white w-28"
                    />
                    <div className="flex gap-1">
                      {[10, 15, 20, 30].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => aplicarDesconto(String(d))}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                            descontoPercent === String(d)
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                              : 'border-[#3a3a3a] text-gray-400 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
                          }`}
                        >
                          {d}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#2a2a2a] pt-3">
                  <label className="text-xs text-gray-500 mb-1.5 block">Preço final do combo (R$) *</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.preco}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, preco: val }));
                      if (somaFormProdutos > 0 && parseFloat(val) > 0) {
                        const d = ((1 - parseFloat(val) / somaFormProdutos) * 100).toFixed(0);
                        setDescontoPercent(d > 0 ? d : '');
                      }
                    }}
                    className="bg-[#1a1a1a] border-[#D4AF37]/50 text-white text-lg font-bold"
                  />
                  {parseFloat(form.preco) > 0 && somaFormProdutos > 0 && parseFloat(form.preco) < somaFormProdutos && (
                    <p className="text-green-400 text-xs mt-1">
                      ✓ {((1 - parseFloat(form.preco) / somaFormProdutos) * 100).toFixed(0)}% de desconto em relação ao valor individual
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Preço manual (quando nenhum produto selecionado) */}
            {form.produtos_ids.length === 0 && (
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Preço do combo (R$) *</label>
                <Input
                  type="number"
                  placeholder="Selecione produtos para sugestão automática"
                  value={form.preco}
                  onChange={e => setForm({ ...form, preco: e.target.value })}
                  className="bg-[#0a0a0a] border-[#3a3a3a] text-white"
                />
              </div>
            )}

            {/* Imagem */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Imagem do combo</label>
              <div className="space-y-3">
                {/* Toggle estilizar */}
                <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                  <div>
                    <span className="text-sm text-gray-300">Estilizar imagem com IA</span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {estilizarImagem ? 'Estiliza no padrão premium do site' : 'Apenas ajusta tamanho e fundo'}
                    </p>
                  </div>
                  <Switch checked={estilizarImagem} onCheckedChange={setEstilizarImagem} />
                </div>

                {/* Upload de arquivo */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Enviar arquivo
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadando}
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-gray-400"
                  />
                  {uploadando && (
                    <div className="flex items-center gap-2 text-[#D4AF37] text-sm mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {estilizarImagem ? 'Estilizando imagem...' : 'Ajustando imagem...'}
                    </div>
                  )}
                </div>

                {/* Divisor OU */}
                <div className="relative flex items-center">
                  <div className="flex-1 border-t border-[#2a2a2a]" />
                  <span className="px-2 text-gray-600 text-xs">OU</span>
                  <div className="flex-1 border-t border-[#2a2a2a]" />
                </div>

                {/* URL manual */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Colar link da imagem
                  </label>
                  <Input
                    placeholder="https://..."
                    value={form.imagem_url}
                    onChange={e => setForm({ ...form, imagem_url: e.target.value })}
                    className="bg-[#0a0a0a] border-[#3a3a3a] text-white"
                  />
                </div>

                {/* Preview */}
                {form.imagem_url && (
                  <div className="relative w-full h-40 bg-[#0a0a0a] rounded-lg overflow-hidden border border-[#2a2a2a]">
                    <img src={form.imagem_url} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            {/* Instagram */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Link do Instagram (opcional)
              </label>
              <Input
                placeholder="https://www.instagram.com/reel/..."
                value={form.instagram_url}
                onChange={e => setForm({ ...form, instagram_url: e.target.value })}
                className="bg-[#0a0a0a] border-[#3a3a3a] text-white"
              />
            </div>

            {/* Ativo */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">Combo ativo</label>
              <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={salvar}
                disabled={salvarMutation.isPending}
                className="flex-1 bg-[#D4AF37] hover:bg-[#B8973D] text-black font-bold"
              >
                {salvarMutation.isPending ? 'Salvando...' : (comboEditando ? 'Salvar alterações' : 'Criar combo')}
              </Button>
              <Button variant="outline" onClick={() => setModalAberto(false)} className="border-[#2a2a2a] text-gray-400">
                Cancelar
              </Button>
            </div>

            {comboEditando && (
              <p className="text-gray-500 text-xs text-center">
                💡 Após salvar, clique em "Stripe" no card para sincronizar o preço atualizado
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}