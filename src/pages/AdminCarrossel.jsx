import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Upload, Plus, Trash2, MoveUp, MoveDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';

function AdminCarrosselContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [novaImagem, setNovaImagem] = useState({ url: '', alt: '', ordem: 0 });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      // ✅ PROTEÇÃO: Verificação segura de role sem redirecionamento inseguro
      if (!currentUser || currentUser?.role !== 'admin') {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      setUser(currentUser);
    } catch (error) {
      // ✅ Redirecionamento seguro usando base44.auth em vez de window.location.href
      base44.auth.redirectToLogin(window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  // ✅ PROTEÇÃO: React Query com tratamento robusto de erros e fallback seguro
  const { data: imagens = [], isLoading: loadingImagens } = useQuery({
    queryKey: ['imagens-hero'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getAdminCarrossel', {});
        // ✅ Optional chaining seguro para evitar crash
        if (response?.data?.success && Array.isArray(response?.data?.imagens)) {
          return response.data.imagens;
        }
        return [];
      } catch (error) {
        // ✅ Captura erros silenciosamente e retorna array vazio
        console.error('Erro ao buscar carrossel:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // ✅ Aumentado para evitar requisições repetitivas
    retry: 2,
  });

  const criarMutation = useMutation({
    mutationFn: (data) => base44.entities.ImagemHero.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['imagens-hero']);
      setDialogOpen(false);
      resetForm();
      toast.success('Imagem adicionada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao adicionar imagem');
    }
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImagemHero.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['imagens-hero']);
      toast.success('Imagem atualizada!');
    }
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.ImagemHero.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['imagens-hero']);
      toast.success('Imagem removida!');
    }
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNovaImagem({ ...novaImagem, url: file_url });
      toast.success('Imagem enviada!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadando(false);
    }
  };

  const handleSubmit = () => {
    if (!novaImagem.url || !novaImagem.alt) {
      toast.error('Preencha todos os campos');
      return;
    }
    criarMutation.mutate(novaImagem);
  };

  const resetForm = () => {
    setNovaImagem({ url: '', alt: '', ordem: 0 });
  };

  const moverImagem = (index, direcao) => {
    const novaOrdem = [...imagens];
    if (direcao === 'up' && index > 0) {
      [novaOrdem[index], novaOrdem[index - 1]] = [novaOrdem[index - 1], novaOrdem[index]];
    } else if (direcao === 'down' && index < novaOrdem.length - 1) {
      [novaOrdem[index], novaOrdem[index + 1]] = [novaOrdem[index + 1], novaOrdem[index]];
    }

    // Atualizar ordem no banco
    novaOrdem.forEach((img, idx) => {
      atualizarMutation.mutate({ id: img.id, data: { ...img, ordem: idx } });
    });
  };

  if (loading || loadingImagens) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                  Carrossel Hero
                </h1>
                <p className="text-gray-400 text-sm">Gerencie as imagens da página inicial</p>
              </div>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-[#D4AF37] hover:bg-[#B8973D] text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Imagem
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-6">
          {imagens.map((imagem, index) => (
            <Card key={imagem.id} className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardContent className="p-6">
                <div className="flex gap-6 items-center">
                  {/* Preview */}
                  <div className="w-40 h-40 rounded-lg overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                    <img
                      src={imagem.url}
                      alt={imagem.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-2">{imagem.alt}</h3>
                    <p className="text-gray-400 text-sm mb-3">Ordem: {index + 1}</p>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={imagem.ativo}
                        onCheckedChange={(checked) => 
                          atualizarMutation.mutate({ id: imagem.id, data: { ...imagem, ativo: checked } })
                        }
                      />
                      <span className="text-gray-400 text-sm">
                        {imagem.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moverImagem(index, 'up')}
                      disabled={index === 0}
                      className="border-[#2a2a2a] text-gray-400"
                    >
                      <MoveUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moverImagem(index, 'down')}
                      disabled={index === imagens.length - 1}
                      className="border-[#2a2a2a] text-gray-400"
                    >
                      <MoveDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deletarMutation.mutate(imagem.id)}
                      className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {imagens.length === 0 && (
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardContent className="p-12 text-center">
                <Eye className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhuma imagem cadastrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Imagem ao Carrossel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Imagem</Label>
              <div className="mt-2">
                {novaImagem.url ? (
                  <div className="relative">
                    <img
                      src={novaImagem.url}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNovaImagem({ ...novaImagem, url: '' })}
                      className="absolute top-2 right-2"
                    >
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#2a2a2a] rounded-lg cursor-pointer hover:border-[#D4AF37] transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-gray-400">
                      {uploadando ? 'Enviando...' : 'Clique para enviar'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                      disabled={uploadando}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <Label>Texto Alternativo</Label>
              <Input
                value={novaImagem.alt}
                onChange={(e) => setNovaImagem({ ...novaImagem, alt: e.target.value })}
                placeholder="Profissional Barbearia DeMattos"
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white mt-2"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                className="flex-1 border-[#2a2a2a]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={criarMutation.isPending}
                className="flex-1 bg-[#D4AF37] hover:bg-[#B8973D] text-black"
              >
                {criarMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminCarrossel() {
  return (
    <AdminRoute>
      <AdminCarrosselContent />
    </AdminRoute>
  );
}