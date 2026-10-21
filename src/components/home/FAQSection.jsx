import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Como funciona o agendamento?',
    answer: 'Você pode agendar pelo nosso formulário ou diretamente pelo WhatsApp. Nossa equipe responderá em até 1 hora confirmando o melhor horário disponível para você.',
  },
  {
    question: 'Vocês atendem sem agendamento?',
    answer: 'Sim, atendemos por ordem de chegada quando há disponibilidade. Porém, recomendamos o agendamento para garantir seu horário e evitar espera.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos Pix, cartões de débito e crédito (Visa, Master, Elo), dinheiro e também vale-presente.',
  },
  {
    question: 'Quanto tempo dura cada serviço?',
    answer: 'O corte masculino leva em média 40 minutos. A barba completa, cerca de 30 minutos. O combo premium pode levar até 1h20 dependendo dos tratamentos escolhidos.',
  },
  {
    question: 'Vocês fazem cortes infantis?',
    answer: 'Sim! Atendemos crianças a partir de 3 anos com todo cuidado e paciência. Temos ambiente adaptado para os pequenos.',
  },
  {
    question: 'Posso levar minha própria referência de corte?',
    answer: 'Com certeza! Inclusive recomendamos que traga fotos de referência. Assim podemos adaptar o estilo ao seu tipo de cabelo e formato de rosto.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="py-24 bg-[#111111]">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="text-[#D4AF37] text-sm tracking-[0.2em] uppercase font-light">
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-4" style={{ fontFamily: 'Georgia, serif' }}>
            Perguntas{' '}
            <span className="text-[#D4AF37]">Frequentes</span>
          </h2>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={`w-full text-left bg-[#1a1a1a] border rounded-xl p-6 transition-all duration-300 ${
                  openIndex === index ? 'border-[#D4AF37]/50' : 'border-[#2a2a2a]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className={`w-5 h-5 transition-colors ${
                      openIndex === index ? 'text-[#D4AF37]' : 'text-gray-400'
                    }`} />
                  </motion.div>
                </div>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-gray-400 mt-4 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}