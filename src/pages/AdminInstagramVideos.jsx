import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Video, Eye, EyeOff } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

function AdminInstagramVideosContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    url_instagram: '',
    thumbnail_url: '',
    video_url: '',
    descricao: '',
    ordem: 0,
    ativo: true
  });
  const [uploadando, setUploadando] = useState(false);
  const [uploadandoVideo, setUploadandoVideo] = useState(false);

  const queryClient = useQueryClient();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['instagram-videos'],
    queryFn: () => base44.entities.InstagramVideo.list('-ordem')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InstagramVideo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-videos'] });
      toast.success('Vídeo adicionado com sucesso!');
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InstagramVideo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-videos'] });
      toast.success('Vídeo atualizado com sucesso!');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InstagramVideo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-videos'] });
      toast.success('Vídeo removido com sucesso!');
    }
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      url_instagram: '',
      thumbnail_url: '',
      video_url: '',
      descricao: '',
      ordem: 0,
      ativo: true
    });
    setEditando(null);
    setDialogOpen(false);
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadando(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, thumbnail_url: result.file_url });
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadando(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadandoVideo(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, video_url: result.file_url });
      toast.success('Vídeo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar vídeo');
    } finally {
      setUploadandoVideo(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editando) {
      updateMutation.mutate({ id: editando, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (video) => {
    setFormData({
      titulo: video.titulo,
      url_instagram: video.url_instagram || '',
      thumbnail_url: video.thumbnail_url || '',
      video_url: video.video_url || '',
      descricao: video.descricao || '',
      ordem: video.ordem || 0,
      ativo: video.ativo
    });
    setEditando(video.id);
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja remover este vídeo?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleAtivo = (video) => {
    updateMutation.mutate({
      id: video.id,
      data: { ...video, ativo: !video.ativo }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Admin')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Vídeos do Instagram</h1>
              <p className="text-gray-400 text-sm mt-1">Gerencie os vídeos exibidos no site</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4AF37] hover:bg-[#B8973D] text-black" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Vídeo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editando ? 'Editar Vídeo' : 'Novo Vídeo'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Título</label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    required
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    placeholder="Ex: Transformação do Mês"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Imagem de Capa *</label>
                  <div className="space-y-2">
                    {formData.thumbnail_url && (
                      <img src={formData.thumbnail_url} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      disabled={uploadando}
                      required
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    />
                    {uploadando && <p className="text-xs text-[#D4AF37]">Enviando imagem...</p>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Imagem de capa do vídeo (obrigatório)</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Arquivo de Vídeo (MP4)</label>
                  <div className="space-y-2">
                    {formData.video_url && (
                      <video src={formData.video_url} controls className="w-full h-40 rounded-lg bg-black" />
                    )}
                    <Input
                      type="file"
                      accept="video/mp4,video/quicktime"
                      onChange={handleVideoUpload}
                      disabled={uploadandoVideo}
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    />
                    {uploadandoVideo && <p className="text-xs text-[#D4AF37]">Enviando vídeo...</p>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload do vídeo MP4 para rodar no card</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">URL do Instagram (opcional)</label>
                  <Input
                    value={formData.url_instagram}
                    onChange={(e) => setFormData({ ...formData, url_instagram: e.target.value })}
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    placeholder="https://www.instagram.com/p/..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Link para o post original (opcional)</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Descrição (opcional)</label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    rows={3}
                    placeholder="Descrição do vídeo..."
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Ordem de Exibição</label>
                  <Input
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="ativo" className="text-sm text-gray-400">Vídeo ativo</label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#D4AF37] hover:bg-[#B8973D] text-black"
                  >
                    {editando ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Vídeos */}
        {videos.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400 text-center">Nenhum vídeo cadastrado ainda.</p>
              <p className="text-gray-500 text-sm text-center mt-2">
                Adicione vídeos do Instagram para exibir no site.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="bg-[#1a1a1a] border-[#2a2a2a] overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg text-white">{video.titulo}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleAtivo(video)}
                        className="h-8 w-8"
                      >
                        {video.ativo ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="aspect-video bg-black/50 rounded-lg overflow-hidden relative">
                    {video.video_url ? (
                      <video 
                        src={video.video_url}
                        poster={video.thumbnail_url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.titulo} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {video.descricao && (
                    <p className="text-sm text-gray-400 line-clamp-2">{video.descricao}</p>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(video)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(video.id)}
                      className="flex-1 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remover
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <span>Ordem: {video.ordem}</span>
                    <span className={video.ativo ? 'text-green-500' : 'text-gray-500'}>
                      {video.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminInstagramVideos() {
  return (
    <AdminRoute>
      <AdminInstagramVideosContent />
    </AdminRoute>
  );
}