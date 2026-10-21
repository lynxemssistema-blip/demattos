import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Award, Users } from 'lucide-react';

export default function AboutSection({ sobre, totalAtendimentos = 0 }) {
  const secao = sobre || {
    tag_superior: "Nossa História",
    titulo_parte1: "A Arte de Cuidar do",
    titulo_parte2: "Homem Moderno",
    paragrafo1: "A Barbearia DeMattos nasceu da paixão genuína pelo ofício de barbeiro.",
    paragrafo2: "Nossa filosofia vai além do simples corte de cabelo.",
    paragrafo3: "No nosso espaço, tradição e modernidade coexistem em harmonia.",
    imagem_url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
    destaque1_titulo: "Técnicas Premium",
    destaque1_subtitulo: "Cortes modernos e clássicos",
    destaque2_titulo: "Atendimento VIP",
    destaque2_subtitulo: "Experiência personalizada",
    atendimentos_base: 5000
  };

  const total = (secao.atendimentos_base || 5000) + totalAtendimentos;

  return (
    <section id="sobre" className="py-20 sm:py-24 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
              <img src={secao.imagem_url} alt="Barbearia DeMattos" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <div className="absolute -bottom-8 -right-4 md:right-8 bg-[#1a1a1a] border border-[#D4AF37]/20 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                  <Award className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{total}+</div>
                  <div className="text-gray-400 text-sm">Atendimentos Realizados</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <span className="text-[#D4AF37] text-sm tracking-[0.2em] uppercase font-light">{secao.tag_superior}</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
              {secao.titulo_parte1} <span className="text-[#D4AF37]">{secao.titulo_parte2}</span>
            </h2>
            <div className="space-y-4 text-gray-300 font-light leading-relaxed">
              <p>{secao.paragrafo1}</p>
              <p>{secao.paragrafo2}</p>
              <p>{secao.paragrafo3}</p>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Scissors className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">{secao.destaque1_titulo}</h4>
                  <p className="text-gray-400 text-sm">{secao.destaque1_subtitulo}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">{secao.destaque2_titulo}</h4>
                  <p className="text-gray-400 text-sm">{secao.destaque2_subtitulo}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}