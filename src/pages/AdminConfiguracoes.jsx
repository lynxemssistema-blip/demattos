import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, MapPin, Phone, Clock, Save, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

function AdminConfiguracoesCont() {
  const [formData, setFormData] = useState({
    endereco: '',
    telefone: '',
    telefone_gestor: '',
    horario_semana: '',
    horario_sabado: '',
    horario_domingo: '',
    instagram_secao_ativa: 'true',
    email_suporte_tecnico: '',
    confirmacao_automatica_agendamento: 'false',
  });

  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminConfiguracoes', {});
      return response.data.success ? response.data.configs : [];
    },
  });

  useEffect(() => {
    if (configs.length > 0) {
      const configsMap = {};
      configs.forEach(config => {
        configsMap[config.chave] = config.valor;
      });
      setFormData({
        endereco: configsMap.endereco || '',
        telefone: configsMap.telefone || '',
        telefone_gestor: configsMap.telefone_gestor || '',
        horario_semana: configsMap.horario_semana || '',
        horario_sabado: configsMap.horario_sabado || '',
        horario_domingo: configsMap.horario_domingo || '',
        instagram_secao_ativa: configsMap.instagram_secao_ativa || 'true',
        email_suporte_tecnico: configsMap.email_suporte_tecnico || '',
        confirmacao_automatica_agendamento: configsMap.confirmacao_automatica_agendamento || 'false',
      });
    }
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // First, delete existing configs
      for (const config of configs) {
        await base44.entities.Configuracao.delete(config.id);
      }
      
      // Create new configs
      const promises = Object.entries(data).map(([chave, valor]) => 
        base44.entities.Configuracao.create({
          chave,
          valor,
          descricao: getDescricao(chave)
        })
      );
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      toast.success('Configurações salvas com sucesso!');
    },
  });

  const getDescricao = (chave) => {
    const descricoes = {
      endereco: 'Endereço da barbearia',
      telefone: 'Telefone/WhatsApp de contato',
      telefone_gestor: 'WhatsApp da automação/gestor',
      horario_semana: 'Horário de funcionamento (Seg-Sex)',
      horario_sabado: 'Horário de funcionamento (Sábado)',
      horario_domingo: 'Horário de funcionamento (Domingo)',
      instagram_secao_ativa: 'Se a seção de vídeos do Instagram está ativa',
      email_suporte_tecnico: 'Email para receber notificações de erros e eventos críticos do sistema',
      confirmacao_automatica_agendamento: 'Se os agendamentos são confirmados automaticamente',
    };
    return descricoes[chave] || '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Admin')}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Configurações</h1>
              <p className="text-gray-400 text-sm">Atualize as informações da barbearia</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Endereço */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="w-5 h-5 text-[#D4AF37]" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua Exemplo, 123 - Centro, Belo Horizonte - MG"
                rows={3}
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white resize-none"
              />
            </CardContent>
          </Card>

          {/* Telefone */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Phone className="w-5 h-5 text-[#D4AF37]" />
                Telefone / WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Contato Público
                </label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(31) 99999-9999"
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  WhatsApp Gestor/Automação
                </label>
                <Input
                  value={formData.telefone_gestor}
                  onChange={(e) => setFormData({ ...formData, telefone_gestor: e.target.value })}
                  placeholder="(31) 98888-8888"
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número vinculado à automação n8n
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Horários */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-[#D4AF37]" />
                Horários de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Segunda a Sexta
                </label>
                <Input
                  value={formData.horario_semana}
                  onChange={(e) => setFormData({ ...formData, horario_semana: e.target.value })}
                  placeholder="09:00 - 20:00"
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Sábado
                </label>
                <Input
                  value={formData.horario_sabado}
                  onChange={(e) => setFormData({ ...formData, horario_sabado: e.target.value })}
                  placeholder="09:00 - 18:00"
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Domingo
                </label>
                <Input
                  value={formData.horario_domingo}
                  onChange={(e) => setFormData({ ...formData, horario_domingo: e.target.value })}
                  placeholder="Fechado"
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção Instagram */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Video className="w-5 h-5 text-[#D4AF37]" />
                Seção de Vídeos do Instagram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <select
                  value={formData.instagram_secao_ativa}
                  onChange={(e) => setFormData({ ...formData, instagram_secao_ativa: e.target.value })}
                  className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg p-3 focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="true">Ativada</option>
                  <option value="false">Desativada</option>
                </select>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  formData.instagram_secao_ativa === 'true' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {formData.instagram_secao_ativa === 'true' ? 'Visível' : 'Oculta'}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Mostrar ou ocultar a seção de vídeos do Instagram na página inicial
              </p>
            </CardContent>
          </Card>

          {/* Email Suporte Técnico */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertCircle className="w-5 h-5 text-[#D4AF37]" />
                Email de Suporte Técnico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="email"
                value={formData.email_suporte_tecnico}
                onChange={(e) => setFormData({ ...formData, email_suporte_tecnico: e.target.value })}
                placeholder="suporte@exemplo.com"
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white"
              />
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                <p className="text-xs text-blue-300">
                  🔔 <strong>Este email receberá:</strong>
                </p>
                <ul className="text-xs text-blue-300 mt-2 ml-4 list-disc space-y-1">
                  <li>Notificações de erros críticos do sistema</li>
                  <li>Avisos importantes de funcionamento</li>
                  <li>Stack trace completo para debug</li>
                  <li>Informações detalhadas sobre o evento</li>
                  <li>Email do usuário afetado</li>
                </ul>
                <p className="text-xs text-blue-300 mt-3">
                  ⏰ As notificações são enviadas imediatamente para erros críticos, em 5 minutos para erros normais e 30 minutos para avisos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Confirmação Automática de Agendamentos */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="w-5 h-5 text-[#D4AF37]" />
                Confirmação Automática de Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-1">
                    Confirmar agendamentos automaticamente
                  </p>
                  <p className="text-xs text-gray-400">
                    Quando ativado, novos agendamentos são confirmados instantaneamente
                  </p>
                </div>
                <Switch
                  checked={formData.confirmacao_automatica_agendamento === 'true'}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, confirmacao_automatica_agendamento: checked ? 'true' : 'false' })
                  }
                  className="data-[state=checked]:bg-[#D4AF37]"
                />
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                <p className="text-xs text-yellow-300">
                  <strong>⚙️ Como funciona:</strong>
                </p>
                <ul className="text-xs text-yellow-300 mt-2 ml-4 list-disc space-y-1">
                  <li><strong>Desativado:</strong> Agendamentos ficam com status "Pendente" e você precisa confirmar manualmente. Cliente recebe mensagem de "aguardando confirmação".</li>
                  <li><strong>Ativado:</strong> Agendamentos são confirmados automaticamente. Cliente recebe mensagem de "agendamento confirmado" imediatamente.</li>
                </ul>
                <p className="text-xs text-yellow-300 mt-3">
                  💡 No painel de agendamentos, você verá um indicador visual diferenciando confirmações automáticas das manuais.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold px-8"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminConfiguracoes() {
  return (
    <AdminRoute>
      <AdminConfiguracoesCont />
    </AdminRoute>
  );
}