import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, Save, Volume2, Mic, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function AdminAssisteContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    voz_tipo: 'pt-BR-Female',
    velocidade_fala: 1.2,
    tom_voz: 1.1,
    volume: 1.0,
    audio_respostas_ativo: true,
    audio_entrada_ativo: true,
    ativo: true
  });

  const queryClient = useQueryClient();

  useEffect(() => {
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
  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-assistente'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getAdminAssistente', {});
        // ✅ Optional chaining seguro para evitar crash
        if (response?.data?.success && response?.data?.configs) {
          return [response.data.configs];
        }
        return [];
      } catch (error) {
        // ✅ Captura erros silenciosamente e retorna array vazio
        console.error('Erro ao buscar config assistente:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // ✅ Aumentado para evitar requisições repetitivas
    retry: 2,
  });

  useEffect(() => {
    if (configuracoes.length > 0) {
      setConfig({
        ...configuracoes[0],
        audio_respostas_ativo: configuracoes[0].audio_respostas_ativo ?? true,
        audio_entrada_ativo: configuracoes[0].audio_entrada_ativo ?? true
      });
    }
  }, [configuracoes]);

  const salvarMutation = useMutation({
    mutationFn: async (dados) => {
      if (configuracoes.length > 0) {
        return base44.entities.ConfiguracaoAssistente.update(configuracoes[0].id, dados);
      } else {
        return base44.entities.ConfiguracaoAssistente.create(dados);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracoes-assistente']);
      toast.success('Configurações salvas com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar configurações');
    }
  });

  const handleSalvar = () => {
    salvarMutation.mutate(config);
  };

  const testarVoz = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      setTimeout(() => {
        const texto = "Olá! Sou o assistente virtual da Barbearia DeMattos. Esta é a voz que estou usando com as configurações selecionadas.";
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = config.voz_tipo.includes('pt-BR') ? 'pt-BR' : 'pt-PT';
        utterance.rate = config.velocidade_fala;
        utterance.pitch = config.tom_voz;
        utterance.volume = config.volume;

        const vozes = window.speechSynthesis.getVoices();
        
        if (vozes.length > 0) {
          const isPtBr = config.voz_tipo.includes('pt-BR');
          const isFemale = config.voz_tipo.includes('Female');
          
          // Buscar voz específica
          let vozSelecionada = vozes.find(v => {
            const langMatch = v.lang.includes(isPtBr ? 'pt-BR' : 'pt-PT') || v.lang.includes(isPtBr ? 'pt_BR' : 'pt_PT');
            if (!langMatch) return false;
            
            const nameLower = v.name.toLowerCase();
            if (isFemale) {
              return nameLower.includes('female') || nameLower.includes('feminina') || nameLower.includes('luciana');
            } else {
              return nameLower.includes('male') || nameLower.includes('masculino') || nameLower.includes('ricardo');
            }
          });

          // Fallback: qualquer voz PT
          if (!vozSelecionada) {
            vozSelecionada = vozes.find(v => v.lang.includes('pt'));
          }

          if (vozSelecionada) {
            utterance.voice = vozSelecionada;
          }
        }

        utterance.onstart = () => {
          toast.success('Reproduzindo amostra de voz');
        };

        utterance.onerror = (e) => {
          toast.error('Erro ao reproduzir voz. Tente ajustar as configurações.');
        };

        window.speechSynthesis.speak(utterance);
      }, 100);
    } else {
      toast.error('Síntese de voz não disponível no navegador');
    }
  };

  if (loading) {
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
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white touch-manipulation">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                  Configurar Assistente IA
                </h1>
                <p className="text-gray-400 text-sm">Personalize a voz e comportamento do assistente</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12 safe-area-bottom">
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">Configurações de Voz</CardTitle>
            <CardDescription className="text-gray-400">
              Ajuste como o assistente virtual irá se comunicar por áudio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Serviços de Áudio */}
            <div className="grid grid-cols-2 gap-6 p-6 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Respostas em Áudio</Label>
                    <p className="text-xs text-gray-500">Assistente fala as respostas</p>
                  </div>
                </div>
                <Switch
                  checked={config.audio_respostas_ativo}
                  onCheckedChange={(checked) => setConfig({ ...config, audio_respostas_ativo: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Mic className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <Label className="text-white font-medium">Entrada por Voz</Label>
                    <p className="text-xs text-gray-500">Permite gravar áudio</p>
                  </div>
                </div>
                <Switch
                  checked={config.audio_entrada_ativo}
                  onCheckedChange={(checked) => setConfig({ ...config, audio_entrada_ativo: checked })}
                />
              </div>
            </div>

            {/* Tipo de Voz */}
            <div className="space-y-2">
              <Label className="text-white">Tipo de Voz</Label>
              <Select
                value={config.voz_tipo}
                onValueChange={(value) => setConfig({ ...config, voz_tipo: value })}
              >
                <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  <SelectItem value="pt-BR-Female" className="text-white">
                    Português Brasil - Feminina
                  </SelectItem>
                  <SelectItem value="pt-BR-Male" className="text-white">
                    Português Brasil - Masculina
                  </SelectItem>
                  <SelectItem value="pt-PT-Female" className="text-white">
                    Português Portugal - Feminina
                  </SelectItem>
                  <SelectItem value="pt-PT-Male" className="text-white">
                    Português Portugal - Masculina
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Escolha entre vozes masculinas e femininas com sotaques diferentes
              </p>
            </div>

            {/* Velocidade */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white">Velocidade da Fala</Label>
                <span className="text-[#D4AF37] font-mono text-sm">{config.velocidade_fala.toFixed(1)}x</span>
              </div>
              <Slider
                value={[config.velocidade_fala]}
                onValueChange={(value) => setConfig({ ...config, velocidade_fala: value[0] })}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.5x (Muito Lento)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Muito Rápido)</span>
              </div>
            </div>

            {/* Tom */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white">Tom da Voz</Label>
                <span className="text-[#D4AF37] font-mono text-sm">{config.tom_voz.toFixed(1)}</span>
              </div>
              <Slider
                value={[config.tom_voz]}
                onValueChange={(value) => setConfig({ ...config, tom_voz: value[0] })}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.5 (Grave)</span>
                <span>1.0 (Normal)</span>
                <span>2.0 (Agudo)</span>
              </div>
            </div>

            {/* Volume */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white">Volume</Label>
                <span className="text-[#D4AF37] font-mono text-sm">{Math.round(config.volume * 100)}%</span>
              </div>
              <Slider
                value={[config.volume]}
                onValueChange={(value) => setConfig({ ...config, volume: value[0] })}
                min={0.1}
                max={1.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>10% (Baixo)</span>
                <span>50% (Médio)</span>
                <span>100% (Alto)</span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-[#2a2a2a]">
              <Button
                onClick={testarVoz}
                variant="outline"
                className="flex-1 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 touch-manipulation"
              >
                <Play className="w-4 h-4 mr-2" />
                Testar Voz
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={salvarMutation.isPending}
                className="flex-1 bg-[#D4AF37] hover:bg-[#B8973D] text-black touch-manipulation"
              >
                <Save className="w-4 h-4 mr-2" />
                {salvarMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dicas */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mt-6">
          <CardHeader>
            <CardTitle className="text-white text-lg">💡 Dicas de Configuração</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-400 text-sm space-y-2">
            <p>• <strong className="text-white">Velocidade 1.0-1.3:</strong> Ideal para conversação natural</p>
            <p>• <strong className="text-white">Tom 1.0-1.2:</strong> Recomendado para voz amigável e profissional</p>
            <p>• <strong className="text-white">Volume:</strong> Mantenha entre 80-100% para melhor clareza</p>
            <p>• <strong className="text-white">Voz Feminina:</strong> Geralmente percebida como mais acolhedora</p>
            <p>• <strong className="text-white">Voz Masculina:</strong> Geralmente percebida como mais autoritária</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminAssistente() {
  return (
    <AdminRoute>
      <AdminAssisteContent />
    </AdminRoute>
  );
}