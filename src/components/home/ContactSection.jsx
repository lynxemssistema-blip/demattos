import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, Send, CheckCircle } from 'lucide-react';
import { useAgendamento } from '../agendamento/useAgendamento';
import { AgendamentoFormFields } from '../agendamento/AgendamentoFormFields';

export default function ContactSection({ configuracoes = [] }) {
  const {
    formData,
    setFormData,
    horariosDisponiveis,
    clienteExistente,
    usuarioLogado,
    submitted,
    loading,
    loadingHorarios,
    verificandoCliente,
    profissionais,
    servicos,
    handleSubmit,
    userInteractedRef,
    refreshHorarios,
  } = useAgendamento();

  const getConfig = (chave, defaultValue = '') => {
    const config = configuracoes.find(c => c && c.chave === chave);
    return config ? config.valor : defaultValue;
  };


  const telefone = getConfig('telefone', '(31) 99999-9999');
  const endereco = getConfig('endereco', 'Rua Exemplo, 123 - Centro\nBelo Horizonte, MG');
  const horarioSemana = getConfig('horario_semana', '09:00 - 20:00');
  const horarioSabado = getConfig('horario_sabado', '09:00 - 18:00');
  const horarioDomingo = getConfig('horario_domingo', 'Fechado');

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1a1a1a] border border-[#D4AF37] rounded-2xl p-12 max-w-md mx-4 text-center"
        >
          <div className="w-20 h-20 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-black" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-4">Agendamento Confirmado!</h3>
          <p className="text-gray-300 text-lg">
            Seu horário foi reservado com sucesso.
          </p>
        </motion.div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1a1a1a] border border-[#D4AF37] rounded-2xl p-12 max-w-md mx-4 text-center"
        >
          <div className="w-20 h-20 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Clock className="w-12 h-12 text-[#D4AF37]" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Processando seu agendamento...</h3>
          <p className="text-gray-300">
            Por favor, aguarde. Não feche esta página.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <section id="agendamento" className="pt-10 lg:py-24 bg-[#0a0a0a]" style={{ paddingBottom: 'max(6rem, calc(3.5rem + env(safe-area-inset-bottom, 16px)))' }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Form - Aparece primeiro no mobile */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-5 lg:p-8">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6">
                <AgendamentoFormFields
                  formData={formData}
                  setFormData={setFormData}
                  profissionais={profissionais}
                  servicos={servicos}
                  horariosDisponiveis={horariosDisponiveis}
                  loadingHorarios={loadingHorarios}
                  usuarioLogado={usuarioLogado}
                    clienteExistente={clienteExistente}
                    verificandoCliente={verificandoCliente}
                    userInteractedRef={userInteractedRef}
                    onRefreshHorarios={refreshHorarios}
                  />
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold py-5 sm:py-4 lg:py-6 text-base sm:text-base lg:text-lg tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Send className="w-5 h-5 mr-2" />
                  {loading ? 'Processando...' : 'Confirmar Agendamento'}
                </Button>

                <p className="text-gray-500 text-xs text-center">
                  Ao enviar, você concorda com nossa política de privacidade.
                </p>
              </form>
            </div>
          </motion.div>

          {/* Info - Aparece depois no mobile */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1"
          >
            <span className="text-[#D4AF37] text-sm tracking-[0.2em] uppercase font-light">
              Agende Seu Horário
            </span>
            <h2 className="text-2xl lg:text-5xl font-bold text-white mt-4 mb-4 lg:mb-6" style={{ fontFamily: 'Georgia, serif' }}>
              Pronto Para{' '}
              <span className="text-[#D4AF37]">Transformar</span>{' '}
              Seu Visual?
            </h2>
            <p className="text-gray-400 mb-6 lg:mb-10 leading-relaxed hidden lg:block">
              Preencha o formulário e nossa equipe entrará em contato via WhatsApp 
              para confirmar o melhor horário para você.
            </p>

            {/* Contact Info */}
            <div className="space-y-4 lg:space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 lg:w-12 lg:h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm lg:text-base">Localização</h4>
                  <p className="text-gray-400 text-xs lg:text-sm whitespace-pre-line">{endereco}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 lg:w-12 lg:h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 lg:w-5 lg:h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm lg:text-base">Telefone / WhatsApp</h4>
                  <p className="text-gray-400 text-xs lg:text-sm">{telefone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 lg:w-12 lg:h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm lg:text-base">Horário de Funcionamento</h4>
                  <p className="text-gray-400 text-xs lg:text-sm">
                    {horarioSemana && `Seg - Sex: ${horarioSemana}`}<br />
                    {horarioSabado && `Sábado: ${horarioSabado}`}<br />
                    {horarioDomingo && `Domingo: ${horarioDomingo}`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}