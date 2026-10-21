import React from 'react';
import { Instagram, Facebook, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
  });

  const getConfig = (chave, defaultValue = '') => {
    const config = configs.find(c => c.chave === chave);
    return config ? config.valor : defaultValue;
  };

  const telefone = getConfig('telefone', '(31) 99999-9999');
  const endereco = getConfig('endereco', 'Rua Exemplo, 123\nCentro, Belo Horizonte - MG');

  return (
    <footer 
      className="bg-[#0a0a0a] border-t border-[#1a1a1a]"
      style={{ paddingBottom: 'max(4rem, calc(1rem + env(safe-area-inset-bottom)))' }}
    >
      {/* Marquee */}
      <div className="overflow-hidden py-4 bg-[#D4AF37]/5 border-b border-[#1a1a1a]">
        <div className="animate-marquee whitespace-nowrap flex">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="mx-8 text-[#D4AF37]/40 text-sm tracking-widest">
              BARBEARIA DEMATTOS ◆ TRADIÇÃO & ESTILO ◆
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              BARBEARIA <span className="text-[#D4AF37]">DEMATTOS</span>
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Há mais de uma década transformando homens através da arte do corte 
              e do cuidado pessoal. Tradição e estilo em cada detalhe.
            </p>
            
            {/* Social */}
            <div className="flex gap-4 mt-6">
              <a
                href="https://instagram.com/demattosvisage"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-300"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <a href="#sobre" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm">
                  Sobre Nós
                </a>
              </li>
              <li>
                <a href="#servicos" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm">
                  Serviços
                </a>
              </li>
              <li>
                <a href="#galeria" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm">
                  Galeria
                </a>
              </li>
              <li>
                <a href="#depoimentos" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm">
                  Depoimentos
                </a>
              </li>
              <li>
                <a href="#faq" className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm">
                  FAQ
                </a>
              </li>
              <li>
                <Link to={createPageUrl('Admin')} className="text-gray-400 hover:text-[#D4AF37] transition-colors text-sm">
                  Painel Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contato</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 text-sm whitespace-pre-line">
                  {endereco}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span className="text-gray-400 text-sm">{telefone}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-[#1a1a1a] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} Barbearia DeMattos. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-sm">
            Feito com ♥ para nossos clientes
          </p>
        </div>
      </div>
    </footer>
  );
}