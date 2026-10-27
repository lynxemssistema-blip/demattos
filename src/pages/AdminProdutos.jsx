import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Package, DollarSign, Edit, Trash2, TrendingUp, Loader2, FileText, Download, Eye, Award, RefreshCw, Copy, Check } from 'lucide-react';
import AIProductDescriptionAssistant from '@/components/admin/AIProductDescriptionAssistant';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

function AdminProdutosContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiadoId, setCopiadoId] = useState(null);

  const copiarLink = (produtoId) => {
    const frontendUrl = window.location.origin;
    const link = `${frontendUrl}/ProdutoLanding?id=${produtoId}`;
    navigator.clipboard.writeText(link);
    setCopiadoId(produtoId);
    toast.success('Link copiado! Cole no Instagram.');
    setTimeout(() => setCopiadoId(null), 2000);
  };
  const [editingProduto, setEditingProduto] = useState(null);
  const [uploadando, setUploadando] = useState(false);
  const [uploadandoPdf, setUploadandoPdf] = useState(false);
  const [uploadandoPrevia, setUploadandoPrevia] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [estilizarImagem, setEstilizarImagem] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'fisico',
    preco: '',
    estoque: '',
    imagem_url: '',
    arquivo_pdf_url: '',
    arquivo_previa_url: '',
    creditos_ia: '',
    destaque_home: false,
    exibir_no_catalogo: false,
    ativo: true,
  });

  const queryClient = useQueryClient();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminProdutos', {});
      return response.data.success ? response.data.produtos : [];
    },
  });

  const { data: compras = [] } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const produto = await base44.entities.Produto.create(data);
      // Sincronizar com Stripe
      await base44.functions.invoke('syncProductWithStripe', {
        productId: produto.id,
        action: 'create'
      });
      return produto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Produto criado e sincronizado com Stripe!');
    },
    onError: (error) => {
      toast.error('Erro ao criar produto: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Produto.update(id, data);
      // Sincronizar com Stripe
      await base44.functions.invoke('syncProductWithStripe', {
        productId: id,
        action: 'update'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Produto atualizado e sincronizado com Stripe!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar produto: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Desativar no Stripe antes de excluir
      await base44.functions.invoke('syncProductWithStripe', {
        productId: id,
        action: 'delete'
      });
      await base44.entities.Produto.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto excluído e arquivado no Stripe!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir produto: ' + error.message);
    }
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }) => {
      await base44.entities.Produto.update(id, { ativo });
      // Sincronizar com Stripe
      await base44.functions.invoke('syncProductWithStripe', {
        productId: id,
        action: ativo ? 'activate' : 'deactivate'
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success(variables.ativo ? 'Produto ativado no Stripe!' : 'Produto desativado no Stripe!');
    },
    onError: (error) => {
      toast.error('Erro ao alterar status: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'fisico',
      preco: '',
      estoque: '',
      imagem_url: '',
      arquivo_pdf_url: '',
      arquivo_previa_url: '',
      creditos_ia: '',
      destaque_home: false,
      exibir_no_catalogo: false,
      ativo: true,
    });
    setEditingProduto(null);
    setEstilizarImagem(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (estilizarImagem) {
        // Estilização completa com IA
        const { url } = await base44.integrations.Core.GenerateImage({
          prompt: `Professional product photography for barbershop/men's grooming product. ${formData.nome || 'Product'}. Dark background, luxurious lighting, premium styling, gold accents, masculine aesthetic. High-end commercial photography style.`,
          existing_image_urls: [file_url]
        });
        setFormData({ ...formData, imagem_url: url });
      } else {
        // Apenas ajustar tamanho e fundo, mantendo conteúdo original
        const { url } = await base44.integrations.Core.GenerateImage({
          prompt: `Adjust this image to fit product display: resize to square format, add dark black background if needed, maintain original product exactly as is, no style changes, no modifications to the product itself, just frame adjustment.`,
          existing_image_urls: [file_url]
        });
        setFormData({ ...formData, imagem_url: url });
      }
    } catch (error) {
      toast.error('Erro ao processar imagem');
    } finally {
      setUploadando(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadandoPdf(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, arquivo_pdf_url: file_url });
    } catch (error) {
      toast.error('Erro ao fazer upload do PDF');
    } finally {
      setUploadandoPdf(false);
    }
  };

  const handlePreviaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadandoPrevia(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, arquivo_previa_url: file_url });
    } catch (error) {
      toast.error('Erro ao fazer upload da prévia');
    } finally {
      setUploadandoPrevia(false);
    }
  };



  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      preco: parseFloat(formData.preco),
      estoque: formData.tipo === 'fisico' ? parseInt(formData.estoque) : 0,
      creditos_ia: parseInt(formData.creditos_ia) || 0,
    };
    
    if (formData.tipo === 'digital' && !formData.arquivo_pdf_url) {
      toast.error('Produtos digitais precisam ter um arquivo PDF');
      return;
    }
    
    if (editingProduto) {
      updateMutation.mutate({ id: editingProduto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (produto) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || '',
      tipo: produto.tipo || 'fisico',
      preco: produto.preco.toString(),
      estoque: produto.estoque ? produto.estoque.toString() : '0',
      imagem_url: produto.imagem_url || '',
      arquivo_pdf_url: produto.arquivo_pdf_url || '',
      arquivo_previa_url: produto.arquivo_previa_url || '',
      creditos_ia: produto.creditos_ia ? produto.creditos_ia.toString() : '0',
      destaque_home: produto.destaque_home || false,
      exibir_no_catalogo: produto.exibir_no_catalogo || false,
      ativo: produto.ativo,
    });
    setDialogOpen(true);
  };

  const sincronizarTodosProdutos = async () => {
    setSincronizando(true);
    try {
      const result = await base44.functions.invoke('syncAllProductsWithStripe', {});
      toast.success(`${result.data.synced} de ${result.data.total} produtos sincronizados com Stripe!`);
      if (result.data.errors.length > 0) {
        console.error('Erros na sincronização:', result.data.errors);
        toast.warning(`${result.data.errors.length} produto(s) com erro. Verifique o console.`);
      }
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    } catch (error) {
      toast.error('Erro ao sincronizar produtos: ' + error.message);
    } finally {
      setSincronizando(false);
    }
  };

  const getProdutoStats = useCallback((produto) => {
    const produtoCompras = compras.filter(c => c.produto_id === produto.id);
    const total = produtoCompras.length;
    const confirmadas = produtoCompras.filter(c => c.status_pagamento === 'confirmado').length;
    const pendentes = produtoCompras.filter(c => c.status_pagamento === 'pendente').length;
    
    let rank = 'Novo';
    if (confirmadas >= 20) rank = 'Best Seller';
    else if (confirmadas >= 10) rank = 'Popular';
    else if (confirmadas >= 5) rank = 'Vendido';
    else if (confirmadas >= 1) rank = 'Iniciante';
    
    const rankColor = {
      'Best Seller': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'Popular': 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
      'Vendido': 'bg-green-500/10 text-green-400 border-green-500/30',
      'Iniciante': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'Novo': 'bg-gray-400/10 text-gray-400 border-gray-400/30',
    };
    
    return { total, confirmadas, pendentes, rank, rankColor: rankColor[rank] };
  }, [compras]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Produtos</h1>
                <p className="text-gray-400 text-sm">Gerencie o estoque de produtos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button
                onClick={sincronizarTodosProdutos}
                disabled={sincronizando}
                variant="outline"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 text-sm"
              >
                {sincronizando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Sincronizando...</span>
                    <span className="sm:hidden">Sync...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sincronizar com Stripe</span>
                  </>
                )}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduto ? 'Editar Produto' : 'Novo Produto'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Imagem do Produto</label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                        <span className="text-sm text-gray-300">Estilizar imagem automaticamente</span>
                        <Switch
                          checked={estilizarImagem}
                          onCheckedChange={setEstilizarImagem}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {estilizarImagem 
                          ? 'A imagem será completamente estilizada para o padrão premium do site'
                          : 'Apenas ajusta tamanho e fundo, mantendo o conteúdo original'}
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadando}
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                      {uploadando && (
                        <div className="flex items-center gap-2 text-[#D4AF37] text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {estilizarImagem ? 'Estilizando imagem...' : 'Ajustando imagem...'}
                        </div>
                      )}
                      {formData.imagem_url && (
                        <div className="relative w-full h-48 bg-[#0a0a0a] rounded-lg overflow-hidden">
                          <img 
                            src={formData.imagem_url} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nome do Produto *</label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Descrição</label>
                      <AIProductDescriptionAssistant
                        productName={formData.nome}
                        currentDescription={formData.descricao}
                        pdfUrl={formData.arquivo_pdf_url || null}
                        onUseDescription={(desc) => setFormData({ ...formData, descricao: desc })}
                      />
                    </div>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={4}
                      className="bg-[#0a0a0a] border-[#2a2a2a] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tipo de Produto *</label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                        <SelectItem value="fisico">Físico (Estoque)</SelectItem>
                        <SelectItem value="digital">Digital (PDF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.tipo === 'digital' && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Arquivo PDF Completo *</label>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={handlePdfUpload}
                            disabled={uploadandoPdf}
                            className="bg-[#0a0a0a] border-[#2a2a2a]"
                          />
                          {uploadandoPdf && (
                            <div className="flex items-center gap-2 text-[#D4AF37] text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enviando PDF...
                            </div>
                          )}
                          {formData.arquivo_pdf_url && (
                            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-green-500 text-sm">
                                <FileText className="w-4 h-4" />
                                PDF completo carregado
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(formData.arquivo_pdf_url, '_blank')}
                                className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Visualizar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Arquivo/Link de Prévia (opcional)</label>
                        <p className="text-xs text-gray-500 mb-2">Prévia gratuita para todos os usuários visualizarem</p>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={handlePreviaUpload}
                            disabled={uploadandoPrevia}
                            className="bg-[#0a0a0a] border-[#2a2a2a]"
                          />
                          {uploadandoPrevia && (
                            <div className="flex items-center gap-2 text-[#D4AF37] text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enviando prévia...
                            </div>
                          )}
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-[#2a2a2a]" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                              <span className="bg-[#1a1a1a] px-2 text-gray-500">OU</span>
                            </div>
                          </div>
                          <Input
                            type="url"
                            value={formData.arquivo_previa_url}
                            onChange={(e) => setFormData({ ...formData, arquivo_previa_url: e.target.value })}
                            placeholder="https://exemplo.com/previa"
                            className="bg-[#0a0a0a] border-[#2a2a2a]"
                          />
                          {formData.arquivo_previa_url && (
                            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-blue-500 text-sm">
                                <FileText className="w-4 h-4" />
                                Prévia disponível
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(formData.arquivo_previa_url, '_blank')}
                                className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Visualizar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Preço (R$) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.preco}
                        onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                        required
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Estoque {formData.tipo === 'fisico' ? '*' : '(não aplicável)'}
                      </label>
                      <Input
                        type="number"
                        value={formData.estoque}
                        onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                        required={formData.tipo === 'fisico'}
                        disabled={formData.tipo === 'digital'}
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#D4AF37]" />
                      Créditos IA (para AgentIA)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Quantos créditos o cliente receberá ao comprar este produto
                    </p>
                    <Input
                      type="number"
                      value={formData.creditos_ia}
                      onChange={(e) => setFormData({ ...formData, creditos_ia: e.target.value })}
                      min="0"
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Destaque na Home</label>
                    <Switch
                      checked={formData.destaque_home}
                      onCheckedChange={(checked) => setFormData({ ...formData, destaque_home: checked })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 -mt-2">Máximo 6 produtos em destaque na página inicial</p>
                  {formData.tipo === 'digital' && (
                    <>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Exibir no Catálogo</label>
                        <Switch
                          checked={formData.exibir_no_catalogo}
                          onCheckedChange={(checked) => setFormData({ ...formData, exibir_no_catalogo: checked })}
                        />
                      </div>
                      <p className="text-xs text-gray-500 -mt-2">Quando ativo, aparece na página de catálogo público</p>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Produto Ativo</label>
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold">
                      {editingProduto ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <div className="text-white text-center py-12">Carregando...</div>
        ) : produtos.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="py-12 text-center text-gray-400">
              Nenhum produto cadastrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos.map((produto) => {
              const stats = getProdutoStats(produto);
              
              return (
              <Card key={produto.id} className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="p-6">
                  <div className="flex gap-4 mb-4">
                    {/* Imagem do Produto */}
                    <div className="flex-shrink-0">
                      {produto.imagem_url ? (
                        <img 
                          src={produto.imagem_url} 
                          alt={produto.nome}
                          className="w-20 h-28 rounded-lg object-cover border-2 border-[#D4AF37]/30"
                        />
                      ) : (
                        <div className="w-20 h-28 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center border-2 border-[#D4AF37]/30">
                          {produto.tipo === 'digital' ? (
                            <FileText className="w-10 h-10 text-[#D4AF37]" />
                          ) : (
                            <Package className="w-10 h-10 text-[#D4AF37]" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-white font-semibold text-sm">{produto.nome}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${stats.rankColor} border text-xs`}>
                              <Award className="w-3 h-3 mr-1" />
                              {stats.rank}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#D4AF37]">
                              {produto.tipo === 'digital' ? 'Digital' : 'Físico'}
                            </span>
                            {produto.stripe_product_id && (
                              <span className="text-xs text-green-400">• Stripe ✓</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(produto)}
                            className="text-gray-400 hover:text-white h-8 w-8"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('Deseja realmente excluir este produto?')) {
                                deleteMutation.mutate(produto.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-600 h-8 w-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Estatísticas de Vendas */}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="bg-[#0a0a0a] p-1.5 rounded text-center">
                          <div className="text-white font-semibold text-sm">{stats.total}</div>
                          <div className="text-gray-500 text-xs">Total</div>
                        </div>
                        <div className="bg-[#0a0a0a] p-1.5 rounded text-center">
                          <div className="text-green-400 font-semibold text-sm">{stats.confirmadas}</div>
                          <div className="text-gray-500 text-xs">Vendas</div>
                        </div>
                        <div className="bg-[#0a0a0a] p-1.5 rounded text-center">
                          <div className="text-yellow-400 font-semibold text-sm">{stats.pendentes}</div>
                          <div className="text-gray-500 text-xs">Pend.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {produto.descricao && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{produto.descricao}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
                    <div className="flex items-center gap-2 text-[#D4AF37]">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">R$ {produto.preco.toFixed(2)}</span>
                    </div>
                    {produto.tipo === 'fisico' && (
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>Estoque: {produto.estoque}</span>
                      </div>
                    )}
                    {produto.tipo === 'digital' && (
                      <div className="flex items-center gap-2">
                        {produto.arquivo_pdf_url && (
                          <a
                            href={produto.arquivo_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs font-semibold px-2 py-1 bg-green-500/10 border border-green-500/20 rounded hover:bg-green-500/20 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF Completo</span>
                          </a>
                        )}
                        {produto.arquivo_previa_url && (
                          <a
                            href={produto.arquivo_previa_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#D4AF37] hover:text-[#f3e5ab] text-xs font-semibold px-2 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded hover:bg-[#D4AF37]/20 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Prévia</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {produto.tipo === 'fisico' && produto.estoque === 0 && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded p-2 text-center">
                      <span className="text-red-400 text-xs font-medium">SEM ESTOQUE</span>
                    </div>
                  )}

                  {produto.creditos_ia > 0 && (
                    <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded p-2 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-purple-300 text-xs font-medium">
                        +{produto.creditos_ia} créditos IA
                      </span>
                    </div>
                  )}

                  {/* Link Instagram */}
                  <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copiarLink(produto.id)}
                      className="w-full border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 gap-2"
                    >
                      {copiadoId === produto.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Link Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar Link Instagram
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Toggle Ativo/Inativo */}
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
                    <span className="text-gray-400 text-sm">
                      {produto.ativo ? 'Produto Ativo' : 'Produto Inativo'}
                    </span>
                    <Switch
                      checked={produto.ativo}
                      onCheckedChange={(checked) => {
                        toggleAtivoMutation.mutate({ id: produto.id, ativo: checked });
                      }}
                      disabled={toggleAtivoMutation.isLoading}
                    />
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminProdutos() {
  return (
    <AdminRoute>
      <AdminProdutosContent />
    </AdminRoute>
  );
}