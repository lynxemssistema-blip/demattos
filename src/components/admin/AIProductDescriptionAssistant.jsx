import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIProductDescriptionAssistant({ productName, currentDescription, pdfUrl, comboContext, onUseDescription }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [context, setContext] = useState('');

  const generateDescription = async () => {
    if (!productName) {
      toast.error('Preencha o nome do produto primeiro');
      return;
    }

    setLoading(true);
    setGeneratedText('');

    try {
      // Se tem PDF, extrai o texto primeiro para evitar limite de tamanho
      let pdfContent = '';
      if (pdfUrl) {
        try {
          const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: pdfUrl,
            json_schema: {
              type: 'object',
              properties: {
                conteudo: { type: 'string', description: 'Todo o conteúdo textual do PDF, incluindo títulos, parágrafos, listas e qualquer texto presente' }
              }
            }
          });
          if (extracted?.status === 'success' && extracted?.output?.conteudo) {
            pdfContent = extracted.output.conteudo;
          }
        } catch {
          // Se falhar extração, continua sem o PDF
        }
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um copywriter sênior especialista em marketing de alta conversão para produtos masculinos premium.

${comboContext ? `COMBO DE PRODUTOS: "${productName}"

PRODUTOS INCLUÍDOS NO COMBO:
${comboContext}

Escreva uma descrição de vendas que destaque o valor de ter todos esses conteúdos juntos, como um sistema completo de transformação masculina.` : `PRODUTO: "${productName}"`}
${currentDescription ? `DESCRIÇÃO ATUAL: "${currentDescription}"` : ''}
${context ? `CONTEXTO ADICIONAL: "${context}"` : ''}
${pdfContent ? `\nCONTEÚDO REAL DO PDF DO PRODUTO:\n---\n${pdfContent.slice(0, 8000)}\n---\nBaseie o texto de vendas exclusivamente neste conteúdo real do produto.` : ''}

Escreva uma descrição de vendas profissional e poderosa. Siga esta estrutura:

1. Abertura impactante — uma frase que prende imediatamente (sem apresentar o produto ainda)
2. O problema real — descreva a situação que o cliente vive antes de ter esse conhecimento
3. A virada — apresente o produto como a solução natural e inevitável
4. O que está dentro — liste de forma clara e direta o que o cliente vai aprender ou receber
5. A transformação — mostre quem ele será depois, o resultado concreto na vida dele
6. Fechamento e chamada para ação — direto, confiante, sem rodeios

REGRAS ABSOLUTAS:
- ZERO emojis
- ZERO asteriscos ou símbolos de formatação markdown
- ZERO títulos com numeração ou bullets visíveis
- Escreva em parágrafos corridos, fluidos, como um texto editorial de revista masculina premium
- Linguagem direta, sofisticada e confiante
- Sem clichês de marketing barato
- Tom: especialista que fala com outro homem que quer evoluir
- Português brasileiro impecável

O resultado deve parecer escrito por um copywriter humano de alto nível, não por uma IA.`,
        model: 'claude_sonnet_4_6'
      });

      setGeneratedText(result);
    } catch (error) {
      toast.error('Erro ao gerar descrição. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    onUseDescription(generatedText);
    setOpen(false);
    toast.success('Descrição aplicada!');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    setOpen(true);
    if (!generatedText) {
      generateDescription();
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 gap-1.5 text-xs"
      >
        <Sparkles className="w-3.5 h-3.5" />
        IA Marketing
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              Assistente de Marketing IA
            </DialogTitle>
            <p className="text-sm text-gray-400">Gerando descrição de vendas poderosa para: <span className="text-[#D4AF37]">{productName || '...'}</span></p>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Contexto adicional */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Contexto adicional (opcional) — o que o produto ensina, para quem é, diferenciais...
              </label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: guia completo de visagismo masculino com 50 páginas, ensina formato de rosto, tipos de corte, barba..."
                rows={2}
                className="bg-[#0a0a0a] border-[#2a2a2a] resize-none text-sm"
              />
            </div>

            {/* Texto gerado */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Descrição gerada pela IA:</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateDescription}
                  disabled={loading}
                  className="text-gray-400 hover:text-white gap-1.5 text-xs h-7"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Gerar novamente
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[350px] bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                    <p className="text-sm">{pdfUrl ? 'Lendo o PDF e criando o texto de marketing...' : 'Criando texto de marketing poderoso...'}</p>
                  </div>
                ) : generatedText ? (
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{generatedText}</p>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    Clique em "Gerar novamente" para criar a descrição
                  </div>
                )}
              </div>
            </div>

            {/* Ações */}
            {generatedText && !loading && (
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopy}
                  className="border-[#2a2a2a] text-gray-400 hover:text-white gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
                <Button
                  type="button"
                  onClick={handleUse}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold gap-2"
                >
                  <Check className="w-4 h-4" />
                  Usar esta descrição
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}