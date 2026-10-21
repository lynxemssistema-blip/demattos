import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fallbackImage = {
  url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80',
  alt: 'Profissional Barbearia DeMattos'
};

export default function HeroSection({ hero = [] }) {
  const [imagemAtual, setImagemAtual] = useState(0);

  const imagensCarrossel = hero.length > 0 ? hero : [fallbackImage];

  useEffect(() => {
    if (imagensCarrossel.length <= 1) return;
    const interval = setInterval(() => {
      setImagemAtual((prev) => (prev + 1) % imagensCarrossel.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [imagensCarrossel.length]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&q=80')` }}
      >
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-6">
              <span className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase font-light">Tradição & Estilo</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              BARBEARIA <span className="text-[#D4AF37]">DEMATTOS</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-gray-300 text-lg md:text-xl mb-10 font-light leading-relaxed">
              Onde tradição encontra estilo. Há mais de uma década transformando homens através da arte do corte e do cuidado pessoal.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button onClick={() => scrollToSection('agendamento')} className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold px-8 py-6 text-lg tracking-wide transition-all duration-300">
                AGENDAR HORÁRIO
              </Button>
              <Button onClick={() => scrollToSection('servicos')} className="bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 px-8 py-6 text-lg tracking-wide transition-all duration-300">
                NOSSOS SERVIÇOS
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-[#D4AF37]">13+</div>
                <div className="text-gray-400 text-sm mt-1">Anos de Experiência</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-[#D4AF37]">5K+</div>
                <div className="text-gray-400 text-sm mt-1">Clientes Atendidos</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl font-bold text-[#D4AF37]">100%</div>
                <div className="text-gray-400 text-sm mt-1">Satisfação</div>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.4 }} className="hidden lg:flex justify-center items-center">
            <div className="relative w-full max-w-md h-[600px]">
              <div className="absolute inset-0 bg-[#D4AF37]/20 blur-3xl rounded-full" />
              <AnimatePresence mode="wait">
                {imagensCarrossel.length > 0 && (
                  <motion.img
                    key={imagemAtual}
                    src={imagensCarrossel[imagemAtual].url}
                    alt={imagensCarrossel[imagemAtual].alt}
                    initial={{ opacity: 0, scale: 0.9, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -50 }}
                    transition={{ duration: 1.2, ease: [0.43, 0.13, 0.23, 0.96] }}
                    className="relative z-10 w-full h-full object-contain"
                  />
                )}
              </AnimatePresence>
              {imagensCarrossel.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-3">
                  {imagensCarrossel.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setImagemAtual(index)}
                      className={`h-1 rounded-full transition-all duration-700 ease-out ${index === imagemAtual ? 'bg-[#D4AF37] w-10 shadow-lg shadow-[#D4AF37]/50' : 'bg-white/40 w-4 hover:bg-white/60'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.2 }} className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer" onClick={() => scrollToSection('sobre')}>
        <div className="flex flex-col items-center text-gray-400 hover:text-[#D4AF37] transition-colors">
          <span className="text-xs tracking-widest uppercase mb-2">Role para descobrir</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}