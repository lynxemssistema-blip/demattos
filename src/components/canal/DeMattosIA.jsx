import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Upload, Send, Image as ImageIcon, Loader2, X, Coins, Mic, MicOff, Plus } from 'lucide-react';
import { createPageUrl } from '@/utils';
import ComprarCreditos from '../ComprarCreditos';
import { toast } from 'sonner';

export default function DeMattosIA({ cliente }) {
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [fotos, setFotos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [gravando, setGravando] = useState(false);
  const [imagensComNomes, setImagensComNomes] = useState([]);
  const [comprarCreditosOpen, setComprarCreditosOpen] = useState(false);
  const fileInputRef = useRef(null);
  const mensagensEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    carregarHistorico();
    carregarCreditos();
    inicializarReconhecimentoVoz();
  }, []);

  const inicializarReconhecimentoVoz = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognitionRef.current.onerror = () => {
        setGravando(false);
      };

      recognitionRef.current.onend = () => {
        setGravando(false);
      };
    }
  };

  const toggleGravacao = () => {
    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não é suportado neste navegador.');
      return;
    }

    if (gravando) {
      recognitionRef.current.stop();
      setGravando(false);
    } else {
      recognitionRef.current.start();
      setGravando(true);
    }
  };

  const carregarCreditos = async () => {
    try {
      const response = await base44.functions.invoke('getDeMattosData', { 
        cliente_id: cliente.id 
      });
      if (response.data.success) {
        setUserCredits(response.data.credits);
      }
    } catch (error) {
      // Erro ao carregar créditos
    }
  };

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const carregarHistorico = async () => {
    try {
      const response = await base44.functions.invoke('getDeMattosData', { 
        cliente_id: cliente.id 
      });
      
      if (response.data.success && response.data.conversas.length > 0) {
        const msgs = response.data.conversas.map(conv => ({
          role: conv.role,
          content: conv.mensagem,
          fotos: conv.fotos_urls || [],
          previa: conv.previa_url
        }));
        setMensagens(msgs);
      } else {
        // Mensagem de boas-vindas
        setMensagens([{
          role: 'assistant',
          content: `Olá ${cliente.nome.split(' ')[0]}! 👋

Sou o **DeMattos**, seu especialista em visagismo masculino e geração de imagens personalizadas.

**Como funciona:**
1. Envie até 5 fotos suas (frontal, perfil, 3/4 são ideais)
2. Me conte o que você busca: corte, barba, estilo
3. Receba análise completa + **imagem visual gerada** do resultado

**Ou simplesmente descreva o visual que deseja e eu crio uma imagem de referência para você!**

Pronto para começar? Envie suas fotos ou descreva o visual desejado! 💈✨`
        }]);
      }
    } catch (error) {
      // Erro ao carregar histórico
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (fotos.length + files.length > 5) {
      toast.error('Máximo de 5 fotos por análise.');
      return;
    }

    setUploadando(true);
    try {
      const uploads = await Promise.all(
        files.map(file => base44.integrations.Core.UploadFile({ file }))
      );
      setFotos([...fotos, ...uploads.map(u => u.file_url)]);
    } catch (error) {
      toast.error('Erro ao fazer upload das fotos');
    } finally {
      setUploadando(false);
    }
  };

  const removerFoto = (index) => {
    setFotos(fotos.filter((_, i) => i !== index));
  };

  const enviarMensagem = async () => {
    if (!input.trim() && fotos.length === 0) return;

    // Parar gravação se estiver ativa
    if (gravando && recognitionRef.current) {
      recognitionRef.current.stop();
      setGravando(false);
    }

    const novaMensagemUsuario = {
      role: 'user',
      content: input,
      fotos: [...fotos]
    };

    setMensagens(prev => [...prev, novaMensagemUsuario]);
    setInput('');
    setFotos([]);
    setEnviando(true);

    try {
      // Enviar mensagem via backend com status de créditos
      const response = await base44.functions.invoke('sendDeMattosMessage', {
        cliente_id: cliente.id,
        mensagem: input,
        fotos_urls: novaMensagemUsuario.fotos,
        has_credits: userCredits > 0
      });

      if (response.data.error) {
        setMensagens(prev => [...prev, {
          role: 'assistant',
          content: response.data.error === 'Créditos insuficientes' 
            ? 'Você não tem créditos suficientes. Compre mais créditos para continuar.' 
            : 'Erro ao processar mensagem. Tente novamente.'
        }]);
        setEnviando(false);
        return;
      }

      const { resposta, previa_url, produto_recomendado, novos_creditos } = response.data;

      const novaMensagemAssistente = {
        role: 'assistant',
        content: resposta,
        previa: previa_url,
        produto: produto_recomendado,
        comparacao: input.toLowerCase().includes('comparar') || input.toLowerCase().includes('organizar') || input.toLowerCase().includes('lado a lado')
      };

      // Adicionar imagens à lista com nomes
      const novasImagensComNomes = [];
      if (novaMensagemUsuario.fotos.length > 0) {
        novaMensagemUsuario.fotos.forEach((foto, idx) => {
          const nomeImg = `img${imagensComNomes.length + novasImagensComNomes.length + 1}`;
          novasImagensComNomes.push({ nome: nomeImg, url: foto, tipo: 'enviada' });
        });
      }
      if (previa_url) {
        const nomeImg = `img${imagensComNomes.length + novasImagensComNomes.length + 1}`;
        novasImagensComNomes.push({ nome: nomeImg, url: previa_url, tipo: 'previa' });
      }

      if (novasImagensComNomes.length > 0) {
        setImagensComNomes(prev => [...prev, ...novasImagensComNomes]);
      }

      setMensagens(prev => [...prev, novaMensagemAssistente]);
      setUserCredits(novos_creditos);

    } catch (error) {
      setMensagens(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente.'
      }]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/30 p-3 sm:p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#D4AF37] rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-semibold text-sm sm:text-base truncate">DeMattos IA</h3>
              <p className="text-gray-400 text-xs sm:text-sm truncate">Especialista em Visagismo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 sm:gap-2 bg-[#D4AF37]/20 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#D4AF37]/30 flex-1 sm:flex-initial">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
              <span className={`font-semibold text-sm sm:text-base ${userCredits <= 0 ? 'text-red-400' : 'text-[#D4AF37]'}`}>
                {userCredits}
              </span>
              <span className="text-gray-400 text-xs sm:text-sm">créditos</span>
            </div>
            <Button
              onClick={() => setComprarCreditosOpen(true)}
              size="sm"
              className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold text-xs sm:text-sm flex-shrink-0"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">Comprar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-6 w-full">
        {mensagens.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'bg-[#D4AF37] text-black' : 'bg-[#1a1a1a] text-white'} rounded-lg p-3 sm:p-4`}>
              {msg.fotos && msg.fotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2 sm:mb-3">
                  {msg.fotos.map((foto, i) => (
                    <img key={i} src={foto} alt={`Foto ${i + 1}`} className="rounded-lg w-full h-24 sm:h-32 object-cover" />
                  ))}
                </div>
              )}
              <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed break-words">{msg.content}</p>

              {/* Grid de Comparação */}
              {msg.comparacao && imagensComNomes.length > 0 && (
                <div className="mt-3 sm:mt-4">
                  <p className="text-xs opacity-70 mb-2 sm:mb-3 text-center">Catálogo de Imagens:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {imagensComNomes.slice(-6).map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img.url} alt={img.nome} className="rounded-lg w-full h-24 sm:h-32 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 rounded-b-lg">
                          <p className="text-xs text-center text-white font-semibold">{img.nome}</p>
                          <p className="text-[10px] text-center text-gray-400">{img.tipo === 'enviada' ? 'Foto' : 'Prévia'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prévia Individual */}
              {msg.previa && !msg.comparacao && (
                <div className="mt-3 sm:mt-4 flex flex-col items-center">
                  <p className="text-xs opacity-70 mb-2">Prévia Visual:</p>
                  <img src={msg.previa} alt="Prévia" className="rounded-lg max-w-full sm:max-w-md w-full object-contain" />
                </div>
              )}

              {/* Produto Recomendado */}
              {msg.produto && (
                <div className="mt-3 sm:mt-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-2.5 sm:p-3">
                  <p className="text-xs text-[#D4AF37] font-semibold mb-2">📚 Recomendação</p>
                  <div className="flex gap-2 sm:gap-3 items-start">
                    {msg.produto.imagem_url && (
                      <img src={msg.produto.imagem_url} alt={msg.produto.nome} className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-xs sm:text-sm truncate">{msg.produto.nome}</h4>
                      {msg.produto.descricao && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{msg.produto.descricao}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-[#D4AF37] font-bold text-xs sm:text-sm">R$ {msg.produto.preco.toFixed(2)}</span>
                        <Button
                          size="sm"
                          className="bg-[#D4AF37] hover:bg-[#B8973D] text-black text-xs h-6 sm:h-7 px-2 sm:px-3"
                          onClick={() => window.open(createPageUrl('Catalogo'), '_blank')}
                        >
                          Ver
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] rounded-lg p-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
              <span className="text-gray-400 text-sm">DeMattos está analisando...</span>
            </div>
          </div>
        )}
        <div ref={mensagensEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[#2a2a2a] p-3 sm:p-4 space-y-2 sm:space-y-3 w-full flex-shrink-0">
        {/* Fotos Preview */}
        {fotos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {fotos.map((foto, i) => (
              <div key={i} className="relative">
                <img src={foto} alt={`Preview ${i + 1}`} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover" />
                <button
                  onClick={() => removerFoto(i)}
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-1.5 sm:gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadando || fotos.length >= 5 || userCredits <= 0}
            variant="outline"
            size="icon"
            className="border-[#2a2a2a] text-[#D4AF37] flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10"
            title={userCredits <= 0 ? 'Créditos necessários' : ''}
          >
            {uploadando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </Button>
          <Button
            onClick={toggleGravacao}
            disabled={enviando || userCredits <= 0}
            variant="outline"
            size="icon"
            className={`border-[#2a2a2a] flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 ${gravando ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'text-[#D4AF37]'}`}
            title={userCredits <= 0 ? 'Créditos necessários' : ''}
          >
            {gravando ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={userCredits <= 0 ? "Sem créditos" : "Descreva o que busca..."}
            rows={2}
            className="flex-1 bg-[#0a0a0a] border-[#2a2a2a] text-white text-sm sm:text-base resize-none min-w-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
              }
            }}
          />
          <Button
            onClick={enviarMensagem}
            disabled={enviando || (!input.trim() && fotos.length === 0)}
            size="icon"
            className="bg-[#D4AF37] hover:bg-[#B8973D] text-black flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 text-center">
          {fotos.length}/5 fotos
          {userCredits <= 0 && <span className="text-red-400 block sm:inline"> • Sem créditos</span>}
        </p>
      </div>

      {/* Modal Comprar Créditos */}
      <ComprarCreditos 
        open={comprarCreditosOpen} 
        onOpenChange={setComprarCreditosOpen}
        onSuccess={() => {
          carregarCreditos();
          setComprarCreditosOpen(false);
        }}
      />
    </div>
  );
}