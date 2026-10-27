import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageCircle, Send, Mic, MicOff, X, Loader2, Camera, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DeMattosIA from './canal/DeMattosIA';

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [inputMensagem, setInputMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userCredits, setUserCredits] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [gerandoPrevia, setGerandoPrevia] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      setIsLoggedIn(auth);
      setCheckingAuth(false);
      if (auth) {
        base44.auth.me().then(user => {
          setUsuarioLogado(user);
          base44.entities.Cliente.filter({ email: user.email }).then(clientes => {
            if (clientes.length > 0) setCliente(clientes[0]);
          });
        });
      }
    });
  }, []);

  useEffect(() => {
    // Inicializar reconhecimento de voz
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = 'pt-BR';
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMensagem(transcript);
        setGravando(false);
      };

      recognitionInstance.onerror = () => {
        setGravando(false);
      };

      recognitionInstance.onend = () => {
        setGravando(false);
      };

      setRecognition(recognitionInstance);
    }

    // Carregar vozes disponíveis
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  useEffect(() => {
    if (open && mensagens.length === 0) {
      carregarHistorico();
    }
  }, [open]);

  // Ouvir eventos disparados pela MobileBottomNav
  useEffect(() => {
    const handleOpenChat = () => setOpen(true);

    const handleOpenChatWithPhoto = async (e) => {
      const file = e.detail?.file;
      if (!file) return;
      setOpen(true);
      setUploading(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        setUploadedPhotos(prev => [...prev, result.file_url]);
      } catch (_) {
        toast.error('Erro ao fazer upload da foto');
      } finally {
        setUploading(false);
      }
    };

    window.addEventListener('openChat', handleOpenChat);
    window.addEventListener('openChatWithPhoto', handleOpenChatWithPhoto);
    return () => {
      window.removeEventListener('openChat', handleOpenChat);
      window.removeEventListener('openChatWithPhoto', handleOpenChatWithPhoto);
    };
  }, []);

  // Verificar configurações de áudio ao abrir
  const [configAudio, setConfigAudio] = useState({
    audio_respostas_ativo: true,
    audio_entrada_ativo: true
  });

  useEffect(() => {
    if (open) {
      const carregarConfigAudio = async () => {
        try {
          const response = await base44.functions.invoke('getConfigAssistente', {});
          if (response.data.success) {
            setConfigAudio({
              audio_respostas_ativo: response.data.config.audio_respostas_ativo ?? true,
              audio_entrada_ativo: response.data.config.audio_entrada_ativo ?? true
            });
          }
        } catch (error) {
          // Erro ao carregar config de áudio
        }
      };
      carregarConfigAudio();
    }
  }, [open]);

  const carregarHistorico = async () => {
    const isAuth = await base44.auth.isAuthenticated();

    if (!isAuth) {
      // Usuário não logado — saudação genérica
      setMensagens([{
        role: 'assistant',
        texto: 'Olá! 👋 Sou o DeMattos IA, assistente virtual da Barbearia DeMattos.\n\n💬 Posso ajudar você com:\n• Informações sobre serviços e produtos\n• Agendamentos\n• Horários de funcionamento\n• Dúvidas em geral\n\nComo posso te ajudar hoje?'
      }]);
      return;
    }

    // Usuário logado
    const user = await base44.auth.me();
    setUsuarioLogado(user);

    // Buscar dados do cliente cadastrado
    const clientesResponse = await base44.entities.Cliente.filter({ email: user.email });
    const primeiroNome = clientesResponse[0]?.nome?.split(' ')[0] || user.full_name?.split(' ')[0] || '';

    if (clientesResponse.length > 0) {
      const clienteData = clientesResponse[0];
      setCliente(clienteData);
      setUserCredits(clienteData.ai_credits || 0);

      // Carregar histórico
      const response = await base44.functions.invoke('getMinhasConversas', { cliente_id: clienteData.id });
      const historico = response.data.success ? response.data.conversas : [];

      if (historico.length > 0) {
        setMensagens(historico.map(h => ({
          role: h.role,
          texto: h.mensagem,
          fotos_urls: h.fotos_urls || [],
          previa_url: h.previa_url || null
        })));
      } else {
        setMensagens([{
          role: 'assistant',
          texto: `Olá, ${primeiroNome}! 👋\n\nSou o DeMattos IA, seu consultor pessoal!\n\n💬 Posso ajudar você com:\n• Análise de visagismo (envie suas fotos!)\n• Agendamentos de serviços\n• Informações sobre produtos\n• Dicas de cuidados\n\nComo posso te ajudar hoje?`
        }]);
      }
    } else {
      // Logado mas sem cadastro de Cliente
      setMensagens([{
        role: 'assistant',
        texto: `Olá, ${primeiroNome}! 👋\n\nSou o DeMattos IA, assistente virtual da Barbearia DeMattos.\n\n💬 Posso ajudar você com:\n• Informações sobre serviços e produtos\n• Agendamentos\n• Horários de funcionamento\n• Dúvidas em geral\n\nComo posso te ajudar hoje?`
      }]);
    }
  };

  const salvarMensagem = async (role, texto, fotos_urls = [], previa_url = null) => {
    const clienteId = cliente?.id || usuarioLogado?.id;
    if (clienteId) {
      try {
        await base44.functions.invoke('salvarMensagemChat', {
          cliente_id: clienteId,
          role,
          mensagem: texto,
          fotos_urls: fotos_urls || [],
          previa_url: previa_url || null
        });
      } catch (error) {
        // Erro ao salvar mensagem
      }
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    if (uploadedPhotos.length + files.length > 5) {
      toast.error('Você pode enviar no máximo 5 fotos');
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newPhotoUrls = results.map(r => r.file_url);
      
      setUploadedPhotos(prev => [...prev, ...newPhotoUrls]);
      toast.success(`${files.length} foto(s) adicionada(s)`);
    } catch (error) {
      toast.error('Erro ao fazer upload das fotos');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const refetchCredits = async () => {
    // SEGURANÇA: Recarregar créditos do cliente autenticado
    try {
      const user = await base44.auth.me();
      if (!user) return;
      
      const clientesResponse = await base44.entities.Cliente.filter({ 
        email: user.email 
      });
      
      if (clientesResponse.length > 0) {
        setUserCredits(clientesResponse[0].ai_credits || 0);
      }
    } catch (error) {
      // Erro ao recarregar créditos
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const calcularHorarioFim = (horarioInicio, duracaoMinutos) => {
    const [hora, min] = horarioInicio.split(':').map(Number);
    const totalMinutos = hora * 60 + min + duracaoMinutos;
    const horaFim = Math.floor(totalMinutos / 60).toString().padStart(2, '0');
    const minFim = (totalMinutos % 60).toString().padStart(2, '0');
    return `${horaFim}:${minFim}`;
  };

  const falarTexto = async (texto) => {
    if (!('speechSynthesis' in window)) return;

    try {
      // Buscar configurações
      const response = await base44.functions.invoke('getConfigAssistente', {});
      const config = response.data.success ? response.data.config : {
        voz_tipo: 'pt-BR-Female',
        velocidade_fala: 1.2,
        tom_voz: 1.1,
        volume: 1.0,
        audio_respostas_ativo: true
      };

      // Verificar se áudio de respostas está ativo
      if (!config.audio_respostas_ativo) return;

      // Cancelar qualquer fala anterior
      window.speechSynthesis.cancel();

      // Aguardar um pouco antes de falar
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = config.voz_tipo.includes('pt-BR') ? 'pt-BR' : 'pt-PT';
        utterance.rate = config.velocidade_fala;
        utterance.pitch = config.tom_voz;
        utterance.volume = config.volume;

        if (voicesLoaded) {
          const vozes = window.speechSynthesis.getVoices();
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

        utterance.onerror = (e) => {
          // Erro ao falar
        };

        window.speechSynthesis.speak(utterance);
      }, 100);
    } catch (error) {
      // Erro ao falar
    }
  };

  const toggleGravacao = async () => {
    if (!recognition) {
      toast.error('Seu navegador não suporta reconhecimento de voz');
      return;
    }

    // Verificar se entrada de áudio está habilitada
    try {
      const response = await base44.functions.invoke('getConfigAssistente', {});
      const config = response.data.success ? response.data.config : { audio_entrada_ativo: true };
      
      if (!config.audio_entrada_ativo) {
        toast.error('Entrada de áudio por voz está desabilitada pelo administrador');
        return;
      }
    } catch (error) {
      // Permitir se não houver configuração
    }

    if (gravando) {
      recognition.stop();
      setGravando(false);
    } else {
      recognition.start();
      setGravando(true);
    }
  };

  const enviarMensagem = async () => {
    if ((!inputMensagem.trim() && uploadedPhotos.length === 0) || enviando) return;

    const novaMensagem = inputMensagem.trim();
    const fotosParaEnviar = [...uploadedPhotos];
    setInputMensagem('');
    setUploadedPhotos([]);

    // Se há fotos e é um cliente logado, usar modo visagismo
    if (fotosParaEnviar.length > 0 && cliente) {
      // Verificar créditos
      if (userCredits <= 0) {
        toast.error('Você não tem créditos suficientes para análise de IA');
        setUploadedPhotos(fotosParaEnviar); // Restaurar fotos
        return;
      }

      setMensagens(prev => [...prev, { role: 'user', texto: novaMensagem || 'Analisar minhas fotos', fotos_urls: fotosParaEnviar }]);
      await salvarMensagem('user', novaMensagem || 'Analisar minhas fotos', fotosParaEnviar);
      setEnviando(true);
      setGerandoPrevia(true);

      try {
        // Análise de visagismo
        const promptVisagismo = `Você é um especialista em visagismo e estilismo masculino da Barbearia DeMattos.

Cliente: ${cliente.nome}
${cliente.profissao ? `Profissão: ${cliente.profissao}` : ''}

Mensagem do cliente: ${novaMensagem || 'Faça uma análise completa'}

INSTRUÇÕES:
1. Analise o formato do rosto nas fotos (oval, redondo, quadrado, triangular, etc)
2. Identifie características faciais (testa, queixo, maçãs do rosto)
3. Sugira estilos de corte de cabelo que harmonizem com o formato do rosto
4. Recomende estilos de barba apropriados
5. Dê dicas de manutenção e produtos

Seja específico, profissional e amigável. Use emojis moderadamente.`;

        const respostaIA = await base44.integrations.Core.InvokeLLM({
          prompt: promptVisagismo,
          file_urls: fotosParaEnviar
        });

        // Gerar prévia visual
        const promptImagem = `Homem com características similares às fotos de referência, com corte de cabelo moderno e estiloso sugerido pela análise de visagismo, barba bem feita, iluminação profissional de barbearia premium, fundo desfocado, alta qualidade, realista`;

        const imagemGerada = await base44.integrations.Core.GenerateImage({
          prompt: promptImagem,
          existing_image_urls: [fotosParaEnviar[0]]
        });

        setMensagens(prev => [...prev, { 
          role: 'assistant', 
          texto: respostaIA,
          previa_url: imagemGerada.url
        }]);
        await salvarMensagem('assistant', respostaIA, [], imagemGerada.url);

        // Descontar crédito
        const creditResponse = await base44.functions.invoke('consumirCreditoIA', {
          cliente_id: cliente.id
        });

        if (creditResponse.data.success) {
          setUserCredits(creditResponse.data.novos_creditos);
        }
        falarTexto(respostaIA);
      } catch (error) {
        toast.error('Erro ao processar análise de IA');
        setMensagens(prev => [...prev, { 
          role: 'assistant', 
          texto: 'Desculpe, ocorreu um erro ao processar sua análise. Tente novamente.' 
        }]);
      } finally {
        setEnviando(false);
        setGerandoPrevia(false);
      }
      return;
    }

    // Modo conversa normal
    setMensagens(prev => [...prev, { role: 'user', texto: novaMensagem }]);
    await salvarMensagem('user', novaMensagem);
    setEnviando(true);

    try {
      // Buscar dados do sistema via backend
      const contextoResponse = await base44.functions.invoke('getContextoChatPublico', {});
      
      if (!contextoResponse.data.success) {
        throw new Error('Erro ao carregar contexto');
      }

      const { servicos, produtos, profissionais, configuracoes, horarios } = contextoResponse.data;

      const historico = mensagens.map(m => ({
        role: m.role,
        content: m.texto
      }));

      const contextoDados = `
=== SERVIÇOS DISPONÍVEIS ===
${servicos.map(s => `- ${s.nome}: R$ ${s.preco.toFixed(2)} | ${s.duracao} minutos | ${s.descricao || ''}`).join('\n')}

=== PRODUTOS DISPONÍVEIS ===
${produtos.map(p => `- ${p.nome} (${p.tipo})`).join('\n')}

=== PROFISSIONAIS ===
${profissionais.map(p => {
  const servicosDoProfissional = servicos.filter(s => p.servicos_ids?.includes(s.id));
  return `- ${p.nome}: ${servicosDoProfissional.map(s => s.nome).join(', ')}`;
}).join('\n')}

=== HORÁRIOS DISPONÍVEIS (próximos dias) ===
${horarios.map(h => `${h.data} às ${h.horario} - ${h.profissional_nome}`).join('\n')}

=== CONFIGURAÇÕES ===
${configuracoes.map(c => `${c.chave}: ${c.valor}`).join('\n')}
`;

      const prompt = `Você é o assistente virtual da Barbearia DeMattos, uma barbearia premium e sofisticada. Você é descontraído, amigável e muito conhecedor.

DADOS DO SISTEMA:
${contextoDados}

INSTRUÇÕES CRÍTICAS PARA AGENDAMENTOS:
${cliente ? `1. CLIENTE LOGADO: ${cliente.nome} (${cliente.telefone})
2. PROFISSIONAL PADRÃO: Luan (use este se o cliente não especificar outro)
3. Ao confirmar agendamento, SEMPRE extraia:
   - PROFISSIONAL: Use "Luan" como padrão UNLESS cliente solicita outro explicitamente
   - SERVIÇO: Pergunte qual serviço deseja (obrigatório)
   - DATA: Confirme em formato YYYY-MM-DD
   - HORÁRIO: Confirme em formato HH:MM
4. ANTES de gerar [AGENDAR_CLIENTE], confirme repetindo os dados ao cliente
5. Formato da ação: [AGENDAR_CLIENTE|profissional_nome|servico_nome|YYYY-MM-DD|HH:MM|observacoes]
   - NÃO use IDs, use NOMES exatamente como estão na lista acima
   - Se não tiver observações, deixe em branco` : `1. CLIENTE NÃO LOGADO
2. Informe que precisa fazer login no Canal DeMattos para agendar pelo assistente
3. Ou pode agendar pela seção "Agende Seu Horário" na página principal`}

INSTRUÇÕES GERAIS:
1. SEMPRE consulte os dados acima para responder sobre serviços, produtos, profissionais e horários
2. Seja específico com preços, durações e disponibilidade
3. Seja natural, use emojis ocasionalmente, e seja prestativo

Histórico da conversa:
${historico.map(h => `${h.role === 'user' ? 'Cliente' : 'Assistente'}: ${h.content}`).join('\n')}

Cliente: ${novaMensagem}

Responda de forma natural e útil:`;

      const resposta = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      // Processar ações especiais
      let respostaFinal = resposta;
      
      if (resposta.includes('[AGENDAR_CLIENTE|')) {
        const match = resposta.match(/\[AGENDAR_CLIENTE\|([^\]]+)\]/);
        if (match && match[1]) {
          const partes = match[1].split('|').map(p => p?.trim());
          
          const profissionalNome = partes[0] || 'Luan';
          const servicoNome = partes[1];
          const data = partes[2];
          const horario = partes[3];
          const obs = partes[4] || '';

          try {
            
            // Validar dados obrigatórios
            if (!servicoNome || !data || !horario) {
              throw new Error(`Dados incompletos: serviço="${servicoNome}", data="${data}", horário="${horario}"`);
            }

            // Validar formato da data (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
              throw new Error(`Data inválida: "${data}". Use formato YYYY-MM-DD`);
            }

            // Validar formato do horário (HH:MM)
            if (!/^\d{2}:\d{2}$/.test(horario)) {
              throw new Error(`Horário inválido: "${horario}". Use formato HH:MM`);
            }

            // Testar se a data é válida
            const dataObj = new Date(`${data}T${horario}:00`);
            if (isNaN(dataObj.getTime())) {
              throw new Error('Data ou horário inválidos');
            }

            // Encontrar profissional (Luan como padrão)
            let profissional = profissionais.find(p => 
              p.nome.toLowerCase().trim() === profissionalNome.toLowerCase().trim()
            );
            
            if (!profissional) {
              profissional = profissionais.find(p => 
                p.nome.toLowerCase().includes('luan')
              );
            }

            // Encontrar serviço
            const servico = servicos.find(s => 
              s.nome.toLowerCase().trim() === servicoNome.toLowerCase().trim()
            );

            if (!profissional) {
              throw new Error(`Profissional não encontrado: "${profissionalNome}". Disponíveis: ${profissionais.map(p => p.nome).join(', ')}`);
            }

            if (!servico) {
              throw new Error(`Serviço não encontrado: "${servicoNome}". Disponíveis: ${servicos.map(s => s.nome).join(', ')}`);
            }

            // Criar agendamento via backend
            const agendamentoResponse = await base44.functions.invoke('criarAgendamentoChat', {
              cliente_id: cliente.id,
              profissional_nome: profissionalNome,
              servico_nome: servicoNome,
              data,
              horario,
              observacoes: obs
            });

            if (agendamentoResponse.data.error) {
              throw new Error(agendamentoResponse.data.error);
            }
            
            respostaFinal = resposta.replace(/\[AGENDAR_CLIENTE\|[^\]]+\]/, `✅ Agendamento realizado com sucesso!\n\n📅 ${data} às ${horario}\n💈 ${servicoNome}\n👤 ${profissionalNome}\n\nVocê pode visualizar no seu Canal DeMattos.`);
          } catch (error) {
            respostaFinal = resposta.replace(/\[AGENDAR_CLIENTE\|[^\]]+\]/, `❌ Erro: ${error.message}`);
          }
        }
      }

      setMensagens(prev => [...prev, { role: 'assistant', texto: respostaFinal }]);
      await salvarMensagem('assistant', respostaFinal);

      // Falar a resposta usando configurações do admin
      falarTexto(respostaFinal);
    } catch (error) {
      setMensagens(prev => [...prev, { 
        role: 'assistant', 
        texto: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.' 
      }]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante — oculto em mobile (nav inferior já tem o atalho IA) */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:block fixed bottom-6 right-6 z-20 pointer-events-auto"
      >
        <Button
          onClick={() => setOpen(true)}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8973D] hover:from-[#B8973D] hover:to-[#D4AF37] shadow-lg hover:shadow-xl transition-all duration-300 pointer-events-auto touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-black" />
        </Button>
      </motion.div>

      {/* Painel Lateral do Chat */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="right" 
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-full sm:w-[440px] h-screen sm:h-auto max-h-[85vh] sm:max-h-none p-0 flex flex-col"
        >
          {/* Usuário logado com cliente: usar DeMattos IA completo */}
          {isLoggedIn && cliente ? (
            <DeMattosIA cliente={cliente} />
          ) : (
          <>
          <SheetHeader className="px-6 py-4 border-b border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8973D] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div>
                  <SheetTitle className="text-white">DeMattos IA</SheetTitle>
                  <p className="text-xs text-gray-400">Seu Consultor Pessoal</p>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <AnimatePresence>
              {mensagens.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-[#0a0a0a] text-white border border-[#2a2a2a]'
                    }`}
                  >
                    {msg.fotos_urls && msg.fotos_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.fotos_urls.map((url, idx) => (
                          <img key={idx} src={url} alt="Foto enviada" className="w-16 h-16 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.texto}</p>
                    {msg.previa_url && (
                      <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                        <p className="text-xs text-gray-400 mb-2">✨ Prévia Visual Gerada:</p>
                        <img src={msg.previa_url} alt="Prévia" className="w-full rounded-lg" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {enviando && (
              <div className="flex justify-start">
                <div className="bg-[#0a0a0a] text-white border border-[#2a2a2a] rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
                  {gerandoPrevia && <p className="text-xs text-gray-400 mt-2">Gerando prévia visual...</p>}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-[#2a2a2a]">
            {uploadedPhotos.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {uploadedPhotos.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              {cliente && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading || enviando}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={uploading || enviando || uploadedPhotos.length >= 5}
                      className="border-[#2a2a2a] text-gray-400 hover:text-[#D4AF37] cursor-pointer"
                      asChild
                    >
                      <div>
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                      </div>
                    </Button>
                  </label>
                </>
              )}
              {configAudio.audio_entrada_ativo && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleGravacao}
                  className={`border-[#2a2a2a] ${
                    gravando 
                      ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                      : 'text-gray-400 hover:text-[#D4AF37]'
                  }`}
                >
                  {gravando ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              )}
              <Textarea
                value={inputMensagem}
                onChange={(e) => setInputMensagem(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviarMensagem();
                  }
                }}
                placeholder={gravando ? "Gravando..." : uploadedPhotos.length > 0 ? "Descreva o que você quer... (opcional)" : "Digite sua mensagem..."}
                disabled={enviando || gravando}
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white resize-none min-h-[80px] max-h-[120px]"
                rows={3}
              />
              <Button
                onClick={enviarMensagem}
                disabled={(!inputMensagem.trim() && uploadedPhotos.length === 0) || enviando}
                className="bg-[#D4AF37] hover:bg-[#B8973D] text-black touch-manipulation min-h-[44px]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            {gravando && (
              <p className="text-xs text-[#D4AF37] mt-2 text-center animate-pulse">
                Ouvindo... Fale agora
              </p>
            )}
            {cliente && uploadedPhotos.length > 0 && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                📸 {uploadedPhotos.length}/5 fotos • Custará 1 crédito
              </p>
            )}
          </div>
          </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}