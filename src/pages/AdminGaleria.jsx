import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Image as ImageIcon, Trash2, Edit, Save, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

function AdminGaleriaContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingImagem, setEditingImagem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingSobre, setUploadingSobre] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    alt: '',
    colSpan: 'col-span-1',
    rowSpan: 'row-span-1',
    ordem: 0,
  });

  const [secaoSobre, setSecaoSobre] = useState(null);

  const queryClient = useQueryClient();

  const { data: galeriaData, isLoading } = useQuery({
    queryKey: ['admin-galeria-data'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminGaleria', {});
      return response.data.success ? response.data : null;
    },
  });

  const imagens = galeriaData?.imagens || [];
  const dadosSobre = galeriaData?.secaoSobre || null;
  const agendamentosRealizados = galeriaData?.agendamentosRealizados || [];

  React.useEffect(() => {
    if (dadosSobre) {
      setSecaoSobre(dadosSobre);
    }
  }, [dadosSobre]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ImagemGaleria.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imagens-galeria'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImagemGaleria.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imagens-galeria'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ImagemGaleria.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imagens-galeria'] });
    },
  });

  const saveSobreMutation = useMutation({
    mutationFn: async (data) => {
      if (dadosSobre) {
        return base44.entities.SecaoSobre.update(dadosSobre.id, data);
      } else {
        return base44.entities.SecaoSobre.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secao-sobre'] });
      toast.success('Seção Sobre salva com sucesso!');
    },
  });

  const resetForm = () => {
    setFormData({
      url: '',
      alt: '',
      colSpan: 'col-span-1',
      rowSpan: 'row-span-1',
      ordem: 0,
    });
    setEditingImagem(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, url: file_url });
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingImagem) {
      updateMutation.mutate({ id: editingImagem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (imagem) => {
    setEditingImagem(imagem);
    setFormData({
      url: imagem.url,
      alt: imagem.alt,
      colSpan: imagem.colSpan,
      rowSpan: imagem.rowSpan,
      ordem: imagem.ordem,
    });
    setDialogOpen(true);
  };

  const handleSobreImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSobre(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSecaoSobre({ ...secaoSobre, imagem_url: file_url });
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingSobre(false);
    }
  };

  const handleSaveSobre = () => {
    if (!secaoSobre) return;
    saveSobreMutation.mutate(secaoSobre);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Galeria e Seção Sobre</h1>
                <p className="text-gray-400 text-sm">Gerencie as imagens e conteúdo da página</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Imagem
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <DialogHeader>
                  <DialogTitle>
                    {editingImagem ? 'Editar Imagem' : 'Nova Imagem'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Imagem *</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                    {uploading && <p className="text-xs text-gray-400 mt-1">Enviando...</p>}
                    {formData.url && (
                      <div className="mt-3">
                        <img src={formData.url} alt="Preview" className="w-full h-40 object-cover rounded" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Texto Alternativo *</label>
                    <Input
                      value={formData.alt}
                      onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
                      required
                      placeholder="Descrição da imagem"
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Largura</label>
                      <Select
                        value={formData.colSpan}
                        onValueChange={(value) => setFormData({ ...formData, colSpan: value })}
                      >
                        <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                          <SelectItem value="col-span-1">1 Coluna</SelectItem>
                          <SelectItem value="col-span-2">2 Colunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Altura</label>
                      <Select
                        value={formData.rowSpan}
                        onValueChange={(value) => setFormData({ ...formData, rowSpan: value })}
                      >
                        <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                          <SelectItem value="row-span-1">1 Linha</SelectItem>
                          <SelectItem value="row-span-2">2 Linhas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ordem</label>
                    <Input
                      type="number"
                      value={formData.ordem}
                      onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) })}
                      className="bg-[#0a0a0a] border-[#2a2a2a]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Menor número aparece primeiro</p>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="border-[#2a2a2a]"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8973D] text-black">
                      {editingImagem ? 'Atualizar' : 'Adicionar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="galeria" className="w-full">
          <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a] mb-6">
            <TabsTrigger value="galeria" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              Galeria de Imagens
            </TabsTrigger>
            <TabsTrigger value="sobre" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              Seção Sobre
            </TabsTrigger>
          </TabsList>

          <TabsContent value="galeria">
        {isLoading ? (
          <div className="text-white text-center py-12">Carregando...</div>
        ) : imagens.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="py-12 text-center text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p>Nenhuma imagem na galeria</p>
              <p className="text-sm mt-2">Clique em "Nova Imagem" para adicionar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]">
            {imagens.map((imagem) => (
              <div
                key={imagem.id}
                className={`${imagem.colSpan} ${imagem.rowSpan} relative group overflow-hidden rounded-lg`}
              >
                <img
                  src={imagem.url}
                  alt={imagem.alt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(imagem)}
                    className="text-white hover:bg-white/20"
                  >
                    <Edit className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm('Deseja realmente excluir esta imagem?')) {
                        deleteMutation.mutate(imagem.id);
                      }
                    }}
                    className="text-red-500 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-sm">{imagem.alt}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {imagem.colSpan === 'col-span-2' ? '2 cols' : '1 col'} × {imagem.rowSpan === 'row-span-2' ? '2 rows' : '1 row'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="sobre">
            {secaoSobre ? (
              <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Imagem */}
                    <div>
                      <label className="text-white font-medium mb-2 block">Imagem Principal</label>
                      <div className="space-y-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleSobreImageUpload}
                          disabled={uploadingSobre}
                          className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                        />
                        {uploadingSobre && <p className="text-xs text-gray-400">Enviando...</p>}
                        {secaoSobre.imagem_url && (
                          <img src={secaoSobre.imagem_url} alt="Preview" className="w-full h-60 object-cover rounded-lg" />
                        )}
                      </div>
                    </div>

                    {/* Textos */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">Tag Superior</label>
                        <Input
                          value={secaoSobre.tag_superior || ''}
                          onChange={(e) => setSecaoSobre({ ...secaoSobre, tag_superior: e.target.value })}
                          className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">Título - Parte 1</label>
                        <Input
                          value={secaoSobre.titulo_parte1 || ''}
                          onChange={(e) => setSecaoSobre({ ...secaoSobre, titulo_parte1: e.target.value })}
                          className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">Título - Parte 2 (Dourado)</label>
                        <Input
                          value={secaoSobre.titulo_parte2 || ''}
                          onChange={(e) => setSecaoSobre({ ...secaoSobre, titulo_parte2: e.target.value })}
                          className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">Atendimentos Base</label>
                        <Input
                          type="number"
                          value={secaoSobre.atendimentos_base || 5000}
                          onChange={(e) => setSecaoSobre({ ...secaoSobre, atendimentos_base: parseInt(e.target.value) || 0 })}
                          className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Este número será somado aos atendimentos realizados ({agendamentosRealizados.length})
                        </p>
                        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-3 mt-2">
                          <p className="text-[#D4AF37] font-semibold text-lg">
                            Total: {(secaoSobre.atendimentos_base || 5000) + agendamentosRealizados.length}+ atendimentos
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parágrafos */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Parágrafo 1</label>
                      <Textarea
                        value={secaoSobre.paragrafo1 || ''}
                        onChange={(e) => setSecaoSobre({ ...secaoSobre, paragrafo1: e.target.value })}
                        rows={3}
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Parágrafo 2</label>
                      <Textarea
                        value={secaoSobre.paragrafo2 || ''}
                        onChange={(e) => setSecaoSobre({ ...secaoSobre, paragrafo2: e.target.value })}
                        rows={3}
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Parágrafo 3</label>
                      <Textarea
                        value={secaoSobre.paragrafo3 || ''}
                        onChange={(e) => setSecaoSobre({ ...secaoSobre, paragrafo3: e.target.value })}
                        rows={3}
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                      />
                    </div>
                  </div>

                  {/* Destaques */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-white font-medium">Destaque 1</h3>
                      <Input
                        placeholder="Título"
                        value={secaoSobre.destaque1_titulo || ''}
                        onChange={(e) => setSecaoSobre({ ...secaoSobre, destaque1_titulo: e.target.value })}
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                      />
                      <Input
                        placeholder="Subtítulo"
                        value={secaoSobre.destaque1_subtitulo || ''}
                        onChange={(e) => setSecaoSobre({ ...secaoSobre, destaque1_subtitulo: e.target.value })}
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                      />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-white font-medium">Destaque 2</h3>
                      <Input
                        placeholder="Título"
                        value={secaoSobre.destaque2_titulo || ''}
                        onChange={(e) => setSecaoSobre({ ...secaoSobre, destaque2_titulo: e.target.value })}
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                      />
                      <Input
                        placeholder="Subtítulo"
                        value={secaoSobre.destaque2_subtitulo || ''}
                        onChange={(e) => setSecaoSobre({ ...secaoSobre, destaque2_subtitulo: e.target.value })}
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSaveSobre}
                      disabled={saveSobreMutation.isPending}
                      className="bg-[#D4AF37] hover:bg-[#B8973D] text-black"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveSobreMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-white text-center py-12">Carregando...</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdminGaleria() {
  return (
    <AdminRoute>
      <AdminGaleriaContent />
    </AdminRoute>
  );
}