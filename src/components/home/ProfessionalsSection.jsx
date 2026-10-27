import React from 'react';
import { motion } from 'framer-motion';
import { User, Scissors, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';

export default function ProfessionalsSection({ profissionais = [], servicos = [], atendimentosPorProfissional = {} }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start', loop: false,
    breakpoints: { '(min-width: 768px)': { slidesToScroll: 2 }, '(min-width: 1024px)': { slidesToScroll: 3 } }
  });

  const scrollPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (profissionais.length === 0) return null;

  return (
    <section id="profissionais" className="py-20 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Nossa <span className="text-[#D4AF37]">Equipe</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Profissionais experientes e dedicados para cuidar do seu visual</p>
        </motion.div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className={`flex gap-6 ${profissionais.length <= 3 ? 'justify-center' : ''}`}>
              {profissionais.map((profissional, index) => (
                <motion.div key={profissional.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex-[0_0_100%] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] min-w-0">
                  <div className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 md:p-6 hover:border-[#D4AF37]/30 transition-all duration-500 h-full">
                    <div className="relative mb-4">
                      {profissional.foto_url ? (
                        <img src={profissional.foto_url} alt={profissional.nome} className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto border-4 border-[#D4AF37]/20 group-hover:border-[#D4AF37]/40 transition-all" />
                      ) : (
                        <div className="w-20 h-20 md:w-32 md:h-32 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto">
                          <User className="w-10 h-10 md:w-16 md:h-16 text-[#D4AF37]" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-white text-center mb-2">{profissional.nome}</h3>
                    <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
                      <div className="bg-[#D4AF37]/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-[#D4AF37]/30">
                        <span className="text-[#D4AF37] font-semibold text-sm md:text-base">{atendimentosPorProfissional[profissional.id] || 0}</span>
                        <span className="text-gray-400 text-xs md:text-sm ml-1">atendimentos realizados</span>
                      </div>
                    </div>
                    {profissional.historico_profissional && (
                      <p className="text-gray-400 text-sm text-center mb-3 md:mb-4 line-clamp-2 md:line-clamp-3 hidden md:block">{profissional.historico_profissional}</p>
                    )}
                    <div className="pt-3 md:pt-4 border-t border-[#2a2a2a]">
                      <div className="flex items-center gap-2 mb-2 md:mb-3">
                        <Scissors className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#D4AF37]" />
                        <span className="text-gray-400 text-xs md:text-sm font-medium">Especialidades:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {profissional.servicos_ids && profissional.servicos_ids.length > 0 ? (
                          profissional.servicos_ids.slice(0, window.innerWidth < 768 ? 4 : profissional.servicos_ids.length).map((servicoId) => {
                            const servico = servicos.find(s => s.id === servicoId);
                            return servico ? (
                              <span key={servicoId} className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 md:px-3 rounded-full border border-[#D4AF37]/30">
                                {servico.nome}
                              </span>
                            ) : null;
                          })
                        ) : (
                          <span className="text-xs text-gray-500">Nenhuma especialidade cadastrada</span>
                        )}
                      </div>
                    </div>
                    <Button onClick={() => document.querySelector('#agendamento')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full mt-4 md:mt-6 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-sm md:text-base py-3 md:py-2.5 touch-manipulation"
                      style={{ WebkitTapHighlightColor: 'transparent' }}>
                      Agendar com {profissional.nome.split(' ')[0]}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          {profissionais.length > 3 && (
            <>
              <button onClick={scrollPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-[#1a1a1a] hover:bg-[#D4AF37] border border-[#2a2a2a] text-white p-3 rounded-full transition-all duration-300 hidden lg:flex items-center justify-center touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={scrollNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-[#1a1a1a] hover:bg-[#D4AF37] border border-[#2a2a2a] text-white p-3 rounded-full transition-all duration-300 hidden lg:flex items-center justify-center touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}