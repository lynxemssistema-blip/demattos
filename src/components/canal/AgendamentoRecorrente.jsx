import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repeat, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AgendamentoRecorrente({ cliente }) {
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [agendamentosAbertos, setAgendamentosAbertos] = useState(0);
  
  const [formData, setFormData] = useState({
    profissional_id: '',
    servico_id: '',
    dia_semana: '',
    horario: '',
    observacoes: '',
    frequencia: 'semanal',
    quantidade: 4,
  });

  useEffect(() => {
    loadData();
  }, [cliente]);

  const loadData = async () => {
    try {
      const [profsResponse, servsResponse, agendsResponse] = await Promise.all([
        base44.functions.invoke('getProfissionaisPublicos', {}),
        base44.functions.invoke('getServicosPublicos', {}),
        base44.functions.invoke('getMeusAgendamentos', { telefone: cliente.telefone }),
      ]);
      
      setProfissionais(profsResponse.data.success ? profsResponse.data.profissionais : []);
      setServicos(servsResponse.data.success ? servsResponse.data.servicos : []);
      
      const agendamentosData = agendsResponse.data.success ? agendsResponse.data.agendamentos : [];
      const abertos = agendamentosData.filter(a => a.status === 'pendente' || a.status === 'confirmado');
      setAgendamentosAbertos(abertos.length);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const calcularDatasRecorrentes = () => {
    const datas = [];
    const hoje = new Date();
    const diaSelecionado = parseInt(formData.dia_semana);
    
    let dataAtual = new Date(hoje);
    
    // Avançar para o próximo dia da semana selecionado
    while (dataAtual.getDay() !== diaSelecionado) {
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    for (let i = 0; i < parseInt(formData.quantidade); i++) {
      datas.push(new Date(dataAtual));
      
      if (formData.frequencia === 'semanal') {
        dataAtual.setDate(dataAtual.getDate() + 7);
      } else if (formData.frequencia === 'quinzenal') {
        dataAtual.setDate(dataAtual.getDate() + 14);
      } else if (formData.frequencia === 'mensal') {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
    }

    return datas;
  };

  // Validação de disponibilidade será feita no backend

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.profissional_id || !formData.servico_id || !formData.dia_semana || !formData.horario) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const totalAgendamentos = agendamentosAbertos + parseInt(formData.quantidade);
    if (totalAgendamentos > 12) {
      toast.error(`Você já possui ${agendamentosAbertos} agendamentos em aberto. Máximo permitido: 12. Você pode criar apenas ${12 - agendamentosAbertos} novos.`);
      return;
    }

    setLoading(true);

    try {
      const response = await base44.functions.invoke('criarAgendamentoRecorrente', {
        cliente_id: cliente.id,
        cliente_telefone: cliente.telefone,
        formData: {
          ...formData,
          cliente_nome: cliente.nome
        }
      });

      if (response.data.error) {
        toast.error(response.data.error);
        setLoading(false);
        return;
      }

      toast.success(`${response.data.quantidade} agendamentos recorrentes criados com sucesso!`);
      
      // Resetar formulário
      setFormData({
        profissional_id: '',
        servico_id: '',
        dia_semana: '',
        horario: '',
        observacoes: '',
        frequencia: 'semanal',
        quantidade: 4,
      });
      
      await loadData();
    } catch (error) {
      toast.error('Erro ao criar agendamentos recorrentes');
    } finally {
      setLoading(false);
    }
  };

  const diasSemana = [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Segunda-feira' },
    { value: '2', label: 'Terça-feira' },
    { value: '3', label: 'Quarta-feira' },
    { value: '4', label: 'Quinta-feira' },
    { value: '5', label: 'Sexta-feira' },
    { value: '6', label: 'Sábado' },
  ];

  const podeAgendar = agendamentosAbertos < 12;

  return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Repeat className="w-5 h-5 text-[#D4AF37]" />
          Agendamento Recorrente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
          <div className="flex items-start gap-3">
            {podeAgendar ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-white font-semibold mb-1">
                Agendamentos em Aberto: {agendamentosAbertos}/12
              </p>
              <p className="text-gray-400 text-sm">
                {podeAgendar 
                  ? `Você pode criar até ${12 - agendamentosAbertos} novos agendamentos recorrentes.`
                  : 'Você atingiu o limite máximo de agendamentos em aberto. Aguarde a conclusão de agendamentos existentes.'
                }
              </p>
            </div>
          </div>
        </div>

        {!podeAgendar && (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p>Limite de agendamentos atingido</p>
          </div>
        )}

        {podeAgendar && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">Profissional *</label>
              <Select value={String(formData.profissional_id || '')} onValueChange={(value) => setFormData(prev => ({ ...prev, profissional_id: value }))}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  {profissionais.map((prof) => (
                    <SelectItem key={prof.id} value={String(prof.id)} className="text-white">{prof.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">Serviço *</label>
              <Select value={String(formData.servico_id || '')} onValueChange={(value) => setFormData(prev => ({ ...prev, servico_id: value }))}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  {servicos.map((serv) => (
                    <SelectItem key={serv.id} value={String(serv.id)} className="text-white">
                      {serv.nome} - R$ {serv.preco.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Dia da Semana *</label>
                <Select value={formData.dia_semana} onValueChange={(value) => setFormData(prev => ({ ...prev, dia_semana: value }))}>
                  <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                    {diasSemana.map((dia) => (
                      <SelectItem key={dia.value} value={dia.value} className="text-white">{dia.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Horário *</label>
                <Input
                  type="time"
                  value={formData.horario}
                  onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Frequência</label>
                <Select value={formData.frequencia} onValueChange={(value) => setFormData(prev => ({ ...prev, frequencia: value }))}>
                  <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                    <SelectItem value="semanal" className="text-white">Semanal</SelectItem>
                    <SelectItem value="quinzenal" className="text-white">Quinzenal</SelectItem>
                    <SelectItem value="mensal" className="text-white">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Quantidade</label>
                <Input
                  type="number"
                  min="2"
                  max={Math.min(12, 12 - agendamentosAbertos)}
                  value={formData.quantidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">Observações</label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Alguma observação especial?"
                rows={3}
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white resize-none"
                style={{ fontSize: '16px' }}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold touch-manipulation"
            >
              {loading ? 'Criando...' : `Criar ${formData.quantidade} Agendamentos Recorrentes`}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Os agendamentos recorrentes são confirmados automaticamente e não precisam de aprovação.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}