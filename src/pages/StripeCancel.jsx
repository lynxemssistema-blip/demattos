import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StripeCancel() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center max-w-md w-full"
      >
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Compra Cancelada</h2>
        <p className="text-gray-400 mb-8">
          Sua compra foi cancelada. Você pode tentar novamente quando quiser.
        </p>
        <div className="space-y-3">
          <Link to={createPageUrl('Catalogo')}>
            <Button className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold">
              Voltar ao Catálogo
            </Button>
          </Link>
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="w-full border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#1a1a1a]">
              Voltar para Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}