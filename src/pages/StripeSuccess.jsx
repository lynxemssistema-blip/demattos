import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle, Loader2, Download, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function StripeSuccess() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState([]);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);

  useEffect(() => {
    const sid = urlParams.get('session_id');
    setSessionId(sid);

    const init = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioLogado(user);

        if (user) {
          // Aguardar webhook processar (pequeno delay)
          await new Promise(res => setTimeout(res, 2000));
          // Buscar compras confirmadas recentes
          const response = await base44.functions.invoke('getMinhasCompras', {});
          if (response.data?.compras) {
            // Pegar compras das últimas 5 minutos
            const agora = Date.now();
            const recentes = response.data.compras.filter(c => {
              const criada = new Date(c.created_date).getTime();
              return (agora - criada) < 5 * 60 * 1000 && c.status_pagamento === 'confirmado';
            });
            setCompras(recentes);
          }
        }
      } catch (e) {
        // não logado ou erro
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const produtosDigitais = compras.filter(c => c.produto_tipo === 'digital' && c.produto_arquivo_pdf_url);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center max-w-lg w-full"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37]" />
            <p className="text-gray-400">Confirmando seu pagamento...</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Compra Confirmada!</h2>
            <p className="text-gray-400 mb-2">
              Seu pagamento foi processado com sucesso.
            </p>

            {/* Produtos digitais para download imediato */}
            {produtosDigitais.length > 0 ? (
              <div className="mt-6 space-y-3">
                <p className="text-[#D4AF37] font-semibold text-sm mb-3">⬇️ Seus produtos estão prontos!</p>
                {produtosDigitais.map(c => (
                  <a
                    key={c.id}
                    href={c.produto_arquivo_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-bold gap-2">
                      <Download className="w-5 h-5" />
                      Baixar: {c.produto_nome}
                    </Button>
                  </a>
                ))}
                <p className="text-gray-500 text-xs mt-2">
                  📧 O link também foi enviado para seu email
                </p>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Mail className="w-4 h-4 text-[#D4AF37]" />
                <span>O link para download foi enviado para seu email</span>
              </div>
            )}

            <div className="mt-8 space-y-3">
              {usuarioLogado && (
                <Button
                  onClick={() => navigate(createPageUrl('CanalCliente'))}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-bold"
                >
                  Ir para o Canal do Cliente
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('Home'))}
                className="w-full border-[#2a2a2a] text-gray-400 hover:text-white"
              >
                Voltar ao Início
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}