import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AIDescriptionAssistant({ serviceName, onUseDescription }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (userMessage) => {
    if (!userMessage.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const context = serviceName 
        ? `O usuário está criando uma descrição para o serviço "${serviceName}" em uma barbearia.` 
        : 'O usuário está criando uma descrição para um serviço de barbearia.';

      const conversationHistory = newMessages
        .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
        .join('\n');

      const prompt = `${context}

Você é um assistente especializado em criar descrições profissionais e atrativas para serviços de barbearia. 
Suas descrições devem ser concisas (2-3 frases), persuasivas e destacar os benefícios do serviço.

Histórico da conversa:
${conversationHistory}

Responda de forma natural e útil. Se o usuário pedir uma descrição, forneça uma descrição pronta para uso.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
      });

      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Desculpe, ocorreu um erro. Tente novamente.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = () => {
    if (serviceName) {
      sendMessage(`Crie uma descrição profissional e atrativa para o serviço "${serviceName}"`);
    } else {
      sendMessage('Preciso de ajuda para criar uma descrição de serviço de barbearia');
    }
  };

  const handleUseLastDescription = () => {
    const lastAssistantMessage = messages
      .filter(m => m.role === 'assistant')
      .pop();
    
    if (lastAssistantMessage) {
      onUseDescription(lastAssistantMessage.content);
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Assistente IA
      </Button>
    );
  }

  return (
    <div className="border border-[#D4AF37]/30 rounded-lg bg-[#0a0a0a] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="font-medium text-white">Assistente de Descrição</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {messages.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm mb-3">
            Olá! Estou aqui para ajudar você a criar uma descrição profissional.
          </p>
          <Button
            type="button"
            onClick={handleQuickStart}
            className="bg-[#D4AF37] hover:bg-[#B8973D] text-black text-sm"
          >
            Gerar Descrição Agora
          </Button>
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-[#D4AF37]/10 text-white ml-8'
                  : 'bg-[#1a1a1a] text-gray-300 mr-8'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[#D4AF37] text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Pensando...
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Digite sua mensagem..."
          disabled={loading}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
        />
        <Button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-[#D4AF37] hover:bg-[#B8973D] text-black"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {messages.some(m => m.role === 'assistant') && (
        <Button
          type="button"
          onClick={handleUseLastDescription}
          className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black"
        >
          Usar Última Descrição
        </Button>
      )}
    </div>
  );
}