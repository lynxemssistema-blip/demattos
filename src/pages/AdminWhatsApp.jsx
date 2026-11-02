import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AdminRoute from '@/components/auth/AdminRoute';
import { createPageUrl } from '@/utils';
import { evolutionApi, DEFAULT_TEMPLATES, LUAN_DEFAULT_PHONE } from '@/api/evolutionClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  QrCode,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Send,
  LogOut,
  Power,
  ShieldCheck,
  ShieldAlert,
  Shield,
  PhoneCall,
  Loader2,
  ExternalLink,
  MessageSquare,
  Clock,
  Sparkles,
  Save,
  Calendar,
  Info,
  Server,
  Hash,
  Bell,
  Sliders,
  Shuffle,
  Sun,
  Moon,
  Zap,
  Check,
  Activity,
  Flame,
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

function AdminWhatsAppContent() {
  const [activeTab, setActiveTab] = useState('conexao');
  const [connectionState, setConnectionState] = useState('unknown'); // 'open', 'connecting', 'close', 'unknown'
  const [instanceDetails, setInstanceDetails] = useState(null);
  const [qrCodeBase64, setQrCodeBase64] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [countdown, setCountdown] = useState(40);
  const [previewSeed, setPreviewSeed] = useState(0);

  // Configurações & Templates com parâmetros de Automação e Anti-Ban
  const [settings, setSettings] = useState({
    modo_operacao: 'teste', // 'teste' ou 'oficial'
    numero_teste_luan: LUAN_DEFAULT_PHONE,

    // Disparos Ativos
    confirmacao_ativa: true,
    cancelamento_ativo: true,
    lembrete_ativo: true,
    notificar_barbeiro_ativo: true,

    // Parâmetros de Automação & Lembretes
    lembrete_timing: '1_dia_antes_noite',
    segundo_lembrete_ativo: false,
    segundo_lembrete_timing: '2_horas_antes',
    confirmacao_delay_modo: 'instantaneo',

    // Parâmetros Anti-Ban Meta
    antiban_simular_digitando: true,
    antiban_spintax_ativo: true,
    antiban_delay_min: 3,
    antiban_delay_max: 8,
    antiban_janela_ativa: true,
    antiban_janela_inicio: '08:00',
    antiban_janela_fim: '21:30',
    antiban_limite_hora: 30,
    antiban_rodape_optout: true,

    // Modelos
    template_confirmacao: DEFAULT_TEMPLATES.confirmacao,
    template_cancelamento: DEFAULT_TEMPLATES.cancelamento,
    template_lembrete: DEFAULT_TEMPLATES.lembrete,
    template_aviso_barbeiro: DEFAULT_TEMPLATES.aviso_barbeiro,
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState('confirmacao');

  // Envio de teste manual
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const pollIntervalRef = useRef(null);
  const prevStateRef = useRef(null);

  // 1. Carregar status da conexão e configurações
  useEffect(() => {
    loadStatusAndDetails(true);
    loadSettings();

    // Polling a cada 5 segundos
    pollIntervalRef.current = setInterval(() => {
      checkStatusSilently();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // 2. Contador regressivo para expiração do QR Code
  useEffect(() => {
    if (connectionState !== 'open' && qrCodeBase64) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleRefreshQrCode();
            return 40;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [connectionState, qrCodeBase64]);

  const loadSettings = async () => {
    const data = await evolutionApi.getWhatsAppSettings();
    if (data) {
      setSettings(data);
    }
  };

  const loadStatusAndDetails = async (initial = false) => {
    if (initial) setLoadingQr(true);
    try {
      const stateRes = await evolutionApi.getConnectionState();
      setConnectionState(stateRes.state);
      prevStateRef.current = stateRes.state;

      if (stateRes.state === 'open') {
        const detailsRes = await evolutionApi.getInstanceDetails();
        if (detailsRes.success) {
          setInstanceDetails(detailsRes.instance);
        }
        setQrCodeBase64(null);
      } else {
        await handleRefreshQrCode();
      }
    } catch (e) {
      console.error('Erro ao carregar status:', e);
    } finally {
      if (initial) setLoadingQr(false);
    }
  };

  const checkStatusSilently = async () => {
    try {
      const stateRes = await evolutionApi.getConnectionState();
      const newState = stateRes.state;

      if (prevStateRef.current !== 'open' && newState === 'open') {
        toast.success('WhatsApp conectado com sucesso!');
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch (e) {}
        const detailsRes = await evolutionApi.getInstanceDetails();
        if (detailsRes.success) {
          setInstanceDetails(detailsRes.instance);
        }
        setQrCodeBase64(null);
      }

      setConnectionState(newState);
      prevStateRef.current = newState;
    } catch (e) {}
  };

  const handleRefreshQrCode = async () => {
    setLoadingQr(true);
    try {
      const res = await evolutionApi.connect();
      if (res.success && res.base64) {
        setQrCodeBase64(res.base64);
        setCountdown(40);
        setConnectionState('connecting');
      } else {
        const stateRes = await evolutionApi.getConnectionState();
        setConnectionState(stateRes.state);
        if (stateRes.state === 'open') {
          toast.success('WhatsApp já se encontra conectado!');
        } else {
          toast.error('Não foi possível gerar novo QR Code no momento.');
        }
      }
    } catch (e) {
      toast.error('Erro ao buscar QR Code: ' + e.message);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp desta instância? Será necessário ler o QR Code novamente para reconectar.')) {
      return;
    }
    setLoadingAction(true);
    try {
      const res = await evolutionApi.disconnect();
      if (res.success) {
        toast.info('Instância desconectada com sucesso.');
        setConnectionState('close');
        setInstanceDetails(null);
        await handleRefreshQrCode();
      } else {
        toast.error('Erro ao desconectar instância.');
      }
    } catch (e) {
      toast.error('Erro: ' + e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRestart = async () => {
    setLoadingAction(true);
    try {
      const res = await evolutionApi.restart();
      if (res.success) {
        toast.success('Instância reiniciada com sucesso! Atualizando status...');
        setTimeout(() => {
          loadStatusAndDetails(true);
        }, 3000);
      } else {
        toast.error('Falha ao reiniciar instância.');
      }
    } catch (e) {
      toast.error('Erro: ' + e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await evolutionApi.saveWhatsAppSettings(settings);
      if (res.success) {
        toast.success('Todas as configurações, modelos e regras anti-ban foram salvas com sucesso!');
      } else {
        toast.error('Erro ao salvar configurações.');
      }
    } catch (e) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleInsertTag = (tag) => {
    let field = 'template_confirmacao';
    if (activeTemplateTab === 'cancelamento') field = 'template_cancelamento';
    if (activeTemplateTab === 'lembrete') field = 'template_lembrete';
    if (activeTemplateTab === 'aviso_barbeiro') field = 'template_aviso_barbeiro';

    setSettings((prev) => ({
      ...prev,
      [field]: (prev[field] || '') + ` ${tag} `
    }));
  };

  const handleResetTemplate = (tipo) => {
    if (window.confirm('Deseja restaurar este modelo para o texto padrão da barbearia?')) {
      const field = `template_${tipo}`;
      setSettings((prev) => ({
        ...prev,
        [field]: DEFAULT_TEMPLATES[tipo]
      }));
      toast.info('Modelo restaurado para o padrão.');
    }
  };

  const handleSendTemplateTest = async (tipo) => {
    if (connectionState !== 'open') {
      toast.warning('O WhatsApp precisa estar conectado para disparar mensagens de teste.');
      return;
    }

    const targetNumber = settings.modo_operacao === 'teste' ? settings.numero_teste_luan : (testNumber || settings.numero_teste_luan);
    if (!targetNumber) {
      toast.error('Informe um número de telefone com DDD.');
      return;
    }

    setSendingTest(true);
    try {
      const sampleData = {
        cliente_nome: 'Carlos Silva',
        cliente_telefone: '(31) 98765-4321',
        barbeiro_nome: 'Luan',
        servico: 'Corte + Barba Visagista',
        data: new Date().toLocaleDateString('pt-BR'),
        horario: '15:30',
        endereco: 'R. Rio Tocantins, 328 - Riacho das Pedras, Contagem',
        telefone_barbearia: '(31) 97365-1924',
        observacoes: 'Degradê na zero e barba alinhada'
      };

      let text = evolutionApi.formatTemplate(settings[`template_${tipo}`], sampleData, settings.antiban_spintax_ativo);
      if (settings.modo_operacao === 'teste') {
        text = `🧪 *[TESTE MANUAL - MODELO ${tipo.toUpperCase()}]*\n\n${text}`;
      }

      const res = await evolutionApi.sendHumanizedTextMessage(targetNumber, text, settings);
      if (res.success) {
        toast.success(`Mensagem de teste enviada com sucesso para ${targetNumber}!`);
      } else {
        toast.error('Falha no envio da mensagem: ' + (res.error || res.reason || 'Verifique o número'));
      }
    } catch (e) {
      toast.error('Erro ao enviar teste: ' + e.message);
    } finally {
      setSendingTest(false);
    }
  };

  // Preview dinâmico para renderizar balão do WhatsApp com Spintax resolvido
  const getActivePreviewText = () => {
    const sampleData = {
      cliente_nome: 'Carlos Silva',
      cliente_telefone: '(31) 98765-4321',
      barbeiro_nome: 'Luan',
      servico: 'Corte Premium & Barba',
      data: '03/11/2026',
      horario: '16:00',
      endereco: 'R. Rio Tocantins, 328 - Riacho das Pedras',
      telefone_barbearia: '(31) 97365-1924',
      observacoes: 'Degradê na zero e barba alinhada'
    };

    const currentTemplate = settings[`template_${activeTemplateTab}`] || '';
    let formatted = evolutionApi.formatTemplate(currentTemplate, sampleData, settings.antiban_spintax_ativo);

    if (settings.modo_operacao === 'teste') {
      const destinatario = activeTemplateTab === 'aviso_barbeiro' ? 'Barbeiro Luan' : 'Carlos Silva';
      formatted = `🧪 *[MODO DE TESTE - Destinado a: ${destinatario}]*\n\n${formatted}`;
    }
    return formatted;
  };

  // Pontuação de Saúde e Proteção Anti-Ban Meta (0 a 100%)
  const calculateHealthScore = () => {
    let score = 0;
    if (settings.antiban_simular_digitando) score += 25;
    if (settings.antiban_spintax_ativo) score += 25;
    if (settings.antiban_janela_ativa) score += 25;
    if (settings.antiban_delay_min >= 2) score += 15;
    if (settings.antiban_rodape_optout) score += 10;
    return Math.min(100, score);
  };

  const healthScore = calculateHealthScore();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Admin')}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-[#1a1a1a]">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-[#25D366]" />
                <h1 className="text-2xl font-bold tracking-tight text-white">Central WhatsApp & Automações</h1>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Evolution API &bull; Instância: <span className="text-[#D4AF37] font-medium">{evolutionApi.getInstanceName()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {connectionState === 'open' ? (
              <Badge className="bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Conectado & Operacional
              </Badge>
            ) : connectionState === 'connecting' ? (
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <RotateCw className="w-4 h-4 animate-spin" /> Aguardando QR Code
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Desconectado
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStatusAndDetails(true)}
              disabled={loadingQr || loadingAction}
              className="border-[#333] hover:bg-[#1a1a1a] text-gray-300"
            >
              <RotateCw className={`w-4 h-4 mr-1.5 ${loadingQr ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* CONTROLE MASTER: Modo Oficial vs Modo de Teste */}
        <Card className={`border-2 transition-all ${settings.modo_operacao === 'oficial' ? 'bg-[#121c15] border-[#25D366]/60 shadow-[0_0_25px_rgba(37,211,102,0.15)]' : 'bg-[#1c1811] border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.15)]'}`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {settings.modo_operacao === 'oficial' ? (
                    <Badge className="bg-[#25D366] text-black font-bold uppercase text-xs px-2.5 py-0.5">
                      🚀 Modo Oficial (Produção)
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-black font-bold uppercase text-xs px-2.5 py-0.5">
                      🧪 Modo de Teste Ativo (Seguro)
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">&bull; Controle de Disparo de Mensagens</span>
                </div>
                <p className="text-sm text-gray-200">
                  {settings.modo_operacao === 'oficial' ? (
                    <>
                      As mensagens automáticas de confirmação, cancelamento e lembretes <strong className="text-[#25D366]">serão enviadas para os números reais de todos os clientes</strong>.
                    </>
                  ) : (
                    <>
                      As mensagens são disparadas <strong className="text-amber-400">exclusivamente para o WhatsApp do Barbeiro Luan</strong>. Nenhum cliente real receberá mensagens de teste.
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                <div className="flex items-center gap-2 bg-[#000]/60 p-2 rounded-lg border border-[#333]">
                  <span className="text-xs font-semibold text-gray-300">Modo:</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setSettings({ ...settings, modo_operacao: 'teste' });
                    }}
                    className={`text-xs font-bold ${settings.modo_operacao === 'teste' ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-transparent text-gray-400 hover:text-white'}`}
                  >
                    🧪 Somente Teste (Luan)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Atenção: Ao ativar o Modo Oficial, os clientes reais receberão mensagens reais no WhatsApp ao agendarem. Deseja continuar?')) {
                        setSettings({ ...settings, modo_operacao: 'oficial' });
                      }
                    }}
                    className={`text-xs font-bold ${settings.modo_operacao === 'oficial' ? 'bg-[#25D366] hover:bg-[#20ba5a] text-black' : 'bg-transparent text-gray-400 hover:text-white'}`}
                  >
                    🚀 Oficial (Clientes)
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[11px] block text-gray-400">Celular do Barbeiro Luan:</span>
                    <Input
                      value={settings.numero_teste_luan}
                      onChange={(e) => setSettings({ ...settings, numero_teste_luan: e.target.value })}
                      placeholder="5531973651924"
                      className="h-8 text-xs w-36 bg-[#000]/70 border-[#444] text-amber-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Abas Principais do Hub WhatsApp */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#141414] border border-[#222] p-1.5 h-auto grid grid-cols-2 md:grid-cols-4 max-w-3xl gap-1">
            <TabsTrigger
              value="conexao"
              className="py-2.5 text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-semibold flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Conexão & QR Code
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="py-2.5 text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-semibold flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Modelos & Spintax
            </TabsTrigger>
            <TabsTrigger
              value="regras"
              className="py-2.5 text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-semibold flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" /> Parâmetros de Disparo
            </TabsTrigger>
            <TabsTrigger
              value="antiban"
              className="py-2.5 text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-semibold flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Proteção Anti-Ban Meta
            </TabsTrigger>
          </TabsList>

          {/* ==================== ABA 1: CONEXÃO & QR CODE ==================== */}
          <TabsContent value="conexao" className="space-y-6 m-0">
            {connectionState === 'open' ? (
              <Card className="bg-[#141414] border-[#222] shadow-xl">
                <CardHeader className="border-b border-[#222] pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[#25D366]" /> Aparelho Conectado
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-1">
                        O WhatsApp está ativo e sincronizado com a Evolution API.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
                    {instanceDetails?.profilePicUrl ? (
                      <img
                        src={instanceDetails.profilePicUrl}
                        alt="Perfil WhatsApp"
                        className="w-20 h-20 rounded-full object-cover border-2 border-[#25D366]"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#25D366]/10 flex items-center justify-center border-2 border-[#25D366]">
                        <Smartphone className="w-9 h-9 text-[#25D366]" />
                      </div>
                    )}

                    <div className="space-y-1 text-center sm:text-left flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {instanceDetails?.profileName || 'Demattos Visage'}
                      </h3>
                      <p className="text-sm text-gray-400 flex items-center justify-center sm:justify-start gap-1.5">
                        <PhoneCall className="w-4 h-4 text-[#D4AF37]" />
                        {instanceDetails?.number ? `+${instanceDetails.number}` : '(31) 97365-1924'}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2 justify-center sm:justify-start">
                        <Badge variant="outline" className="text-xs border-[#333] text-gray-300">
                          Instância: {instanceDetails?.name || 'DeMattos'}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-[#333] text-gray-300">
                          Mensagens Entregues: {instanceDetails?._count?.Message || '0'}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-[#333] text-gray-300">
                          Contatos: {instanceDetails?._count?.Contact || '0'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRestart}
                        disabled={loadingAction}
                        className="border-[#333] hover:bg-[#222] text-gray-200"
                      >
                        <Power className="w-4 h-4 mr-1.5 text-amber-400" />
                        Reiniciar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={loadingAction}
                        className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-200"
                      >
                        <LogOut className="w-4 h-4 mr-1.5" />
                        Desconectar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#141414] border-[#222]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#D4AF37]" /> Conectar WhatsApp via QR Code
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Aponte a câmera do WhatsApp para a imagem abaixo para estabelecer a conexão.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-6 space-y-4">
                  {qrCodeBase64 ? (
                    <div className="p-4 bg-white rounded-xl shadow-2xl border-4 border-[#D4AF37]">
                      <img src={qrCodeBase64} alt="QR Code WhatsApp" className="w-64 h-64" />
                    </div>
                  ) : (
                    <div className="w-64 h-64 rounded-xl border border-dashed border-[#444] flex flex-col items-center justify-center p-6 text-center text-gray-400 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                      <p className="text-xs">Gerando QR Code atualizado...</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Expira em: <strong className="text-amber-400 font-mono">{countdown}s</strong></span>
                    <Button variant="ghost" size="sm" onClick={handleRefreshQrCode} disabled={loadingQr} className="text-[#D4AF37] hover:underline h-auto p-0 ml-2">
                      Atualizar Agora
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ==================== ABA 2: MODELOS & SPINTAX ==================== */}
          <TabsContent value="templates" className="space-y-6 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Coluna Esquerda: Editor de Templates */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Seleção do Tipo de Template */}
                <div className="flex flex-wrap items-center gap-2 border-b border-[#222] pb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTemplateTab === 'confirmacao' ? 'default' : 'outline'}
                    onClick={() => setActiveTemplateTab('confirmacao')}
                    className={`text-xs ${activeTemplateTab === 'confirmacao' ? 'bg-[#25D366] text-black hover:bg-[#20ba5a]' : 'border-[#333] text-gray-300'}`}
                  >
                    ✅ 1. Confirmação (Cliente)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTemplateTab === 'cancelamento' ? 'default' : 'outline'}
                    onClick={() => setActiveTemplateTab('cancelamento')}
                    className={`text-xs ${activeTemplateTab === 'cancelamento' ? 'bg-red-500 text-white hover:bg-red-600' : 'border-[#333] text-gray-300'}`}
                  >
                    ❌ 2. Cancelamento (Cliente)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTemplateTab === 'lembrete' ? 'default' : 'outline'}
                    onClick={() => setActiveTemplateTab('lembrete')}
                    className={`text-xs ${activeTemplateTab === 'lembrete' ? 'bg-[#D4AF37] text-black hover:bg-[#b89730]' : 'border-[#333] text-gray-300'}`}
                  >
                    ⏰ 3. Lembrete (Cliente)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTemplateTab === 'aviso_barbeiro' ? 'default' : 'outline'}
                    onClick={() => setActiveTemplateTab('aviso_barbeiro')}
                    className={`text-xs ${activeTemplateTab === 'aviso_barbeiro' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-[#333] text-gray-300'}`}
                  >
                    🔔 4. Aviso ao Barbeiro
                  </Button>
                </div>

                {/* Bloco 1: CONFIRMAÇÃO */}
                {activeTemplateTab === 'confirmacao' && (
                  <Card className="bg-[#141414] border-[#222]">
                    <CardHeader className="pb-3 border-b border-[#222]">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base text-white">Mensagem de Confirmação</CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            Enviada quando o cliente conclui o agendamento no site ou quando o barbeiro confirma manualmente.
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Ativar:</span>
                          <Switch
                            checked={settings.confirmacao_ativa}
                            onCheckedChange={(c) => setSettings({ ...settings, confirmacao_ativa: c })}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-300">Texto da Mensagem</label>
                          <button
                            type="button"
                            onClick={() => handleResetTemplate('confirmacao')}
                            className="text-[11px] text-[#D4AF37] hover:underline"
                          >
                            Restaurar Padrão
                          </button>
                        </div>
                        <Textarea
                          rows={10}
                          value={settings.template_confirmacao}
                          onChange={(e) => setSettings({ ...settings, template_confirmacao: e.target.value })}
                          className="bg-[#1a1a1a] border-[#333] text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bloco 2: CANCELAMENTO */}
                {activeTemplateTab === 'cancelamento' && (
                  <Card className="bg-[#141414] border-[#222]">
                    <CardHeader className="pb-3 border-b border-[#222]">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base text-white">Mensagem de Cancelamento</CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            Disparada quando o agendamento for cancelado pelo cliente ou pelo administrador.
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Ativar:</span>
                          <Switch
                            checked={settings.cancelamento_ativo}
                            onCheckedChange={(c) => setSettings({ ...settings, cancelamento_ativo: c })}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-300">Texto da Mensagem</label>
                          <button
                            type="button"
                            onClick={() => handleResetTemplate('cancelamento')}
                            className="text-[11px] text-[#D4AF37] hover:underline"
                          >
                            Restaurar Padrão
                          </button>
                        </div>
                        <Textarea
                          rows={10}
                          value={settings.template_cancelamento}
                          onChange={(e) => setSettings({ ...settings, template_cancelamento: e.target.value })}
                          className="bg-[#1a1a1a] border-[#333] text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bloco 3: LEMBRETE */}
                {activeTemplateTab === 'lembrete' && (
                  <Card className="bg-[#141414] border-[#222]">
                    <CardHeader className="pb-3 border-b border-[#222]">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#D4AF37]" /> Mensagem de Lembrete Agendado
                          </CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            Disparada automaticamente com antecedência para evitar no-shows e faltas.
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Ativar:</span>
                          <Switch
                            checked={settings.lembrete_ativo}
                            onCheckedChange={(c) => setSettings({ ...settings, lembrete_ativo: c })}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-300">Texto do Lembrete</label>
                          <button
                            type="button"
                            onClick={() => handleResetTemplate('lembrete')}
                            className="text-[11px] text-[#D4AF37] hover:underline"
                          >
                            Restaurar Padrão
                          </button>
                        </div>
                        <Textarea
                          rows={10}
                          value={settings.template_lembrete}
                          onChange={(e) => setSettings({ ...settings, template_lembrete: e.target.value })}
                          className="bg-[#1a1a1a] border-[#333] text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bloco 4: AVISO AO BARBEIRO */}
                {activeTemplateTab === 'aviso_barbeiro' && (
                  <Card className="bg-[#141414] border-[#222]">
                    <CardHeader className="pb-3 border-b border-[#222]">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base text-white flex items-center gap-2">
                            <Bell className="w-4 h-4 text-blue-400" /> Notificação de Novo Agendamento (Barbeiro)
                          </CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            Enviada para o WhatsApp do profissional assim que um cliente conclui o agendamento no site.
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Ativar:</span>
                          <Switch
                            checked={settings.notificar_barbeiro_ativo}
                            onCheckedChange={(c) => setSettings({ ...settings, notificar_barbeiro_ativo: c })}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-300">Texto da Notificação</label>
                          <button
                            type="button"
                            onClick={() => handleResetTemplate('aviso_barbeiro')}
                            className="text-[11px] text-[#D4AF37] hover:underline"
                          >
                            Restaurar Padrão
                          </button>
                        </div>
                        <Textarea
                          rows={10}
                          value={settings.template_aviso_barbeiro}
                          onChange={(e) => setSettings({ ...settings, template_aviso_barbeiro: e.target.value })}
                          className="bg-[#1a1a1a] border-[#333] text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Variáveis Dinâmicas & Spintax para Inserir */}
                <Card className="bg-[#141414] border-[#222]">
                  <CardHeader className="py-3 border-b border-[#222]">
                    <CardTitle className="text-xs text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Variáveis Dinâmicas & Anti-Ban
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { tag: '{{saudacao_periodo}}', label: 'Bom dia / Boa tarde / Boa noite' },
                        { tag: '{{cliente_nome}}', label: 'Nome Completo' },
                        { tag: '{{cliente_primeiro_nome}}', label: 'Primeiro Nome' },
                        { tag: '{{cliente_telefone}}', label: 'Telefone Cliente' },
                        { tag: '{{barbeiro_nome}}', label: 'Nome Barbeiro' },
                        { tag: '{{servico}}', label: 'Serviço' },
                        { tag: '{{data}}', label: 'Data' },
                        { tag: '{{horario}}', label: 'Horário' },
                        { tag: '{{endereco}}', label: 'Endereço' },
                        { tag: '{{telefone_barbearia}}', label: 'Telefone Barbearia' },
                        { tag: '{{observacoes}}', label: 'Observações' },
                      ].map((item) => (
                        <Button
                          key={item.tag}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleInsertTag(item.tag)}
                          className="text-xs border-[#333] hover:border-[#D4AF37] hover:bg-[#1a1a1a] text-gray-200"
                        >
                          <code className="text-[#D4AF37] mr-1">{item.tag}</code>
                          <span className="text-[10px] text-gray-400">({item.label})</span>
                        </Button>
                      ))}
                    </div>

                    <div className="p-2.5 rounded bg-[#1c1c1c] border border-[#2a2a2a] text-xs text-gray-300 flex items-start gap-2">
                      <Shuffle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-blue-300">Dica Anti-Ban (Spintax):</strong> Você pode usar variações como <code className="text-[#D4AF37]">{`{Olá|Oi|Como vai}`}</code> ou <code className="text-[#D4AF37]">{`{Te esperamos!|Contamos com você!}`}</code>. O sistema sorteia uma opção diferente para cada cliente, impedindo que a Meta detecte mensagens duplicadas repetitivas.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Botões de Ação */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendTemplateTest(activeTemplateTab)}
                    disabled={sendingTest || connectionState !== 'open'}
                    className="border-[#333] hover:bg-[#1a1a1a] text-gray-300"
                  >
                    {sendingTest ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2 text-[#25D366]" />
                    )}
                    Disparar Teste Deste Modelo
                  </Button>

                  <Button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="bg-[#D4AF37] hover:bg-[#b89730] text-black font-bold px-6"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" /> Salvar Todos os Modelos
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Coluna Direita: Prévia Visual Realista do WhatsApp */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="bg-[#141414] border-[#222]">
                  <CardHeader className="py-3 border-b border-[#222]">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#25D366]" /> Prévia no WhatsApp {activeTemplateTab === 'aviso_barbeiro' ? 'do Barbeiro' : 'do Cliente'}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewSeed(s => s + 1)}
                        className="text-[11px] h-7 text-[#D4AF37] hover:bg-[#222] flex items-center gap-1"
                        title="Gera outra variação de Spintax para pré-visualização"
                      >
                        <Shuffle className="w-3 h-3" /> Gerar Variação
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Mockup Celular / Chat WhatsApp */}
                    <div className="rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0b141a] shadow-2xl">
                      {/* Top Bar WhatsApp */}
                      <div className="bg-[#202c33] p-3 flex items-center justify-between border-b border-[#2a3942]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs">
                            DM
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white leading-tight">Barbearia DeMattos</p>
                            <p className="text-[10px] text-[#25D366]">online</p>
                          </div>
                        </div>
                      </div>

                      {/* Fundo do Chat */}
                      <div className="p-4 min-h-[360px] bg-[#0b141a] bg-opacity-95 flex flex-col justify-end">
                        {/* Balão de Mensagem */}
                        <div className="max-w-[88%] bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none p-3 shadow-md space-y-2 text-xs leading-relaxed self-end">
                          <p className="whitespace-pre-wrap select-none font-sans">
                            {getActivePreviewText()}
                          </p>
                          <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400 pt-1">
                            <span>15:30</span>
                            <span className="text-[#53bdeb] font-bold">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-3 text-center">
                      * O botão "Gerar Variação" simula as diferentes combinações Spintax entregues aos clientes.
                    </p>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* ==================== ABA 3: PARÂMETROS DE DISPARO & LEMBRETES ==================== */}
          <TabsContent value="regras" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Bloco: Parâmetros do Lembrete Principal */}
              <Card className="bg-[#141414] border-[#222]">
                <CardHeader>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#D4AF37]" /> Lembrete de Horário Principal
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Defina com quanta antecedência o cliente receberá o lembrete oficial de corte.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                    <div>
                      <p className="text-xs font-semibold text-white">Disparo de Lembrete Ativo</p>
                      <p className="text-[11px] text-gray-400">Ativa o envio automático antes do horário</p>
                    </div>
                    <Switch
                      checked={settings.lembrete_ativo}
                      onCheckedChange={(c) => setSettings({ ...settings, lembrete_ativo: c })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Momento de Envio do Lembrete:
                    </label>
                    <Select
                      value={settings.lembrete_timing}
                      onValueChange={(val) => setSettings({ ...settings, lembrete_timing: val })}
                    >
                      <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white text-xs">
                        <SelectValue placeholder="Selecione o momento" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#333] text-white text-xs">
                        <SelectItem value="1_dia_antes_noite">🌙 1 dia antes às 19:00 (Véspera - Recomendado)</SelectItem>
                        <SelectItem value="1_dia_antes_24h">📅 24 horas antes do horário exato</SelectItem>
                        <SelectItem value="no_dia_cedo">🌅 No mesmo dia pela manhã (às 08:30)</SelectItem>
                        <SelectItem value="3_horas_antes">⏰ 3 horas antes do horário</SelectItem>
                        <SelectItem value="2_horas_antes">⏰ 2 horas antes do horário</SelectItem>
                        <SelectItem value="1_hora_antes">⏰ 1 hora antes do horário</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-400">
                      O envio na véspera (às 19:00) garante tempo para o cliente reagendar e liberar a vaga para outro.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-white">Segundo Lembrete de Reforço</p>
                        <p className="text-[11px] text-gray-400">Disparo extra próximo ao horário marcado</p>
                      </div>
                      <Switch
                        checked={settings.segundo_lembrete_ativo}
                        onCheckedChange={(c) => setSettings({ ...settings, segundo_lembrete_ativo: c })}
                      />
                    </div>

                    {settings.segundo_lembrete_ativo && (
                      <div className="pt-2 border-t border-[#2a2a2a] space-y-1.5">
                        <label className="text-[11px] text-gray-300">Momento do 2º Lembrete:</label>
                        <Select
                          value={settings.segundo_lembrete_timing}
                          onValueChange={(val) => setSettings({ ...settings, segundo_lembrete_timing: val })}
                        >
                          <SelectTrigger className="bg-[#111] border-[#333] text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-[#333] text-white text-xs">
                            <SelectItem value="2_horas_antes">⏰ 2 horas antes do horário</SelectItem>
                            <SelectItem value="1_hora_antes">⏰ 1 hora antes do horário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bloco: Parâmetros da Confirmação & Barbeiro */}
              <div className="space-y-6">
                <Card className="bg-[#141414] border-[#222]">
                  <CardHeader>
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      <CheckCheck className="w-5 h-5 text-[#25D366]" /> Confirmação de Agendamento
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400">
                      Ritmo e comportamento do envio da mensagem de confirmação para o cliente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                      <div>
                        <p className="text-xs font-semibold text-white">Disparo de Confirmação Ativo</p>
                        <p className="text-[11px] text-gray-400">Envia resumo oficial para o cliente</p>
                      </div>
                      <Switch
                        checked={settings.confirmacao_ativa}
                        onCheckedChange={(c) => setSettings({ ...settings, confirmacao_ativa: c })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300">Ritmo de Envio:</label>
                      <Select
                        value={settings.confirmacao_delay_modo}
                        onValueChange={(val) => setSettings({ ...settings, confirmacao_delay_modo: val })}
                      >
                        <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#333] text-white text-xs">
                          <SelectItem value="instantaneo">⚡ Instantâneo (Logo após a finalização no site)</SelectItem>
                          <SelectItem value="delay_1_min">⏱️ Aguardar 1 a 2 minutos (Humanizado - Parece confirmação manual)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#141414] border-[#222]">
                  <CardHeader>
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-400" /> Comunicação com a Equipe
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400">
                      Notificações instantâneas no WhatsApp do barbeiro.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                      <div>
                        <p className="text-xs font-semibold text-white">Avisar Barbeiro ao Agendar</p>
                        <p className="text-[11px] text-gray-400">Envia nome do cliente, serviço e horário</p>
                      </div>
                      <Switch
                        checked={settings.notificar_barbeiro_ativo}
                        onCheckedChange={(c) => setSettings({ ...settings, notificar_barbeiro_ativo: c })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-[#D4AF37] hover:bg-[#b89730] text-black font-bold px-8"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Parâmetros de Disparo
              </Button>
            </div>
          </TabsContent>

          {/* ==================== ABA 4: PROTEÇÃO ANTI-BAN META ==================== */}
          <TabsContent value="antiban" className="space-y-6 m-0">
            {/* Medidor de Saúde do WhatsApp */}
            <Card className="bg-[#141414] border-[#222]">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#25D366]" />
                      <h3 className="text-base font-bold text-white">Índice de Saúde & Segurança Anti-Ban Meta</h3>
                    </div>
                    <p className="text-xs text-gray-400">
                      Calculado com base nas regras ativas de comportamento humano, variações textuais e horários.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-2xl font-black text-white font-mono">{healthScore}%</span>
                      <span className={`block text-[11px] font-semibold ${healthScore >= 80 ? 'text-[#25D366]' : healthScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {healthScore >= 80 ? '🟢 Baixíssimo Risco de Bloqueio' : healthScore >= 50 ? '🟡 Risco Moderado' : '🔴 Atenção Necessária'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-[#222] h-2.5 rounded-full mt-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${healthScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-[#25D366]' : healthScore >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-red-500'}`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Regra 1: Simulação Humana (Digitando + Jitter) */}
              <Card className="bg-[#141414] border-[#222]">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#25D366]" /> Simulação de Comportamento Humano
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    A Meta monitora conexões que disparam instantaneamente sem interação no chat.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                    <div>
                      <p className="text-xs font-semibold text-white">Simular "Digitando..." (Composing)</p>
                      <p className="text-[11px] text-gray-400">Ativa presença no chat 2s a 3s antes do texto</p>
                    </div>
                    <Switch
                      checked={settings.antiban_simular_digitando}
                      onCheckedChange={(c) => setSettings({ ...settings, antiban_simular_digitando: c })}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] space-y-2">
                    <label className="text-xs font-semibold text-gray-200">
                      Intervalo Aleatório entre Disparos (Jitter em segundos):
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-400 block mb-1">Mínimo (seg):</span>
                        <Input
                          type="number"
                          min="1"
                          max="15"
                          value={settings.antiban_delay_min}
                          onChange={(e) => setSettings({ ...settings, antiban_delay_min: Number(e.target.value) })}
                          className="bg-[#111] border-[#333] text-xs font-mono h-8"
                        />
                      </div>
                      <span className="text-gray-500 pt-4">até</span>
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-400 block mb-1">Máximo (seg):</span>
                        <Input
                          type="number"
                          min="3"
                          max="30"
                          value={settings.antiban_delay_max}
                          onChange={(e) => setSettings({ ...settings, antiban_delay_max: Number(e.target.value) })}
                          className="bg-[#111] border-[#333] text-xs font-mono h-8"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 pt-1">
                      Impede envios no mesmo segundo exato, simulando o tempo de uma pessoa real.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Regra 2: Silêncio Noturno & Anti-Denúncia */}
              <Card className="bg-[#141414] border-[#222]">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Moon className="w-4 h-4 text-amber-400" /> Janela de Silêncio Noturno (Anti-Denúncia)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Mensagens enviadas de madrugada causam 85% das denúncias de spam da Meta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                    <div>
                      <p className="text-xs font-semibold text-white">Bloqueio Fora do Horário Permitido</p>
                      <p className="text-[11px] text-gray-400">Cancela disparos automáticos durante a noite</p>
                    </div>
                    <Switch
                      checked={settings.antiban_janela_ativa}
                      onCheckedChange={(c) => setSettings({ ...settings, antiban_janela_ativa: c })}
                    />
                  </div>

                  {settings.antiban_janela_ativa && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Início dos Disparos:</span>
                        <Input
                          type="time"
                          value={settings.antiban_janela_inicio}
                          onChange={(e) => setSettings({ ...settings, antiban_janela_inicio: e.target.value })}
                          className="bg-[#111] border-[#333] text-xs font-mono h-8"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Fim dos Disparos:</span>
                        <Input
                          type="time"
                          value={settings.antiban_janela_fim}
                          onChange={(e) => setSettings({ ...settings, antiban_janela_fim: e.target.value })}
                          className="bg-[#111] border-[#333] text-xs font-mono h-8"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                    <div>
                      <p className="text-xs font-semibold text-white">Rodapé de Remarcação Cortês</p>
                      <p className="text-[11px] text-gray-400">Incentiva resposta em vez de denúncia</p>
                    </div>
                    <Switch
                      checked={settings.antiban_rodape_optout}
                      onCheckedChange={(c) => setSettings({ ...settings, antiban_rodape_optout: c })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Regra 3: Variações Textuais Spintax */}
              <Card className="bg-[#141414] border-[#222]">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-blue-400" /> Variações Dinâmicas de Texto (Spintax)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Gera combinações e saudações distintas para que nenhuma mensagem tenha hash idêntico.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                    <div>
                      <p className="text-xs font-semibold text-white">Ativar Processamento Spintax</p>
                      <p className="text-[11px] text-gray-400">Alterna saudações e frases automaticamente</p>
                    </div>
                    <Switch
                      checked={settings.antiban_spintax_ativo}
                      onCheckedChange={(c) => setSettings({ ...settings, antiban_spintax_ativo: c })}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Mesmo que 50 clientes recebam confirmação no mesmo dia, os filtros de hash da Meta verão 50 textos ligeiramente diferentes.
                  </p>
                </CardContent>
              </Card>

              {/* Regra 4: Limite por Hora */}
              <Card className="bg-[#141414] border-[#222]">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#D4AF37]" /> Limite de Fila por Hora
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Controla o fluxo máximo de disparos automatizados por hora.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-300">Teto Máximo Recomendado:</label>
                    <Select
                      value={String(settings.antiban_limite_hora)}
                      onValueChange={(val) => setSettings({ ...settings, antiban_limite_hora: Number(val) })}
                    >
                      <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#333] text-white text-xs">
                        <SelectItem value="20">20 mensagens / hora (Máxima Segurança)</SelectItem>
                        <SelectItem value="30">30 mensagens / hora (Recomendado para Barbearia)</SelectItem>
                        <SelectItem value="50">50 mensagens / hora (Alto Volume)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Números de WhatsApp comuns não devem ultrapassar 40-50 envios não solicitados por hora.
                  </p>
                </CardContent>
              </Card>

            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-[#D4AF37] hover:bg-[#b89730] text-black font-bold px-8"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Regras de Proteção Anti-Ban
              </Button>
            </div>
          </TabsContent>

        </Tabs>

        {/* Informações Técnicas */}
        <Card className="bg-[#141414] border-[#222]">
          <CardContent className="py-3 px-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>
                  <strong>Servidor Evolution:</strong> {evolutionApi.getApiUrl()} &bull; <strong>App Oficial:</strong> https://demattos.lynxems.com.br/
                </span>
              </div>
              <a
                href={`${evolutionApi.getApiUrl()}/manager`}
                target="_blank"
                rel="noreferrer"
                className="text-[#D4AF37] hover:underline flex items-center gap-1 font-medium"
              >
                Painel Evolution Manager <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default function AdminWhatsApp() {
  return (
    <AdminRoute>
      <AdminWhatsAppContent />
    </AdminRoute>
  );
}
