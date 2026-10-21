import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export function useAgendamento() {
  const { cliente, user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    servicos_ids: [],
    profissional_id: '',
    data: '',
    horario: '',
    message: '',
    instagram: '',
    facebook: '',
    senhaCanal: '',
  });

  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [clienteExistenteLocal, setClienteExistenteLocal] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [verificandoCliente, setVerificandoCliente] = useState(false);

  const mountedRef = useRef(true);
  const userInteractedRef = useRef(false);
  const autoSelectDoneRef = useRef(false);
  const initialLoadDoneRef = useRef(true); // Não suprime toasts — carga inicial é imediata agora

  // Reutilizar dados do home-data (única chamada) — se já estiver no cache, não faz chamada extra
  const { data: homeData } = useQuery({
    queryKey: ['home-data'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getHomeData', {});
      return response.data?.success ? response.data : null;
    },
    retry: 2,
    retryDelay: 1500,
    staleTime: 5 * 60 * 1000,
  });

  const profissionais = React.useMemo(() => {
    const profs = homeData?.profissionais || [];
    return profs.filter(p => p && p.id);
  }, [homeData]);

  const loadingProfissionais = !homeData;

  const servicos = homeData?.servicos || [];

  // Mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Derivar se o usuário está logado e se temos dados de cliente
  const usuarioLogado = user || null;
  const clienteExistente = cliente || clienteExistenteLocal || null;

  // Preencher formulário quando user/cliente do AuthContext ficarem disponíveis
  useEffect(() => {
    if (!mountedRef.current) return;

    if (user && cliente) {
      setFormData(prev => ({
        ...prev,
        name: cliente.nome || user.full_name || prev.name,
        email: cliente.email || user.email || prev.email,
        phone: cliente.telefone || prev.phone,
      }));
    } else if (user && !cliente) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.full_name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user, cliente]);

  // Serviços pré-selecionados via sessionStorage (uma vez no mount)
  useEffect(() => {
    const servicosPreSelecionados = sessionStorage.getItem('servicosSelecionados');
    if (servicosPreSelecionados) {
      try {
        const ids = JSON.parse(servicosPreSelecionados);
        if (Array.isArray(ids)) {
          setFormData(prev => ({ ...prev, servicos_ids: ids }));
        }
      } catch (e) {}
      sessionStorage.removeItem('servicosSelecionados');
    }
  }, []);

  // Auto-selecionar primeiro profissional assim que carregar (sem buscar datas/horários)
  useEffect(() => {
    if (loadingProfissionais || !profissionais || profissionais.length === 0) return;
    if (formData.profissional_id) return;
    if (userInteractedRef.current) return;
    if (autoSelectDoneRef.current) return;

    const prof = profissionais[0];
    if (!prof || !prof.id) return;

    autoSelectDoneRef.current = true;
    initialLoadDoneRef.current = true;
    setFormData(prev => ({
      ...prev,
      profissional_id: prof.id,
    }));
  }, [profissionais, loadingProfissionais]);

  // Carregar horários via função pública (funciona sem autenticação)
  const carregarHorarios = useCallback(async (profissionalId, data) => {
    if (!profissionalId || !data || !mountedRef.current) return;

    setLoadingHorarios(true);
    setHorariosDisponiveis([]);

    try {
      const response = await base44.functions.invoke('getHorariosDisponiveis', {
        profissional_id: profissionalId,
        data: data
      });

      if (!mountedRef.current) return;

      if (response.data?.success) {
        setHorariosDisponiveis(response.data.horarios || []);
      } else {
        setHorariosDisponiveis([]);
      }
      initialLoadDoneRef.current = true;
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      if (mountedRef.current) {
        setHorariosDisponiveis([]);
        // Só mostra toast de erro após a carga inicial estar completa
        if (initialLoadDoneRef.current) {
          toast.error('Erro ao carregar horários disponíveis');
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoadingHorarios(false);
      }
    }
  }, []);

  // Trigger de carregamento de horários quando profissional ou data mudam
  useEffect(() => {
    if (!formData.profissional_id || !formData.data) return;

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        carregarHorarios(formData.profissional_id, formData.data);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [formData.profissional_id, formData.data, carregarHorarios]);

  // Recarregar horários quando o usuário volta para a aba/app (ex: fechou e voltou)
  useEffect(() => {
    if (!formData.profissional_id || !formData.data) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialLoadDoneRef.current) {
        carregarHorarios(formData.profissional_id, formData.data);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [formData.profissional_id, formData.data, carregarHorarios]);

  // Auto-selecionar primeiro horário disponível
  useEffect(() => {
    if (!horariosDisponiveis || horariosDisponiveis.length === 0) return;
    if (formData.horario && horariosDisponiveis.some(h => h.horario === formData.horario)) return;

    setFormData(prev => ({
      ...prev,
      horario: horariosDisponiveis[0].horario
    }));
  }, [horariosDisponiveis]);

  // Verificar cliente por telefone (apenas visitantes não logados)
  const verificarCliente = useCallback(async () => {
    if (!formData.phone || formData.phone.length < 10 || user) return;

    setVerificandoCliente(true);
    try {
      const response = await base44.functions.invoke('verificarClientePorTelefone', {
        telefone: formData.phone
      });

      if (response.data.success && response.data.cliente) {
        setClienteExistenteLocal(response.data.cliente);
        setFormData(prev => ({
          ...prev,
          name: response.data.cliente.nome,
          email: response.data.cliente.email || prev.email,
        }));
      } else {
        setClienteExistenteLocal(null);
      }
    } catch (error) {
      setClienteExistenteLocal(null);
    } finally {
      setVerificandoCliente(false);
    }
  }, [formData.phone, user]);

  useEffect(() => {
    if (formData.phone && formData.phone.length >= 10 && !user) {
      const timer = setTimeout(verificarCliente, 500);
      return () => clearTimeout(timer);
    } else if (!user) {
      setClienteExistenteLocal(null);
    }
  }, [formData.phone, user, verificarCliente]);

  // Submit do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();

    const erros = [];
    if (!formData.name?.trim()) erros.push('Nome completo');
    if (!formData.phone?.trim()) erros.push('WhatsApp/Telefone');
    if (!formData.email?.trim()) erros.push('Email');
    if (!formData.profissional_id) erros.push('Profissional');
    if (!formData.data) erros.push('Data');
    if (!formData.horario) erros.push('Horário');
    if (!formData.servicos_ids || formData.servicos_ids.length === 0) erros.push('Serviços');

    if (erros.length > 0) {
      toast.error(`Faltam os seguintes campos: ${erros.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      const response = await base44.functions.invoke('criarAgendamentoPublico', { formData });

      if (response?.data?.error) {
        toast.error(response.data.error);
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        if (mountedRef.current) {
          setSubmitted(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 2000);
    } catch (error) {
      console.error('Erro no submit:', error);
      toast.error('Erro ao criar agendamento. Por favor, tente novamente.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const refreshHorarios = useCallback(() => {
    if (formData.profissional_id && formData.data) {
      carregarHorarios(formData.profissional_id, formData.data);
    }
  }, [formData.profissional_id, formData.data, carregarHorarios]);

  return {
    formData,
    setFormData,
    horariosDisponiveis,
    clienteExistente,
    usuarioLogado,
    submitted,
    loading,
    loadingHorarios,
    verificandoCliente,
    profissionais,
    servicos,
    handleSubmit,
    userInteractedRef,
    refreshHorarios,
  };
}