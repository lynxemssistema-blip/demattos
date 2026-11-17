import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, AlertCircle, Info, Loader2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import SafeDateInput from '@/components/form/SafeDateInput';
import SearchableSelect from '@/components/ui/searchable-select';
import { isValidSafariDate } from '@/lib/SafariCompat';
import { getBrazilDateString } from '@/lib/brazilTime';

export default function AgendamentoForm({ onSuccess, clientePreenchido, isAdmin, preSelectedData }) {
  const [clientes, setClientes] = useState([]);
  const [modoNovoClienteAdmin, setModoNovoClienteAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const queryClient = useQueryClient();

  // Queries dedicadas e resilientes (evitam depender das 11 queries simultâneas do getHomeData no mobile e nunca cacheiam lista vazia em falha de rede)
  const { data: profissionaisData, isLoading: loadingProfissionais } = useQuery({
    queryKey: ['agendamento-profissionais-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profissional')
        .select('id, nome, foto_url, especialidades, ativo')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    initialData: () => {
      const cachedProfs = queryClient.getQueryData(['profissionais']);
      if (Array.isArray(cachedProfs) && cachedProfs.length > 0) {
        return cachedProfs.filter(p => p && p.id && p.ativo !== false);
      }
      const cachedHome = queryClient.getQueryData(['home-data']);
      if (Array.isArray(cachedHome?.profissionais) && cachedHome.profissionais.length > 0) {
        return cachedHome.profissionais.filter(p => p && p.id);
      }
      return undefined;
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 2 * 60 * 1000,
  });

  const { data: servicosData, isLoading: loadingServicos } = useQuery({
    queryKey: ['agendamento-servicos-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servico')
        .select('id, nome, duracao, preco, ativo')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    initialData: () => {
      const cachedServs = queryClient.getQueryData(['servicos']);
      if (Array.isArray(cachedServs) && cachedServs.length > 0) {
        return cachedServs.filter(s => s && s.id && s.ativo !== false);
      }
      const cachedHome = queryClient.getQueryData(['home-data']);
      if (Array.isArray(cachedHome?.servicos) && cachedHome.servicos.length > 0) {
        return cachedHome.servicos.filter(s => s && s.id);
      }
      return undefined;
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 2 * 60 * 1000,
  });

  const profissionais = useMemo(() => {
    return (profissionaisData || []).filter(p => p && p.id);
  }, [profissionaisData]);

  const servicos = useMemo(() => {
    return (servicosData || []).filter(s => s && s.id);
  }, [servicosData]);

  const [formData, setFormData] = useState({
    cliente_id: '',
    cliente_nome: clientePreenchido?.nome || '',
    cliente_telefone: clientePreenchido?.telefone || '',
    cliente_email: clientePreenchido?.email || '',
    cliente_senha: '',
    profissional_id: preSelectedData?.profissional_id || '',
    profissional_nome: '',
    servico_id: '',
    servico_nome: '',
    data: preSelectedData?.data || '',
    horario: preSelectedData?.horario || '',
    observacoes: '',
  });
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const [clienteExistente, setClienteExistente] = useState(clientePreenchido ? true : null);
  const [verificandoCliente, setVerificandoCliente] = useState(false);

  const [avisos, setAvisos] = useState({
    sugestaoHorario: null,
    possivelAtraso: false,
  });

  useEffect(() => {
    if (isAdmin) {
      loadClientes();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (formData.profissional_id && formData.data) {
      loadHorariosDisponiveis();
    }
  }, [formData.profissional_id, formData.data]);

  useEffect(() => {
    if (formData.profissional_id && formData.data && formData.horario && formData.servico_id) {
      analisarHorarioSelecionado();
    }
  }, [formData.horario, formData.servico_id]);

  // Verificar cliente por telefone apenas quando digitando manualmente (visitante público ou Admin em modo Novo Cliente)
  useEffect(() => {
    if (clientePreenchido) return;
    if (isAdmin && !modoNovoClienteAdmin) return;

    const digitos = (formData.cliente_telefone || '').replace(/\D/g, '');
    if (digitos.length >= 10) {
      const timeoutId = setTimeout(() => {
        verificarClienteExistente();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setClienteExistente(null);
    }
  }, [formData.cliente_telefone, clientePreenchido, isAdmin, modoNovoClienteAdmin]);

  const verificarClienteExistente = useCallback(async () => {
    setVerificandoCliente(true);
    try {
      const response = await base44.functions.invoke('verificarClientePorTelefone', {
        telefone: formData.cliente_telefone
      });

      if ((response.data?.success || response.data?.exists) && response.data?.cliente) {
        setClienteExistente(response.data.cliente);
        setFormData(prev => ({
          ...prev,
          cliente_nome: response.data.cliente.nome || prev.cliente_nome,
          cliente_email: response.data.cliente.email || prev.cliente_email,
        }));
      } else {
        setClienteExistente(null);
      }
    } catch (error) {
      setClienteExistente(null);
    } finally {
      setVerificandoCliente(false);
    }
  }, [formData.cliente_telefone]);

  const loadClientes = async () => {
    try {
      const response = await base44.functions.invoke('getAdminClientes', {});
      setClientes(response.data?.success ? response.data.clientes : []);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    }
  };

  const handleClienteSelect = (clienteId) => {
    const cliente = clientes.find(c => String(c.id) === String(clienteId));
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        cliente_id: cliente.id,
        cliente_nome: cliente.nome || '',
        cliente_telefone: cliente.telefone || '',
        cliente_email: cliente.email || '',
      }));
      setClienteExistente(cliente);
    }
  };

  const toggleModoClienteAdmin = () => {
    setModoNovoClienteAdmin(prev => {
      const novoModo = !prev;
      setFormData(f => ({
        ...f,
        cliente_id: '',
        cliente_nome: '',
        cliente_telefone: '',
        cliente_email: '',
        cliente_senha: '',
      }));
      setClienteExistente(null);
      return novoModo;
    });
  };

  const loadHorariosDisponiveis = useCallback(async () => {
    if (!formData.profissional_id || !formData.data) {
      return;
    }

    if (!isValidSafariDate(formData.data)) {
      console.warn('Data inválida para Safari:', formData.data);
      toast.error('Data inválida. Selecione novamente.');
      setHorariosDisponiveis([]);
      return;
    }

    setCarregandoHorarios(true);
    try {
      const response = await base44.functions.invoke('getHorariosDisponiveis', {
        profissional_id: formData.profissional_id,
        data: formData.data
      });

      if (response.data?.success) {
        const raw = response.data.horarios || [];
        const normalized = raw.map(h => (typeof h === 'string' ? h : h.horario)).filter(Boolean);
        // No Admin, se abriu a partir de um slot específico na Agenda Diária (ex: encaixe imediato), garantir o slot na lista
        if (
          isAdmin &&
          preSelectedData?.horario &&
          preSelectedData?.data === formData.data &&
          String(preSelectedData?.profissional_id) === String(formData.profissional_id) &&
          !normalized.includes(preSelectedData.horario)
        ) {
          normalized.push(preSelectedData.horario);
        }
        normalized.sort();
        setHorariosDisponiveis(normalized);
      } else {
        setHorariosDisponiveis([]);
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      toast.error('Erro ao carregar horários disponíveis');
      setHorariosDisponiveis([]);
    } finally {
      setCarregandoHorarios(false);
    }
  }, [formData.profissional_id, formData.data, isAdmin, preSelectedData]);

  const analisarHorarioSelecionado = () => {
    setAvisos({ sugestaoHorario: null, possivelAtraso: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const telefoneDigitos = (formData.cliente_telefone || '').replace(/\D/g, '');

    const validacoes = [
      { condicao: !formData.cliente_nome?.trim(), mensagem: 'Nome do cliente é obrigatório' },
      { condicao: !telefoneDigitos, mensagem: 'Telefone é obrigatório' },
      { condicao: telefoneDigitos.length < 10, mensagem: 'Telefone inválido (mínimo 10 dígitos)' },
      { condicao: !formData.profissional_id, mensagem: 'Selecione um profissional' },
      { condicao: !formData.servico_id, mensagem: 'Selecione um serviço' },
      { condicao: !formData.data, mensagem: 'Selecione uma data' },
      { condicao: !formData.horario, mensagem: 'Selecione um horário' },
    ];

    for (const validacao of validacoes) {
      if (validacao.condicao) {
        toast.error(validacao.mensagem);
        return;
      }
    }

    // Validação de email e senha do Canal APENAS para visitantes públicos novos (nunca bloquear o Admin)
    if (!isAdmin && !clienteExistente) {
      if (!formData.cliente_email?.trim()) {
        toast.error('Email é obrigatório para novos clientes');
        return;
      }
      if (!formData.cliente_email.includes('@')) {
        toast.error('Email inválido');
        return;
      }
      if (!formData.cliente_senha) {
        toast.error('Crie uma senha para acessar seu Canal DeMattos');
        return;
      }
      if (formData.cliente_senha.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
    } else if (formData.cliente_email?.trim() && !formData.cliente_email.includes('@')) {
      toast.error('Email informado é inválido');
      return;
    }

    setLoading(true);

    try {
      const agendamentoData = {
        name: formData.cliente_nome.trim(),
        phone: formData.cliente_telefone,
        email: (formData.cliente_email || '').trim(),
        profissional_id: formData.profissional_id,
        servicos_ids: [formData.servico_id],
        data: formData.data,
        horario: formData.horario,
        message: formData.observacoes,
        instagram: '',
        facebook: '',
        senhaCanal: formData.cliente_senha || '',
        criadoPorAdmin: !!isAdmin,
      };

      const response = await base44.functions.invoke('criarAgendamentoPublico', {
        formData: agendamentoData
      });

      if (response.data?.error) {
        toast.error(response.data.error);
        setLoading(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['agendaDiaria'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });

      toast.success('Agendamento criado com sucesso!');

      setFormData({
        cliente_id: '',
        cliente_nome: '',
        cliente_telefone: '',
        cliente_email: '',
        cliente_senha: '',
        profissional_id: '',
        profissional_nome: '',
        servico_id: '',
        servico_nome: '',
        data: '',
        horario: '',
        observacoes: '',
      });
      setAvisos({ sugestaoHorario: null, possivelAtraso: false });
      setClienteExistente(null);

      if (onSuccess) onSuccess();
    } catch (error) {
      const mensagem = error?.response?.data?.error || error?.message || 'Erro ao criar agendamento. Tente novamente.';
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#D4AF37]" />
          Novo Agendamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!clientePreenchido && isAdmin ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-white">Cliente *</label>
                <button
                  type="button"
                  onClick={toggleModoClienteAdmin}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF37] hover:text-[#e5c453] transition-colors py-1 px-2 rounded border border-[#D4AF37]/30 bg-[#D4AF37]/10 touch-manipulation"
                >
                  {modoNovoClienteAdmin ? (
                    <>
                      <Users className="w-3.5 h-3.5" />
                      Selecionar cliente cadastrado
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      + Novo cliente
                    </>
                  )}
                </button>
              </div>

              {!modoNovoClienteAdmin ? (
                <>
                  <SearchableSelect
                    value={formData.cliente_id}
                    onValueChange={handleClienteSelect}
                    placeholder="Buscar cliente por nome ou telefone..."
                    items={clientes.map(c => ({
                      id: c.id,
                      value: c.id,
                      label: `${c.nome || 'Sem nome'} - ${c.telefone || ''}`
                    }))}
                    displayKey="label"
                    searchKeys={['label']}
                    sortKey="label"
                  />
                  {formData.cliente_id && (
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3 mt-2 text-sm text-gray-400">
                      <p>📞 {formData.cliente_telefone}</p>
                      {formData.cliente_email && <p>📧 {formData.cliente_email}</p>}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3 bg-[#0a0a0a]/60 border border-[#2a2a2a] rounded-lg p-3">
                  <div>
                    <label className="text-xs font-medium text-gray-300 mb-1 block">Nome do Cliente *</label>
                    <Input
                      value={formData.cliente_nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente_nome: e.target.value }))}
                      placeholder="Nome completo"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-300 mb-1 block">WhatsApp / Telefone *</label>
                    <Input
                      value={formData.cliente_telefone}
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente_telefone: e.target.value }))}
                      placeholder="(31) 99999-9999"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    />
                    {clienteExistente && (
                      <p className="text-xs text-green-400 mt-1">✓ Cliente já cadastrado: {clienteExistente.nome}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-300 mb-1 block">E-mail (opcional)</label>
                    <Input
                      type="email"
                      value={formData.cliente_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente_email: e.target.value }))}
                      placeholder="cliente@email.com (opcional)"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : !clientePreenchido && (
            <>
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Nome do Cliente *</label>
                <Input
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, cliente_nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Telefone *</label>
                <Input
                  value={formData.cliente_telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, cliente_telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                />
                {verificandoCliente && (
                  <p className="text-xs text-gray-400 mt-1">Verificando cliente...</p>
                )}
                {clienteExistente && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-2 mt-2">
                    <p className="text-xs text-green-400">✓ Cliente já cadastrado: {clienteExistente.nome}</p>
                  </div>
                )}
                {!clienteExistente && formData.cliente_telefone.replace(/\D/g, '').length >= 10 && !verificandoCliente && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 mt-2">
                    <p className="text-xs text-blue-400">Novo cliente - Preencha email e crie uma senha</p>
                  </div>
                )}
              </div>

              {!clienteExistente && formData.cliente_telefone.replace(/\D/g, '').length >= 10 && (
                <>
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Email *</label>
                    <Input
                      type="email"
                      value={formData.cliente_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente_email: e.target.value }))}
                      placeholder="seu@email.com"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Senha do Canal *</label>
                    <Input
                      type="password"
                      value={formData.cliente_senha}
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente_senha: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">Você usará essa senha para acessar seu Canal DeMattos</p>
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Profissional *</label>
            <SearchableSelect
              value={String(formData.profissional_id || '')}
              onValueChange={(value) => {
                const prof = profissionais.find(p => String(p.id) === String(value));
                setFormData(prev => ({ ...prev, profissional_id: value, profissional_nome: prof?.nome || '', horario: '' }));
              }}
              placeholder={loadingProfissionais ? 'Carregando profissionais...' : 'Buscar profissional...'}
              items={profissionais.map(p => ({
                id: p.id,
                value: p.id,
                label: p.nome
              }))}
              displayKey="label"
              searchKeys={['label']}
              sortKey="label"
              className="touch-manipulation"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Serviço *</label>
            <SearchableSelect
              value={String(formData.servico_id || '')}
              onValueChange={(value) => {
                const serv = servicos.find(s => String(s.id) === String(value));
                setFormData(prev => ({ ...prev, servico_id: value, servico_nome: serv?.nome || '' }));
              }}
              placeholder={loadingServicos ? 'Carregando serviços...' : 'Buscar serviço...'}
              items={servicos.map(s => ({
                id: s.id,
                value: s.id,
                label: `${s.nome} - ${s.duracao || 30}min - R$ ${(Number(s.preco) || 0).toFixed(2)}`
              }))}
              displayKey="label"
              searchKeys={['label']}
              sortKey="label"
              className="touch-manipulation"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Data *</label>
            <SafeDateInput
              value={formData.data}
              onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value, horario: '' }))}
              min={getBrazilDateString()}
              className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
            />
          </div>

          {formData.profissional_id && formData.data && (
            <div>
              <label className="text-sm font-medium text-white mb-2 block">Horário *</label>
              {carregandoHorarios ? (
                <div className="flex items-center justify-center gap-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span className="text-sm text-gray-400">Carregando horários...</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={formData.horario || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) setFormData(prev => ({ ...prev, horario: val }));
                    }}
                    disabled={horariosDisponiveis.length === 0}
                    className="w-full h-12 rounded-md border border-[#2a2a2a] bg-[#0a0a0a] text-white text-[16px] pl-3 pr-10 focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                    style={{ colorScheme: 'dark', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    <option value="" disabled>
                      {horariosDisponiveis.length === 0 ? 'Nenhum horário disponível' : 'Selecione o horário'}
                    </option>
                    {horariosDisponiveis.map((horario) => (
                      <option key={horario} value={horario}>{horario}</option>
                    ))}
                  </select>
                  <Clock className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          )}

          {avisos.sugestaoHorario && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                Para otimizar a agenda, sugerimos o horário <span className="font-semibold">{avisos.sugestaoHorario}</span>
              </div>
            </div>
          )}

          {avisos.possivelAtraso && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-300">
                A duração do serviço pode exceder o horário disponível. Pequenos atrasos podem ocorrer.
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Observações</label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Alguma observação especial?"
              rows={3}
              className="bg-[#0a0a0a] border-[#2a2a2a] text-white resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || (formData.profissional_id && formData.data && horariosDisponiveis.length === 0 && !carregandoHorarios)}
            className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed py-3 md:py-2 touch-manipulation safe-area-bottom"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            {loading ? 'Agendando...' : 'Criar Agendamento'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
