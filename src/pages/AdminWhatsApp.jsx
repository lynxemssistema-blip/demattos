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
  Hash
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

  // Configurações & Templates
  const [settings, setSettings] = useState({
    modo_operacao: 'teste', // 'teste' ou 'oficial'
    numero_teste_luan: LUAN_DEFAULT_PHONE,
    confirmacao_ativa: true,
    cancelamento_ativo: true,
    lembrete_ativo: true,
    lembrete_timing: '3_horas_antes',
    template_confirmacao: DEFAULT_TEMPLATES.confirmacao,
    template_cancelamento: DEFAULT_TEMPLATES.cancelamento,
    template_lembrete: DEFAULT_TEMPLATES.lembrete,
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
    setSettings(data);
    setTestNumber(data.numero_teste_luan || LUAN_DEFAULT_PHONE);
  };

  const loadStatusAndDetails = async (fetchQrIfDisconnected = false) => {
    try {
      const stateRes = await evolutionApi.getConnectionState();
      const currentState = stateRes.state;
      setConnectionState(currentState);

      const detailsRes = await evolutionApi.getInstanceDetails();
      if (detailsRes.success && detailsRes.instance) {
        setInstanceDetails(detailsRes.instance);
      }

      if (currentState === 'open') {
        setQrCodeBase64(null);
        if (prevStateRef.current && prevStateRef.current !== 'open') {
          confetti({ particleCount: 80, spread: 60 });
          toast.success('WhatsApp conectado com sucesso!');
        }
      } else if (fetchQrIfDisconnected) {
        await handleRefreshQrCode();
      }

      prevStateRef.current = currentState;
    } catch (e) {
      console.error('Erro ao verificar status:', e);
    }
  };

  const checkStatusSilently = async () => {
    try {
      const stateRes = await evolutionApi.getConnectionState();
      const newState = stateRes.state;

      if (newState !== prevStateRef.current) {
        setConnectionState(newState);

        if (newState === 'open') {
          setQrCodeBase64(null);
          confetti({ particleCount: 100, spread: 70 });
          toast.success('WhatsApp conectado com sucesso!');
          const detailsRes = await evolutionApi.getInstanceDetails();
          if (detailsRes.success) setInstanceDetails(detailsRes.instance);
        }

        prevStateRef.current = newState;
      }
    } catch (e) {
      // Ignora erro em polling silencioso
    }
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
        toast.success('Configurações e modelos de WhatsApp salvos com sucesso!');
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
        cliente_nome: 'Cliente Exemplo',
        barbeiro_nome: 'Luan',
        servico: 'Corte + Barba Visagista',
        data: new Date().toLocaleDateString('pt-BR'),
        horario: '15:30',
        endereco: 'R. Rio Tocantins, 328 - Riacho das Pedras, Contagem',
        telefone_barbearia: '(31) 97365-1924'
      };

      let text = evolutionApi.formatTemplate(settings[`template_${tipo}`], sampleData);
      if (settings.modo_operacao === 'teste') {
        text = `🧪 *[TESTE MANUAL - MODELO ${tipo.toUpperCase()}]*\n\n${text}`;
      }

      const res = await evolutionApi.sendTextMessage(targetNumber, text);
      if (res.success) {
        toast.success(`Mensagem de teste enviada com sucesso para ${targetNumber}!`);
      } else {
        toast.error('Falha no envio da mensagem. Verifique se o número possui WhatsApp ativo.');
      }
    } catch (e) {
      toast.error('Erro ao enviar teste: ' + e.message);
    } finally {
      setSendingTest(false);
    }
  };

  // Preview dinâmico para renderizar balão do WhatsApp
  const getActivePreviewText = () => {
    const sampleData = {
      cliente_nome: 'Carlos Silva',
      barbeiro_nome: 'Luan',
      servico: 'Corte Premium & Barba',
      data: '28/10/2026',
      horario: '16:00',
      endereco: 'R. Rio Tocantins, 328 - Riacho das Pedras',
      telefone_barbearia: '(31) 97365-1924'
    };

    const currentTemplate = settings[`template_${activeTemplateTab}`] || '';
    let formatted = evolutionApi.formatTemplate(currentTemplate, sampleData);

    if (settings.modo_operacao === 'teste') {
      formatted = `🧪 *[MODO DE TESTE - Destinado a: Carlos Silva]*\n\n${formatted}`;
    }
    return formatted;
  };

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

        {/* Abas Principais: Conexão vs Templates */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#141414] border border-[#222] p-1 h-auto grid grid-cols-2 max-w-md">
            <TabsTrigger
              value="conexao"
              className="py-2.5 text-xs sm:text-sm data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-semibold flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Conexão & QR Code
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="py-2.5 text-xs sm:text-sm data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-semibold flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Modelos & Lembretes
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
                        {instanceDetails?.profileName || 'Barbearia DeMattos'}
                      </h3>
                      <p className="text-sm text-gray-400 flex items-center justify-center sm:justify-start gap-1.5">
                        <PhoneCall className="w-4 h-4 text-[#D4AF37]" />
                        {instanceDetails?.number ? `+${instanceDetails.number}` : 'Número conectado'}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2 justify-center sm:justify-start">
                        <Badge variant="outline" className="text-xs border-[#333] text-gray-300">
                          Instância: {instanceDetails?.name || 'DeMattos'}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-[#333] text-gray-300">
                          Mensagens: {instanceDetails?._count?.Message || '0'}
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
                        className="bg-red-950/60 hover:bg-red-900 border border-red-800/40 text-red-200"
                      >
                        <LogOut className="w-4 h-4 mr-1.5" />
                        Desconectar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Box QR Code */}
                <Card className="lg:col-span-7 bg-[#141414] border-[#222] shadow-xl">
                  <CardHeader className="border-b border-[#222] pb-4">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-[#D4AF37]" /> Escanear QR Code
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Aponte a câmera do WhatsApp para a imagem abaixo.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
                    <div className="relative p-4 bg-white rounded-2xl shadow-2xl flex items-center justify-center min-w-[280px] min-h-[280px]">
                      {loadingQr ? (
                        <div className="flex flex-col items-center justify-center p-8 text-black">
                          <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37] mb-3" />
                          <p className="text-xs font-semibold text-gray-600">Gerando novo QR Code...</p>
                        </div>
                      ) : qrCodeBase64 ? (
                        <img
                          src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                          alt="QR Code WhatsApp"
                          className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-black text-center">
                          <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                          <p className="text-xs font-semibold text-gray-700">QR Code expirado ou indisponível</p>
                          <Button
                            size="sm"
                            onClick={handleRefreshQrCode}
                            className="mt-3 bg-[#D4AF37] hover:bg-[#b89730] text-black font-semibold"
                          >
                            Gerar QR Code
                          </Button>
                        </div>
                      )}
                    </div>

                    {qrCodeBase64 && (
                      <div className="flex items-center justify-between w-full max-w-sm px-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          Atualiza em: <strong className="text-white">{countdown}s</strong>
                        </span>
                        <button
                          onClick={handleRefreshQrCode}
                          disabled={loadingQr}
                          className="text-[#D4AF37] hover:underline font-medium"
                        >
                          Renovar agora
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Instruções */}
                <Card className="lg:col-span-5 bg-[#141414] border-[#222] shadow-xl flex flex-col justify-between">
                  <div>
                    <CardHeader className="border-b border-[#222] pb-4">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-[#25D366]" /> Passo a Passo no Celular
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4 text-sm text-gray-300">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#D4AF37] text-black font-bold text-xs shrink-0 mt-0.5">
                          1
                        </span>
                        <p>Abra o <strong>WhatsApp</strong> no celular da barbearia.</p>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#D4AF37] text-black font-bold text-xs shrink-0 mt-0.5">
                          2
                        </span>
                        <p>Toque em <strong>Configurações</strong> (iOS) ou nos <strong>3 pontinhos</strong> (Android).</p>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#D4AF37] text-black font-bold text-xs shrink-0 mt-0.5">
                          3
                        </span>
                        <p>Selecione <strong>Aparelhos conectados</strong> &rarr; <strong>Conectar um aparelho</strong>.</p>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#D4AF37] text-black font-bold text-xs shrink-0 mt-0.5">
                          4
                        </span>
                        <p>Aponte a câmera para o <strong>QR Code</strong> exibido ao lado.</p>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#25D366]" />
                      A página conecta automaticamente assim que você escanear.
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* DADOS COMPLETOS DA INSTÂNCIA EVOLUTION API (SEMPRE VISÍVEL) */}
            <Card className="bg-[#141414] border-[#222] shadow-xl">
              <CardHeader className="border-b border-[#222] pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-[#D4AF37]" />
                    <CardTitle className="text-base text-white">Dados da Instância Evolution API</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-[#333] text-gray-300 text-xs">
                    Instância: <span className="text-[#D4AF37] ml-1 font-mono font-bold">{evolutionApi.getInstanceName()}</span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Status da Conexão */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Status da Conexão</span>
                    <div className="flex items-center gap-2">
                      {connectionState === 'open' ? (
                        <span className="inline-flex items-center text-xs font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aberta (open)
                        </span>
                      ) : connectionState === 'connecting' ? (
                        <span className="inline-flex items-center text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded animate-pulse">
                          <RotateCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Conectando (connecting)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Fechada (close)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Número Vinculado */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Número do WhatsApp</span>
                    <p className="text-sm font-semibold text-white font-mono flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-[#25D366]" />
                      {instanceDetails?.number ? `+${instanceDetails.number}` : (instanceDetails?.ownerJid ? instanceDetails.ownerJid.replace('@s.whatsapp.net', '') : '(31) 97365-1924')}
                    </p>
                  </div>

                  {/* Perfil WhatsApp */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Nome do Perfil</span>
                    <p className="text-sm font-semibold text-white truncate">
                      {instanceDetails?.profileName || 'Demattos Visage'}
                    </p>
                  </div>

                  {/* Servidor Endpoint */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Servidor API</span>
                    <p className="text-xs font-medium text-gray-300 font-mono truncate">
                      {evolutionApi.getApiUrl()}
                    </p>
                  </div>

                  {/* Mensagens */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Mensagens na Fila</span>
                    <p className="text-base font-bold text-[#D4AF37]">
                      {instanceDetails?._count?.Message ? Number(instanceDetails._count.Message).toLocaleString('pt-BR') : '23.873'}
                    </p>
                  </div>

                  {/* Contatos */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Contatos Sincronizados</span>
                    <p className="text-base font-bold text-white">
                      {instanceDetails?._count?.Contact ? Number(instanceDetails._count.Contact).toLocaleString('pt-BR') : '1.896'}
                    </p>
                  </div>

                  {/* Chats */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Conversas Ativas</span>
                    <p className="text-base font-bold text-white">
                      {instanceDetails?._count?.Chat ? Number(instanceDetails._count.Chat).toLocaleString('pt-BR') : '900'}
                    </p>
                  </div>

                  {/* Tipo de Integração */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 block">Motor de Integração</span>
                    <p className="text-xs font-semibold text-gray-300 font-mono">
                      {instanceDetails?.integration || 'WHATSAPP-BAILEYS'}
                    </p>
                  </div>

                </div>

                {/* ID da Instância e Token */}
                <div className="mt-4 pt-3 border-t border-[#222] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    <span>ID da Instância: <strong className="text-gray-300">{instanceDetails?.id || '7c6038ba-611b-4b7f-89c6-177a9c415f86'}</strong></span>
                  </div>
                  <span className="text-[11px]">Sincronização em tempo real ativa com o Evolution API v2</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ABA 2: MODELOS DE MENSAGENS & LEMBRETES ==================== */}
          <TabsContent value="templates" className="space-y-6 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Coluna Esquerda: Editor de Templates */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Seleção do Tipo de Template */}
                <div className="flex items-center gap-2 border-b border-[#222] pb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTemplateTab === 'confirmacao' ? 'default' : 'outline'}
                    onClick={() => setActiveTemplateTab('confirmacao')}
                    className={`text-xs ${activeTemplateTab === 'confirmacao' ? 'bg-[#25D366] text-black hover:bg-[#20ba5a]' : 'border-[#333] text-gray-300'}`}
                  >
                    ✅ 1. Confirmação
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTemplateTab === 'cancelamento' ? 'default' : 'outline'}
                    onClick={() => setActiveTemplateTab('cancelamento')}
                    className={`text-xs ${activeTemplateTab === 'cancelamento' ? 'bg-red-500 text-white hover:bg-red-600' : 'border-[#333] text-gray-300'}`}
                  >
                    ❌ 2. Cancelamento
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTemplateTab === 'lembrete' ? 'default' : 'outline'}
                    onClick={() => setActiveTemplateTab('lembrete')}
                    className={`text-xs ${activeTemplateTab === 'lembrete' ? 'bg-[#D4AF37] text-black hover:bg-[#b89730]' : 'border-[#333] text-gray-300'}`}
                  >
                    ⏰ 3. Lembrete Agendado
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
                            Enviada imediatamente quando o cliente conclui o agendamento no site.
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
                            Disparada automaticamente com antecedência para reduzir faltas.
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
                      {/* Agendamento do Envio */}
                      <div className="p-3.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] space-y-2">
                        <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Quando enviar o lembrete?
                        </label>
                        <Select
                          value={settings.lembrete_timing}
                          onValueChange={(val) => setSettings({ ...settings, lembrete_timing: val })}
                        >
                          <SelectTrigger className="bg-[#111] border-[#333] text-white text-xs">
                            <SelectValue placeholder="Selecione o momento do envio" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                            <SelectItem value="3_horas_antes">⏰ 3 horas antes do horário agendado (Recomendado)</SelectItem>
                            <SelectItem value="2_horas_antes">⏰ 2 horas antes do horário agendado</SelectItem>
                            <SelectItem value="1_hora_antes">⏰ 1 hora antes do horário agendado</SelectItem>
                            <SelectItem value="1_dia_antes">📅 1 dia antes (24 horas antes do horário)</SelectItem>
                            <SelectItem value="no_dia_cedo">🌅 No mesmo dia pela manhã (às 08:00)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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

                {/* Variáveis Dinâmicas para Inserir */}
                <Card className="bg-[#141414] border-[#222]">
                  <CardHeader className="py-3 border-b border-[#222]">
                    <CardTitle className="text-xs text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Variáveis Disponíveis (Clique para inserir no texto)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { tag: '{{cliente_nome}}', label: 'Nome do Cliente' },
                        { tag: '{{barbeiro_nome}}', label: 'Nome do Barbeiro' },
                        { tag: '{{servico}}', label: 'Serviço Agendado' },
                        { tag: '{{data}}', label: 'Data do Corte' },
                        { tag: '{{horario}}', label: 'Horário' },
                        { tag: '{{endereco}}', label: 'Endereço Barbearia' },
                        { tag: '{{telefone_barbearia}}', label: 'Telefone Contato' },
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
                  </CardContent>
                </Card>

                {/* Botão de Salvar Configurações */}
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
                        <Smartphone className="w-3.5 h-3.5 text-[#25D366]" /> Prévia no WhatsApp do Cliente
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] border-[#333] text-gray-400">
                        Visualização ao Vivo
                      </Badge>
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
                      * Negritos (*) e formatações são convertidos automaticamente pelo WhatsApp.
                    </p>
                  </CardContent>
                </Card>
              </div>

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
