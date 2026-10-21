import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, AlertCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SafeDateInput from '@/components/form/SafeDateInput';
import SearchableSelect from '@/components/ui/searchable-select';
import { createSafariDate, isValidSafariDate } from '@/lib/SafariCompat';

export default function AgendamentoForm({ onSuccess, clientePreenchido, isAdmin, preSelectedData }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const queryClient = useQueryClient();

  // Reutilizar cache home-data (se disponível), senão busca via getHomeData
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

  const profissionais = useMemo(() => {
    return (homeData?.profissionais || []).filter(p => p && p.id);
  }, [homeData]);

  const servicos = useMemo(() => {
    return homeData?.servicos || [];
  }, [homeData]);

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
  }, []);

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

  useEffect(() => {
    if (!clientePreenchido && formData.cliente_telefone && formData.cliente_telefone.length >= 10) {
      const timeoutId = setTimeout(() => {
        verificarClienteExistente();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (!clientePreenchido) {
      setClienteExistente(null);
    }
  }, [formData.cliente_telefone]);

  const verificarClienteExistente = useCallback(async () => {
    setVerificandoCliente(true);
    try {
      const response = await base44.functions.invoke('verificarClientePorTelefone', {
        telefone: formData.cliente_telefone
      });
      
      if (response.data.success && response.data.cliente) {
        setClienteExistente(response.data.cliente);
        setFormData(prev => ({
          ...prev,
          cliente_nome: response.data.cliente.nome,
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
      // SEGURANÇA: Apenas admin pode listar clientes via function segura
      const response = await base44.functions.invoke('getAdminClientes', {});
      setClientes(response.data.success ? response.data.clientes : []);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    }
  };

  const handleClienteSelect = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        cliente_id: clienteId,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        cliente_email: cliente.email || '',
        // SEGURANÇA: NUNCA trafegar senha_canal do backend para frontend
      }));
      setClienteExistente(cliente);
    }
  };

  const loadHorariosDisponiveis = useCallback(async () => {
   if (!formData.profissional_id || !formData.data) {
     return;
   }

   // ✅ CORREÇÃO #1: Validar data para Safari antes de enviar ao servidor
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

     if (response.data.success) {
       // Normalizar: aceita tanto [{horario: "09:00"}] quanto ["09:00"]
       const raw = response.data.horarios || [];
       const normalized = raw.map(h => (typeof h === 'string' ? h : h.horario)).filter(Boolean).sort();
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
  }, [formData.profissional_id, formData.data]);

  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const analisarHorarioSelecionado = () => {
    // Análise simplificada sem depender de agendamentosExistentes
    setAvisos({ sugestaoHorario: null, possivelAtraso: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos obrigatórios com mensagens específicas
    const validacoes = [
      { condicao: !formData.cliente_nome, mensagem: 'Nome do cliente é obrigatório' },
      { condicao: !formData.cliente_telefone, mensagem: 'Telefone é obrigatório' },
      { condicao: formData.cliente_telefone.length < 10, mensagem: 'Telefone inválido (mínimo 10 dígitos)' },
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

    // Se é novo cliente, validar email e senha
    if (!clienteExistente) {
      if (!formData.cliente_email) {
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
    }

    setLoading(true);

    try {
      const servicoSelecionado = servicos.find(s => s.id === formData.servico_id);
      const profissionalSelecionado = profissionais.find(p => p.id === formData.profissional_id);

      // Preparar dados do formulário - garantir data em formato local
      const agendamentoData = {
        name: formData.cliente_nome,
        phone: formData.cliente_telefone,
        email: formData.cliente_email,
        profissional_id: formData.profissional_id,
        servicos_ids: [formData.servico_id],
        data: formData.data,
        horario: formData.horario,
        message: formData.observacoes,
        instagram: '',
        facebook: '',
        senhaCanal: formData.cliente_senha
      };

      // Invalidar queries relacionadas após sucesso
      const response = await base44.functions.invoke('criarAgendamentoPublico', {
        formData: agendamentoData
      });

      if (response.data.error) {
        toast.error(response.data.error);
        setLoading(false);
        return;
      }

      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });

      toast.success('Agendamento criado com sucesso!');
      
      // Resetar formulário
      setFormData({
        cliente_nome: '',
        cliente_telefone: '',
        cliente_email: '',
        cliente_senha: '',
        profissional_id: '',
        servico_id: '',
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
            <div>
              <label className="text-sm font-medium text-white mb-2 block">Cliente *</label>
              <SearchableSelect
                value={formData.cliente_id}
                onValueChange={handleClienteSelect}
                placeholder="Buscar cliente por nome ou telefone..."
                items={clientes.map(c => ({
                  id: c.id,
                  value: c.id,
                  label: `${c.nome} - ${c.telefone}`
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
                {!clienteExistente && formData.cliente_telefone.length >= 10 && !verificandoCliente && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 mt-2">
                    <p className="text-xs text-blue-400">Novo cliente - Preencha email e crie uma senha</p>
                  </div>
                )}
              </div>

              {!clienteExistente && formData.cliente_telefone.length >= 10 && (
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
                 // ✅ CORREÇÃO #2: Interação segura com stop propagation
                 const prof = profissionais.find(p => String(p.id) === String(value));
                 setFormData(prev => ({ ...prev, profissional_id: value, profissional_nome: prof?.nome || '', horario: '' }));
               }}
               placeholder="Buscar profissional..."
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
              placeholder="Buscar serviço..."
              items={servicos.map(s => ({
                id: s.id,
                value: s.id,
                label: `${s.nome} - ${s.duracao}min - R$ ${s.preco.toFixed(2)}`
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
              min={getTodayLocal()}
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
                /* Select nativo — evita bug de race condition do drawer mobile no iOS */
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
            {loading ? 'Processando...' : 'Criar Agendamento'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}