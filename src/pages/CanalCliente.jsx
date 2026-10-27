import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ErrorBoundary';
import PrivateRoute from '@/components/auth/PrivateRoute';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { User, Calendar, Clock, ArrowLeft, Edit, Star, Plus, Send, CheckCircle, XCircle, Trash2, Sparkles, Ban, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { createSafariDate } from '@/lib/SafariCompat';
import { toast } from 'sonner';
import DeMattosIA from '../components/canal/DeMattosIA';
import AgendamentoRecorrente from '../components/canal/AgendamentoRecorrente';
import ComprarCreditos from '../components/ComprarCreditos';
import ProdutosDigitaisComprados from '../components/canal/ProdutosDigitaisComprados';
import AgendamentoForm from '../components/AgendamentoForm';
import DeleteAccountSection from '../components/DeleteAccountSection';

function CanalClienteContent() {
  const { cliente: clienteAuth, logout: authContextLogout } = useAuth();
  const [cliente, setCliente] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [depoimentos, setDepoimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [depoimentoDialogOpen, setDepoimentoDialogOpen] = useState(false);
  const [editingDepoimento, setEditingDepoimento] = useState(null);
  const [editData, setEditData] = useState({
    nome: '',
    telefone: '',
    data_nascimento: '',
    profissao: '',
    instagram: '',
    facebook: '',
    foto_url: '',
  });
  const [depoimentoData, setDepoimentoData] = useState({
    texto: '',
    avaliacao: 5,
  });
  const [mostrarDeMattos, setMostrarDeMattos] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(true);
  const [depoimentosAberto, setDepoimentosAberto] = useState(false);
  const [agendamentosAberto, setAgendamentosAberto] = useState(false);
  const [agendamentoRecorrenteAberto, setAgendamentoRecorrenteAberto] = useState(false);
  const [comprarCreditosOpen, setComprarCreditosOpen] = useState(false);
  const [produtosDigitaisAberto, setProdutosDigitaisAberto] = useState(false);
  const [novoAgendamentoAberto, setNovoAgendamentoAberto] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const queryClient = useQueryClient();

  // ✅ PROTEÇÃO: React Query com tratamento robusto e staleTime otimizado
  const { data: userCredits = 0, refetch: refetchCredits, isLoading: loadingCredits } = useQuery({
    queryKey: ['user-credits', cliente?.id],
    queryFn: async () => {
      if (!cliente?.id) return cliente?.ai_credits ?? 0;
      try {
        const clientes = await base44.entities.Cliente.filter({ id: cliente.id });
        // ✅ Verificação segura do array antes de acessar
        if (Array.isArray(clientes) && clientes.length > 0 && clientes[0]) {
          return clientes[0]?.ai_credits ?? 0;
        }
        return cliente?.ai_credits ?? 0;
      } catch (error) {
        // ✅ Captura erros silenciosamente e retorna fallback
        console.error('Erro ao buscar créditos:', error);
        return cliente?.ai_credits ?? 0;
      }
    },
    enabled: !!cliente?.id,
    staleTime: 5 * 60 * 1000, // ✅ Aumentado de 1 para 5 minutos para evitar rate limits
    retry: 1,
  });

  // ✅ PROTEÇÃO: Inicialização robusta com tratamento seguro de respostas
  useEffect(() => {
    const initializeData = async () => {
      try {
        let clienteData = clienteAuth;
        
        // Se o AuthContext ainda não tem o cliente, buscar
        if (!clienteData) {
          try {
            const response = await base44.functions.invoke('syncUserCliente');
            // ✅ Optional chaining seguro para evitar crash em respostas mal formadas
            if (response?.data?.success && response?.data?.cliente) {
              clienteData = response.data.cliente;
            }
          } catch (fetchError) {
            // ✅ Captura erro de sincronização e continua com clienteAuth
            console.error('Erro ao sincronizar cliente:', fetchError);
          }
        }

        if (clienteData && typeof clienteData === 'object') {
          setCliente(clienteData);
          setEditData({
            nome: clienteData?.nome ?? '',
            telefone: clienteData?.telefone ?? '',
            data_nascimento: clienteData?.data_nascimento ?? '',
            profissao: clienteData?.profissao ?? '',
            instagram: clienteData?.instagram ?? '',
            facebook: clienteData?.facebook ?? '',
            foto_url: clienteData?.foto_url ?? '',
          });
          await loadAgendamentos();
          await loadDepoimentos();
        }
      } catch (error) {
        // ✅ Captura erros e exibe toast amigável
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados do cliente');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [clienteAuth]);

  // ✅ PROTEÇÃO: Tratamento robusto com optional chaining e fallback
  const loadAgendamentos = async () => {
    try {
      const response = await base44.functions.invoke('buscarAgendamentosCliente');
      // ✅ Optional chaining seguro para evitar crash
      if (response?.data?.success && Array.isArray(response?.data?.agendamentos)) {
        setAgendamentos(response.data.agendamentos);
      } else {
        setAgendamentos([]);
      }
    } catch (error) {
      // ✅ Captura erros e retorna array vazio
      console.error('Erro ao buscar agendamentos:', error);
      setAgendamentos([]);
    }
  };

  // ✅ PROTEÇÃO: Tratamento robusto com optional chaining e fallback
  const loadDepoimentos = async () => {
    try {
      const response = await base44.functions.invoke('getMeusDepoimentos');
      // ✅ Optional chaining seguro para evitar crash
      if (response?.data?.success && Array.isArray(response?.data?.depoimentos)) {
        setDepoimentos(response.data.depoimentos);
      } else {
        setDepoimentos([]);
      }
    } catch (error) {
      // ✅ Captura erros e retorna array vazio
      console.error('Erro ao carregar depoimentos:', error);
      setDepoimentos([]);
    }
  };

  const handleLogout = () => {
    authContextLogout(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditData({ ...editData, foto_url: file_url });
      
      // Atualizar a foto no cliente atual imediatamente para preview
      setCliente({ ...cliente, foto_url: file_url });
    } catch (error) {
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  // ✅ PROTEÇÃO: Tratamento robusto com optional chaining e validação de resposta
  const handleSaveProfile = async () => {
    try {
      // Atualizar perfil via backend (seguro)
      const response = await base44.functions.invoke('atualizarPerfilCliente', {
        email: cliente?.email,
        dadosAtualizacao: editData
      });

      // ✅ Verificação segura de erro e sucesso
      if (response?.data?.error) {
        toast.error(response.data.error);
        return;
      }

      // ✅ Validação segura antes de desestruturar
      const updatedCliente = response?.data?.cliente;
      if (updatedCliente && typeof updatedCliente === 'object') {
        const { senha_canal, ...clienteSemSenha } = updatedCliente;
        setCliente(clienteSemSenha);
        await loadDepoimentos();
        setEditDialogOpen(false);
        toast.success('Perfil atualizado com sucesso!');
      } else {
        toast.error('Resposta inválida do servidor');
      }
    } catch (error) {
      // ✅ Captura erros e exibe toast amigável
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const handleOpenDepoimentoDialog = (depoimento = null) => {
    if (depoimento) {
      setEditingDepoimento(depoimento);
      setDepoimentoData({
        texto: depoimento.texto,
        avaliacao: depoimento.avaliacao,
      });
    } else {
      setEditingDepoimento(null);
      setDepoimentoData({
        texto: '',
        avaliacao: 5,
      });
    }
    setDepoimentoDialogOpen(true);
  };

  // ✅ PROTEÇÃO: Tratamento robusto com validação e optional chaining
  const handleSaveDepoimento = async () => {
    if (!depoimentoData.texto || depoimentoData.texto.trim().length < 10) {
      toast.error('O depoimento deve ter no mínimo 10 caracteres.');
      return;
    }

    try {
      let response;
      if (editingDepoimento) {
        response = await base44.functions.invoke('atualizarDepoimento', {
          depoimento_id: editingDepoimento?.id,
          cliente_id: cliente?.id,
          texto: depoimentoData.texto,
          avaliacao: depoimentoData.avaliacao,
        });
      } else {
        response = await base44.functions.invoke('criarDepoimento', {
          cliente_id: cliente?.id,
          texto: depoimentoData.texto,
          avaliacao: depoimentoData.avaliacao,
        });
      }

      // ✅ Verificação segura de erro
      if (response?.data?.error) {
        toast.error(response.data.error);
        return;
      }

      await loadDepoimentos();
      setDepoimentoDialogOpen(false);
      setEditingDepoimento(null);
      toast.success('Depoimento salvo com sucesso!');
    } catch (error) {
      // ✅ Captura erros e exibe toast amigável
      console.error('Erro ao salvar depoimento:', error);
      toast.error('Erro ao salvar depoimento');
    }
  };

  // ✅ PROTEÇÃO: Tratamento robusto com optional chaining
  const handleToggleEnviarAprovacao = async (depoimento) => {
    try {
      const response = await base44.functions.invoke('toggleEnvioDepoimento', {
        depoimento_id: depoimento?.id,
        cliente_id: cliente?.id
      });

      // ✅ Verificação segura de erro
      if (response?.data?.error) {
        toast.error(response.data.error);
        return;
      }

      await loadDepoimentos();
      toast.success(depoimento?.enviado_para_aprovacao ? 'Envio cancelado' : 'Enviado para aprovação');
    } catch (error) {
      // ✅ Captura erros e exibe toast amigável
      console.error('Erro ao atualizar depoimento:', error);
      toast.error('Erro ao atualizar depoimento');
    }
  };

  const handleDeleteDepoimento = async (id) => {
    setConfirmAction({
      type: 'deleteDepoimento',
      id: id,
      message: 'Deseja realmente excluir este depoimento?'
    });
    setConfirmDialogOpen(true);
  };

  // ✅ PROTEÇÃO: Tratamento robusto com validação de tipos e optional chaining
  const executeConfirmAction = async () => {
    if (!confirmAction || !confirmAction.type) return;

    try {
      if (confirmAction.type === 'deleteDepoimento') {
        const response = await base44.functions.invoke('excluirDepoimento', {
          depoimento_id: confirmAction?.id,
          cliente_id: cliente?.id
        });

        // ✅ Verificação segura de erro
        if (response?.data?.error) {
          toast.error(response.data.error);
          setConfirmDialogOpen(false);
          return;
        }

        await loadDepoimentos();
        toast.success('Depoimento excluído!');
      } else if (confirmAction.type === 'cancelarAgendamento') {
        const response = await base44.functions.invoke('cancelarMeuAgendamento', {
          agendamento_id: confirmAction?.id
        });

        // ✅ Verificação segura de erro
        if (response?.data?.error) {
          toast.error(response.data.error);
          setConfirmDialogOpen(false);
          return;
        }

        await loadAgendamentos();
        queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
        toast.success('Agendamento cancelado com sucesso!');
      }
    } catch (error) {
      // ✅ Captura erros e exibe toast amigável
      console.error('Erro ao executar ação:', error);
      toast.error('Erro ao executar ação');
    } finally {
      setConfirmDialogOpen(false);
      setConfirmAction(null);
    }
  };

  const podeCancelarAgendamento = (agendamento) => {
    if (agendamento.status === 'cancelado' || agendamento.status === 'realizado') {
      return false;
    }

    if (!agendamento.data || !agendamento.horario) {
      return false;
    }

    const agora = new Date();
    const dataHoraAgendamento = createSafariDate(`${agendamento.data}T${agendamento.horario}`);

    // Verifica se a data é válida
    if (isNaN(dataHoraAgendamento.getTime())) {
      return false;
    }

    // Verifica se o agendamento é futuro e tem pelo menos 90 minutos de antecedência
    const diferencaEmMinutos = (dataHoraAgendamento - agora) / (1000 * 60);
    return diferencaEmMinutos >= 90;
  };

  const handleCancelarAgendamento = async (agendamento) => {
    setConfirmAction({
      type: 'cancelarAgendamento',
      id: agendamento.id,
      message: 'Deseja realmente cancelar este agendamento?'
    });
    setConfirmDialogOpen(true);
  };

  const statusColors = {
    pendente: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    confirmado: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    realizado: 'bg-green-500/20 text-green-500 border-green-500/30',
    cancelado: 'bg-red-500/20 text-red-500 border-red-500/30',
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando...</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0a]">
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {confirmAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 safe-area-bottom">
            <AlertDialogCancel className="bg-transparent border-[#2a2a2a] text-white hover:bg-[#2a2a2a] touch-manipulation">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmAction}
              className="bg-red-500 hover:bg-red-600 text-white touch-manipulation"
            >
              Confirmar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white flex-shrink-0">
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate" style={{ fontFamily: 'Georgia, serif' }}>
                  Olá, <span className="text-[#D4AF37]">{cliente.nome.split(' ')[0]}</span>
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">Bem-vindo ao seu Canal DeMattos</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs sm:text-sm px-3 sm:px-4 flex-shrink-0 touch-manipulation"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* DeMattos IA - Card Único */}
        <Card className="bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/30 mb-4 sm:mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#D4AF37] rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-xl font-bold text-white mb-1">DeMattos IA</h3>
                  <p className="text-gray-300 text-xs sm:text-sm mb-2">
                    Análise de visagismo com IA
                  </p>
                  <p className="text-gray-300 text-xs sm:text-sm">
                    Saldo: <span className={`font-bold ${userCredits <= 0 ? 'text-red-400' : 'text-[#D4AF37]'}`}>{userCredits} créditos</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
                <Button
                  onClick={() => setComprarCreditosOpen(true)}
                  className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation"
                >
                  Comprar
                </Button>
                <Button
                  onClick={() => setMostrarDeMattos(!mostrarDeMattos)}
                  className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation"
                >
                  {mostrarDeMattos ? 'Fechar' : 'Abrir'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat DeMattos - Modal Centralizado */}
        {mostrarDeMattos && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
            <Card className="bg-[#1a1a1a] border-[#D4AF37]/30 w-full max-w-4xl h-[95vh] sm:h-[85vh] flex flex-col relative">
              <Button
                onClick={() => setMostrarDeMattos(false)}
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
              <DeMattosIA cliente={cliente} />
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Profile Card */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4 sm:p-6 touch-manipulation" onClick={() => setPerfilAberto(!perfilAberto)}>
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                Meu Perfil
                {perfilAberto ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </CardTitle>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <DialogHeader>
                    <DialogTitle>Editar Perfil</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Foto de Perfil</label>
                      <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                      {uploading && <p className="text-xs text-gray-400 mt-1">Enviando...</p>}
                      {editData.foto_url && (
                        <img src={editData.foto_url} alt="Preview" className="w-20 h-20 rounded-full mt-3 object-cover" />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nome Completo</label>
                      <Input
                      value={editData.nome}
                      onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                      placeholder="Seu nome completo"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-base"
                      />
                      </div>
                      <div>
                      <label className="text-sm font-medium mb-2 block">Telefone</label>
                      <Input
                      value={editData.telefone}
                      onChange={(e) => setEditData({ ...editData, telefone: e.target.value })}
                      placeholder="(31) 99999-9999"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-base"
                      />
                      </div>
                      <div>
                      <label className="text-sm font-medium mb-2 block">Data de Nascimento</label>
                      <Input
                      type="date"
                      value={editData.data_nascimento}
                      onChange={(e) => setEditData({ ...editData, data_nascimento: e.target.value })}
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-base"
                      />
                      </div>
                      <div>
                      <label className="text-sm font-medium mb-2 block">Profissão</label>
                      <Input
                      value={editData.profissao}
                      onChange={(e) => setEditData({ ...editData, profissao: e.target.value })}
                      placeholder="Ex: Engenheiro"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-base"
                      />
                      </div>
                      <div>
                      <label className="text-sm font-medium mb-2 block">Instagram</label>
                      <Input
                      value={editData.instagram}
                      onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                      placeholder="@instagram"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-base"
                      />
                      </div>
                      <div>
                      <label className="text-sm font-medium mb-2 block">Facebook</label>
                      <Input
                      value={editData.facebook}
                      onChange={(e) => setEditData({ ...editData, facebook: e.target.value })}
                      placeholder="Perfil do Facebook"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-base"
                      />
                    </div>

                    <div className="border-t border-[#2a2a2a] pt-4 mt-6">
                      <p className="text-sm text-gray-400">
                        Para alterar sua senha, use a opção "Esqueci minha senha" na página de login.
                      </p>
                    </div>

                    <DeleteAccountSection clienteEmail={cliente.email} />

                    <div className="flex justify-end gap-3 pt-4 safe-area-bottom">
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-[#2a2a2a] touch-manipulation">
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveProfile} className="bg-[#D4AF37] hover:bg-[#B8973D] text-black touch-manipulation">
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            {perfilAberto && (
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                {cliente.foto_url ? (
                  <img src={cliente.foto_url} alt={cliente.nome} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                    <User className="w-7 h-7 sm:w-8 sm:h-8 text-[#D4AF37]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium text-sm sm:text-base truncate">{cliente.nome}</p>
                  {cliente.profissao && <p className="text-gray-400 text-xs sm:text-sm truncate">{cliente.profissao}</p>}
                  <p className="text-gray-400 text-xs sm:text-sm truncate">{cliente.email}</p>
                </div>
              </div>
              <div className="border-t border-[#2a2a2a] pt-4 space-y-2 text-xs sm:text-sm">
                <p className="text-gray-400 break-all">
                  <span className="text-white">Telefone:</span> {cliente.telefone}
                </p>
                {cliente.instagram && (
                  <p className="text-gray-400 break-all">
                    <span className="text-white">Instagram:</span> {cliente.instagram}
                  </p>
                )}
                {cliente.facebook && (
                  <p className="text-gray-400 break-all">
                    <span className="text-white">Facebook:</span> {cliente.facebook}
                  </p>
                )}
              </div>
            </CardContent>
            )}
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Novo Agendamento */}
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader 
                className="flex flex-row items-center justify-between cursor-pointer p-4 sm:p-6 touch-manipulation" 
                onClick={() => setNovoAgendamentoAberto(!novoAgendamentoAberto)}
              >
                <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                  Novo Agendamento
                  {novoAgendamentoAberto ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                </CardTitle>
              </CardHeader>
              {novoAgendamentoAberto && (
                <CardContent className="p-4 sm:p-6">
                  <AgendamentoForm 
                    clientePreenchido={{
                      nome: cliente.nome,
                      telefone: cliente.telefone,
                      email: cliente.email
                    }}
                    onSuccess={() => {
                      loadAgendamentos();
                      setNovoAgendamentoAberto(false);
                    }}
                  />
                </CardContent>
              )}
            </Card>

            {/* Agendamento Recorrente */}
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader 
                className="flex flex-row items-center justify-between cursor-pointer p-4 sm:p-6 touch-manipulation" 
                onClick={() => setAgendamentoRecorrenteAberto(!agendamentoRecorrenteAberto)}
              >
                <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                  Agendamento Recorrente
                  {agendamentoRecorrenteAberto ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                </CardTitle>
              </CardHeader>
              {agendamentoRecorrenteAberto && (
                <CardContent>
                  <AgendamentoRecorrente cliente={cliente} />
                </CardContent>
              )}
            </Card>

            {/* Depoimentos */}
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer touch-manipulation" onClick={() => setDepoimentosAberto(!depoimentosAberto)}>
                <CardTitle className="text-white flex items-center gap-2">
                  Meus Depoimentos
                  {depoimentosAberto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CardTitle>
                <Dialog open={depoimentoDialogOpen} onOpenChange={setDepoimentoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDepoimentoDialog();
                      }}
                      className="bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Depoimento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                    <DialogHeader>
                      <DialogTitle>{editingDepoimento ? 'Editar Depoimento' : 'Novo Depoimento'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Sua Avaliação</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setDepoimentoData({ ...depoimentoData, avaliacao: star })}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`w-8 h-8 ${
                                  star <= depoimentoData.avaliacao
                                    ? 'fill-[#D4AF37] text-[#D4AF37]'
                                    : 'text-gray-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Seu Depoimento</label>
                        <Textarea
                          value={depoimentoData.texto}
                          onChange={(e) => setDepoimentoData({ ...depoimentoData, texto: e.target.value })}
                          placeholder="Conte sua experiência na Barbearia DeMattos..."
                          rows={5}
                          className="bg-[#0a0a0a] border-[#2a2a2a] resize-none text-base"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-4 safe-area-bottom">
                        <Button variant="outline" onClick={() => setDepoimentoDialogOpen(false)} className="border-[#2a2a2a] touch-manipulation">
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveDepoimento} className="bg-[#D4AF37] hover:bg-[#B8973D] text-black touch-manipulation">
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              {depoimentosAberto && (
              <CardContent>
                {depoimentos.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum depoimento criado ainda</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Compartilhe sua experiência conosco!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {depoimentos.map((depoimento) => (
                      <div
                        key={depoimento.id}
                        className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < depoimento.avaliacao
                                    ? 'fill-[#D4AF37] text-[#D4AF37]'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDepoimentoDialog(depoimento)}
                              className="text-gray-400 hover:text-white h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDepoimento(depoimento.id)}
                              className="text-red-500 hover:text-red-600 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                          "{depoimento.texto}"
                        </p>

                        <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
                          <div className="text-xs">
                            {depoimento.aprovado ? (
                              <span className="text-green-500 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Aprovado e visível
                              </span>
                            ) : depoimento.enviado_para_aprovacao ? (
                              <span className="text-yellow-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Aguardando aprovação
                              </span>
                            ) : (
                              <span className="text-gray-500 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Não enviado
                              </span>
                            )}
                          </div>
                          <Button
                            onClick={() => handleToggleEnviarAprovacao(depoimento)}
                            size="sm"
                            className={
                              depoimento.enviado_para_aprovacao
                                ? 'bg-gray-600/10 hover:bg-gray-600/20 text-gray-400 border border-gray-600/30'
                                : 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                            }
                          >
                            {depoimento.enviado_para_aprovacao ? (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancelar Envio
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar para Aprovação
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              )}
            </Card>

            {/* Produtos Digitais Comprados */}
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader className="cursor-pointer touch-manipulation" onClick={() => setProdutosDigitaisAberto(!produtosDigitaisAberto)}>
                <CardTitle className="text-white flex items-center gap-2">
                  Meus Produtos Digitais
                  {produtosDigitaisAberto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
              {produtosDigitaisAberto && (
                <CardContent>
                  <ProdutosDigitaisComprados clienteEmail={cliente.email} />
                </CardContent>
              )}
            </Card>

            {/* Agendamentos */}
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader className="cursor-pointer touch-manipulation" onClick={() => setAgendamentosAberto(!agendamentosAberto)}>
                <CardTitle className="text-white flex items-center gap-2">
                  Meus Agendamentos
                  {agendamentosAberto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
              {agendamentosAberto && (
              <CardContent>
                {agendamentos.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum agendamento encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agendamentos.map((agendamento) => {
                      const podeCancelar = podeCancelarAgendamento(agendamento);
                      return (
                        <div
                          key={agendamento.id}
                          className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-white font-semibold">{agendamento.servico}</h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {agendamento.data ? format(createSafariDate(agendamento.data), 'dd/MM/yyyy') : 'Data não definida'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {agendamento.horario || 'Horário não definido'}
                                </span>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[agendamento.status]}`}>
                              {agendamento.status}
                            </span>
                          </div>
                          {agendamento.observacoes && (
                            <p className="text-gray-400 text-sm border-t border-[#2a2a2a] pt-3 mb-3">
                              {agendamento.observacoes}
                            </p>
                          )}
                          {podeCancelar && (
                            <div className="border-t border-[#2a2a2a] pt-3">
                              <Button
                                onClick={() => handleCancelarAgendamento(agendamento)}
                                size="sm"
                                variant="outline"
                                className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10"
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Cancelar Agendamento
                              </Button>
                              <p className="text-xs text-gray-500 text-center mt-2">
                                Você pode cancelar até 90 minutos antes do horário
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
      {/* Espaço para não ficar escondido atrás do menu inferior no mobile */}
      <div className="h-24 md:h-0" />

      {/* Modal Comprar Créditos */}
      <ComprarCreditos 
        open={comprarCreditosOpen} 
        onOpenChange={setComprarCreditosOpen}
        onSuccess={() => {
          refetchCredits();
          setComprarCreditosOpen(false);
        }}
      />
      </div>
      </ErrorBoundary>
  );
}

export default function CanalCliente() {
  return (
    <PrivateRoute>
      <CanalClienteContent />
    </PrivateRoute>
  );
}