import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, User } from 'lucide-react';

const defaultTestimonials = [
  { name: 'Ricardo Mendes', role: 'Empresário', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80', text: 'Frequento a DeMattos há 3 anos. O atendimento é impecável e o resultado sempre supera as expectativas. Recomendo a todos!', rating: 5 },
  { name: 'Felipe Andrade', role: 'Advogado', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80', text: 'Ambiente premium e profissionais que realmente entendem do que fazem. A melhor barbearia que já frequentei em BH.', rating: 5 },
  { name: 'Marcos Silva', role: 'Engenheiro', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80', text: 'O cuidado com os detalhes é impressionante. Sempre saio de lá me sentindo renovado e confiante.', rating: 5 },
  { name: 'André Lima', role: 'Médico', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&q=80', text: 'Profissionalismo e qualidade em cada atendimento. O combo premium vale cada centavo investido.', rating: 5 },
];

export default function TestimonialsSection({ depoimentos = [] }) {
  const testimonials = depoimentos.length > 0
    ? depoimentos.map(dep => ({
        name: dep.cliente_nome,
        role: dep.cliente_profissao || 'Cliente',
        image: dep.cliente_foto_url || null,
        text: dep.texto,
        rating: dep.avaliacao,
      }))
    : defaultTestimonials;

  return (
    <section id="depoimentos" className="py-20 sm:py-24 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <span className="text-[#D4AF37] text-sm tracking-[0.2em] uppercase font-light">Depoimentos</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-4" style={{ fontFamily: 'Georgia, serif' }}>
            O Que Nossos Clientes <span className="text-[#D4AF37]">Dizem</span>
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">Mais de 5.000 clientes satisfeitos que confiam no nosso trabalho</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div key={testimonial.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8">
              <div className="absolute top-6 right-6 opacity-10"><Quote className="w-12 h-12 text-[#D4AF37]" /></div>
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" />)}
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">"{testimonial.text}"</p>
              <div className="flex items-center gap-4">
                {testimonial.image ? (
                  <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37]/30" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                )}
                <div>
                  <div className="text-white font-semibold">{testimonial.name}</div>
                  <div className="text-gray-400 text-sm">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}