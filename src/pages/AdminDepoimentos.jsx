import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminRoute from '@/components/auth/AdminRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Star, Eye, EyeOff, User, RefreshCw, Brain, MessageSquare, FileText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function AdminDepoimentosContent() {
  const queryClient = useQueryClient();
  const [sincronizando, setSincronizando] = useState(false);
  const [analisandoSentimento, setAnalisandoSentimento] = useState(false);
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [analiseDialog, setAnaliseDialog] = useState(false);
  const [resumoDialog, setResumoDialog] = useState(false);
  const [respostaDialog, setRespostaDialog] = useState(false);
  const [depoimentoSelecionado, setDepoimentoSelecionado] = useState(null);
  const [analiseResultado, setAnaliseResultado] = useState(null);
  const [resumoTexto, setResumoTexto] = useState('');
  const [respostaSugerida, setRespostaSugerida] = useState('');
  const [gerandoResposta, setGerandoResposta] = useState(false);

  const { data: depoimentos = [], isLoading } = useQuery({
    queryKey: ['depoimentos-enviados'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminDepoimentos', {});
      return response.data.success ? response.data.depoimentos : [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, aprovado }) => base44.entities.Depoimento.update(id, {
      aprovado: aprovado
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depoimentos-enviados'] });
    },
  });

  const sincronizarDepoimentos = async () => {
    setSincronizando(true);
    try {
      const todosDepoimentos = await base44.entities.Depoimento.list();
      const clientes = await base44.entities.Cliente.list();
      
      const clientesMap = {};
      clientes.forEach(cliente => {
        clientesMap[cliente.id] = cliente;
      });
      
      await Promise.all(
        todosDepoimentos.map(depoimento => {
          const cliente = clientesMap[depoimento.cliente_id];
          if (cliente) {
            return base44.entities.Depoimento.update(depoimento.id, {
              cliente_nome: cliente.nome,
              cliente_profissao: cliente.profissao || '',
              cliente_foto_url: cliente.foto_url || '',
            });
          }
          return Promise.resolve();
        })
      );
      
      queryClient.invalidateQueries({ queryKey: ['depoimentos-enviados'] });
      alert('Depoimentos sincronizados com sucesso!');
    } catch (error) {
      alert('Erro ao sincronizar depoimentos');
    } finally {
      setSincronizando(false);
    }
  };

  const analisarSentimento = async () => {
    setAnalisandoSentimento(true);
    try {
      const todosDepoimentos = await base44.entities.Depoimento.list();
      
      const prompt = `Analise os seguintes depoimentos de uma barbearia e forneça insights sobre:
1. Sentimento geral (positivo, neutro, negativo)
2. Temas mais mencionados
3. Pontos fortes identificados
4. Áreas de melhoria
5. Tendências gerais

Depoimentos:
${todosDepoimentos.map((d, i) => `${i + 1}. (${d.avaliacao} estrelas) "${d.texto}"`).join('\n')}

Forneça uma análise detalhada e profissional.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            sentimento_geral: { type: 'string' },
            percentual_positivo: { type: 'number' },
            temas_principais: { type: 'array', items: { type: 'string' } },
            pontos_fortes: { type: 'array', items: { type: 'string' } },
            areas_melhoria: { type: 'array', items: { type: 'string' } },
            tendencias: { type: 'string' },
            recomendacoes: { type: 'string' }
          }
        }
      });
      
      setAnaliseResultado(resultado);
      setAnaliseDialog(true);
    } catch (error) {
      alert('Erro ao analisar sentimento');
    } finally {
      setAnalisandoSentimento(false);
    }
  };

  const gerarResumo = async () => {
    setGerandoResumo(true);
    try {
      const depoimentosPositivos = depoimentos.filter(d => d.avaliacao >= 4 && d.aprovado);
      
      const prompt = `Crie um resumo profissional e atraente dos depoimentos mais positivos desta barbearia. 
O resumo deve destacar os principais elogios, a satisfação dos clientes e o que torna a barbearia especial.
Use um tom profissional mas acolhedor, perfeito para ser usado em materiais de marketing.

Depoimentos positivos:
${depoimentosPositivos.map((d, i) => `${i + 1}. ${d.cliente_nome} (${d.avaliacao} estrelas): "${d.texto}"`).join('\n')}

Gere um resumo de 2-3 parágrafos que capture a essência da excelência da barbearia.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt
      });
      
      setResumoTexto(resultado);
      setResumoDialog(true);
    } catch (error) {
      alert('Erro ao gerar resumo');
    } finally {
      setGerandoResumo(false);
    }
  };

  const sugerirResposta = async (depoimento) => {
    setDepoimentoSelecionado(depoimento);
    setGerandoResposta(true);
    setRespostaDialog(true);
    
    try {
      const prompt = `Você é o dono da Barbearia DeMattos, um estabelecimento premium e sofisticado.
Um cliente chamado ${depoimento.cliente_nome} deixou o seguinte depoimento com ${depoimento.avaliacao} estrelas:

"${depoimento.texto}"

Gere uma resposta profissional, calorosa e personalizada para este depoimento. A resposta deve:
- Agradecer o cliente pelo feedback
- Ser genuína e pessoal
- Mencionar algo específico do depoimento
- Reforçar o compromisso com a excelência
- Convidar o cliente a retornar

Mantenha um tom elegante mas acessível, típico de uma barbearia premium.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt
      });
      
      setRespostaSugerida(resultado);
    } catch (error) {
      alert('Erro ao gerar resposta');
      setRespostaDialog(false);
    } finally {
      setGerandoResposta(false);
    }
  };

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
                <h1 className="text-2xl font-bold text-white">Depoimentos</h1>
                <p className="text-gray-400 text-sm">Gerencie a aprovação dos depoimentos enviados</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={analisarSentimento}
                disabled={analisandoSentimento}
                variant="outline"
                className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Brain className={`w-4 h-4 mr-2 ${analisandoSentimento ? 'animate-pulse' : ''}`} />
                {analisandoSentimento ? 'Analisando...' : 'Analisar Sentimento'}
              </Button>
              <Button
                onClick={gerarResumo}
                disabled={gerandoResumo || depoimentos.filter(d => d.avaliacao >= 4 && d.aprovado).length === 0}
                variant="outline"
                className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <FileText className={`w-4 h-4 mr-2 ${gerandoResumo ? 'animate-pulse' : ''}`} />
                {gerandoResumo ? 'Gerando...' : 'Gerar Resumo'}
              </Button>
              <Button
                onClick={sincronizarDepoimentos}
                disabled={sincronizando}
                className="bg-[#D4AF37] hover:bg-[#B8973D] text-black"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${sincronizando ? 'animate-spin' : ''}`} />
                {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="text-white text-center py-12">Carregando...</div>
        ) : depoimentos.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="py-12 text-center text-gray-400">
              Nenhum depoimento enviado para aprovação
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {depoimentos.map((depoimento) => (
              <Card key={depoimento.id} className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {depoimento.cliente_foto_url ? (
                        <img src={depoimento.cliente_foto_url} alt={depoimento.cliente_nome} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-[#D4AF37]" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-white font-semibold">{depoimento.cliente_nome}</h3>
                        {depoimento.cliente_profissao && <p className="text-gray-400 text-sm">{depoimento.cliente_profissao}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => sugerirResposta(depoimento)}
                        variant="ghost"
                        size="sm"
                        className="text-[#D4AF37] hover:text-[#B8973D] hover:bg-[#D4AF37]/10"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Responder
                      </Button>
                      <Button
                        onClick={() => toggleMutation.mutate({
                          id: depoimento.id,
                          aprovado: !depoimento.aprovado
                        })}
                        variant="ghost"
                        size="sm"
                        className={
                          depoimento.aprovado
                            ? 'text-green-500 hover:text-green-600 hover:bg-green-500/10'
                            : 'text-gray-500 hover:text-gray-400 hover:bg-gray-500/10'
                        }
                      >
                        {depoimento.aprovado ? (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Aprovado
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Pendente
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1 mb-3">
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

                  {/* Depoimento */}
                  <p className="text-gray-300 text-sm leading-relaxed italic">
                    "{depoimento.texto}"
                  </p>

                  {/* Status */}
                  <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                    <p className="text-xs text-gray-500">
                      Status: {depoimento.aprovado ? (
                        <span className="text-green-500">✓ Aprovado - visível na página principal</span>
                      ) : (
                        <span className="text-yellow-500">Aguardando sua aprovação</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Análise de Sentimento Dialog */}
      <Dialog open={analiseDialog} onOpenChange={setAnaliseDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#D4AF37]" />
              Análise de Sentimento com IA
            </DialogTitle>
          </DialogHeader>
          {analiseResultado && (
            <div className="space-y-6 mt-4">
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <h3 className="text-[#D4AF37] font-semibold mb-2">Sentimento Geral</h3>
                <p className="text-white text-lg">{analiseResultado.sentimento_geral}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {analiseResultado.percentual_positivo}% de sentimento positivo
                </p>
              </div>

              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <h3 className="text-[#D4AF37] font-semibold mb-2">Temas Principais</h3>
                <ul className="space-y-1">
                  {analiseResultado.temas_principais?.map((tema, i) => (
                    <li key={i} className="text-gray-300 text-sm">• {tema}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <h3 className="text-green-500 font-semibold mb-2">Pontos Fortes</h3>
                <ul className="space-y-1">
                  {analiseResultado.pontos_fortes?.map((ponto, i) => (
                    <li key={i} className="text-gray-300 text-sm">✓ {ponto}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <h3 className="text-yellow-500 font-semibold mb-2">Áreas de Melhoria</h3>
                <ul className="space-y-1">
                  {analiseResultado.areas_melhoria?.map((area, i) => (
                    <li key={i} className="text-gray-300 text-sm">→ {area}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <h3 className="text-[#D4AF37] font-semibold mb-2">Tendências</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{analiseResultado.tendencias}</p>
              </div>

              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <h3 className="text-[#D4AF37] font-semibold mb-2">Recomendações</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{analiseResultado.recomendacoes}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resumo Dialog */}
      <Dialog open={resumoDialog} onOpenChange={setResumoDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              Resumo dos Depoimentos Positivos
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">{resumoTexto}</p>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(resumoTexto);
                alert('Resumo copiado!');
              }}
              className="w-full mt-4 bg-[#D4AF37] hover:bg-[#B8973D] text-black"
            >
              Copiar Resumo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resposta Sugerida Dialog */}
      <Dialog open={respostaDialog} onOpenChange={setRespostaDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
              Resposta Sugerida por IA
            </DialogTitle>
          </DialogHeader>
          {depoimentoSelecionado && (
            <div className="mt-4 space-y-4">
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-2">Depoimento de {depoimentoSelecionado.cliente_nome}:</p>
                <p className="text-gray-300 text-sm italic">"{depoimentoSelecionado.texto}"</p>
              </div>

              {gerandoResposta ? (
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-center">
                  <Sparkles className="w-8 h-8 text-[#D4AF37] mx-auto mb-2 animate-pulse" />
                  <p className="text-gray-400">Gerando resposta personalizada...</p>
                </div>
              ) : (
                <>
                  <Textarea
                    value={respostaSugerida}
                    onChange={(e) => setRespostaSugerida(e.target.value)}
                    rows={6}
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-white resize-none"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(respostaSugerida);
                      alert('Resposta copiada!');
                    }}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black"
                  >
                    Copiar Resposta
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDepoimentos() {
  return (
    <AdminRoute>
      <AdminDepoimentosContent />
    </AdminRoute>
  );
}