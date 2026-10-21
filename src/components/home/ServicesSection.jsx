import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Sparkles, Droplets, Crown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { useAuth } from '@/lib/AuthContext';

const iconMap = {
  'Scissors': Scissors,
  'Sparkles': Sparkles,
  'Droplets': Droplets,
  'Crown': Crown,
};

const defaultServices = [
  { icon: Scissors, title: 'Corte Masculino', description: 'Cortes modernos e clássicos adaptados ao seu estilo e formato de rosto.', price: 'A partir de R$ 45' },
  { icon: Sparkles, title: 'Barba Completa', description: 'Modelagem, desenho e hidratação para uma barba impecável.', price: 'A partir de R$ 35' },
  { icon: Crown, title: 'Combo Premium', description: 'Corte + Barba + Sobrancelha com tratamento completo.', price: 'A partir de R$ 80' },
  { icon: Droplets, title: 'Tratamentos', description: 'Hidratação, pigmentação e cuidados especiais para cabelo e barba.', price: 'Sob consulta' },
];

export default function ServicesSection({ servicos: servicosDB = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, align: 'start', slidesToScroll: 1,
    breakpoints: { '(min-width: 768px)': { slidesToScroll: 2 }, '(min-width: 1024px)': { slidesToScroll: 4 } }
  });
  const { user } = useAuth();
  const [servicosSelecionados, setServicosSelecionados] = useState([]);

  const toggleServico = (servicoId) => {
    setServicosSelecionados(prev => prev.includes(servicoId) ? prev.filter(id => id !== servicoId) : [...prev, servicoId]);
  };

  const scrollToAgendamento = () => {
    sessionStorage.setItem('servicosSelecionados', JSON.stringify(servicosSelecionados));
    document.querySelector('#agendamento')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  const services = servicosDB.length > 0
    ? servicosDB.map((servico) => ({
        id: servico.id,
        icon: iconMap[servico.icone] || Scissors,
        title: servico.nome,
        description: servico.descricao,
        price: servico.preco > 0 ? `A partir de R$ ${servico.preco}` : 'Sob consulta',
      }))
    : defaultServices;

  return (
    <section id="servicos" className="py-20 sm:py-24 bg-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <span className="text-[#D4AF37] text-sm tracking-[0.2em] uppercase font-light">Nossos Serviços</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-4" style={{ fontFamily: 'Georgia, serif' }}>
            Serviços que <span className="text-[#D4AF37]">Transformam</span>
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
            Oferecemos uma experiência completa de cuidado masculino, com técnicas modernas e produtos de alta qualidade.
          </p>
        </motion.div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {services.map((service, index) => (
                <div key={service.title} className="flex-[0_0_100%] md:flex-[0_0_48%] lg:flex-[0_0_23%] min-w-0">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`group relative bg-[#1a1a1a] border rounded-2xl p-8 transition-all duration-500 flex flex-col h-full ${
                      user && servicosSelecionados.includes(service.id) ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#2a2a2a] hover:border-[#D4AF37]/30'
                    }`}
                  >
                    {user && service.id && (
                      <button onClick={() => toggleServico(service.id)} className="absolute top-4 right-4 w-8 h-8 md:w-6 md:h-6 rounded-full border-2 border-[#D4AF37] flex items-center justify-center transition-colors touch-manipulation"
                        style={{ backgroundColor: servicosSelecionados.includes(service.id) ? '#D4AF37' : 'transparent', WebkitTapHighlightColor: 'transparent' }}>
                        {servicosSelecionados.includes(service.id) && <Check className="w-5 h-5 md:w-4 md:h-4 text-black" />}
                      </button>
                    )}
                    <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/20 transition-colors duration-300">
                      <service.icon className="w-8 h-8 text-[#D4AF37]" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">{service.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">{service.description}</p>
                    <div className="flex-grow"></div>
                    <div className="text-[#D4AF37] font-semibold mb-4">{service.price}</div>
                    {user && service.id && (
                      <Button onClick={scrollToAgendamento} className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold py-3 md:py-2 touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
                        Agendar
                      </Button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={scrollPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-[#D4AF37] hover:bg-[#B8973D] rounded-full flex items-center justify-center text-black transition-all duration-300 shadow-lg z-10 touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={scrollNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-[#D4AF37] hover:bg-[#B8973D] rounded-full flex items-center justify-center text-black transition-all duration-300 shadow-lg z-10 touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 }} className="text-center mt-12">
          <p className="text-gray-400 mb-4">Não encontrou o que procura? Entre em contato para serviços personalizados.</p>
        </motion.div>
      </div>
    </section>
  );
}