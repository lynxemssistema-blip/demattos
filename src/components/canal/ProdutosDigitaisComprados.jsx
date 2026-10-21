import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileText, Download, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export default function ProdutosDigitaisComprados({ clienteEmail }) {
  const { data: compras = [], isLoading } = useQuery({
    queryKey: ['compras-digitais', clienteEmail],
    queryFn: async () => {
      const response = await base44.functions.invoke('getMinhasCompras', { 
        email: clienteEmail 
      });
      return response.data.success ? response.data.compras.filter(c => c.produto_tipo === 'digital') : [];
    }
  });

  const handleDownload = (produto) => {
    if (!produto.produto_arquivo_pdf_url) {
      toast.error('Arquivo não disponível');
      return;
    }
    
    // Abrir em nova aba para download
    window.open(produto.produto_arquivo_pdf_url, '_blank');
    toast.success('Download iniciado!');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Carregando produtos...</p>
      </div>
    );
  }

  if (compras.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Nenhum produto digital comprado ainda</p>
        <p className="text-gray-500 text-sm mt-2">
          Explore nosso catálogo de produtos digitais exclusivos!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {compras.map((compra) => (
        <div
          key={compra.id}
          className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-4 flex-1">
              <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">{compra.produto_nome}</h3>
                <p className="text-gray-400 text-sm mb-2">
                  Comprado em {new Date(compra.created_date).toLocaleDateString('pt-BR')}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-semibold">
                    R$ {compra.valor.toFixed(2)}
                  </span>
                  <span className="text-green-500 text-xs">• Pago</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleDownload(compra)}
              size="sm"
              className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}