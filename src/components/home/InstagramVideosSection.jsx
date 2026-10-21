import React from 'react';
import { Video, Instagram, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';

export default function InstagramVideosSection({ instagram = { ativa: false, videos: [] } }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, align: 'start', slidesToScroll: 1,
    breakpoints: { '(min-width: 768px)': { slidesToScroll: 2 }, '(min-width: 1024px)': { slidesToScroll: 3 } }
  });

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  if (!instagram.ativa || !instagram.videos || instagram.videos.length === 0) return null;

  const videos = instagram.videos;

  return (
    <section className="py-20 sm:py-24 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <span className="text-[#D4AF37] text-sm tracking-[0.2em] uppercase font-light">Nossos Trabalhos</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-4" style={{ fontFamily: 'Georgia, serif' }}>
            Transformações <span className="text-[#D4AF37]">Incríveis</span>
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">Confira as transformações e resultados dos nossos clientes</p>
        </motion.div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {videos.map((video, index) => (
                <div key={video.id} className="flex-[0_0_100%] md:flex-[0_0_48%] lg:flex-[0_0_31%] min-w-0">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-[#D4AF37]/30 transition-all duration-500 flex flex-col h-full">
                    <div className="aspect-[9/16] bg-black relative overflow-hidden">
                      {video.video_url ? (
                        <video src={video.video_url} poster={video.thumbnail_url} controls controlsList="nodownload" className="w-full h-full object-cover" playsInline />
                      ) : video.thumbnail_url ? (
                        <a href={video.url_instagram || '#'} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative group">
                          <img src={video.thumbnail_url} alt={video.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {video.url_instagram && (
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                              <div className="bg-[#D4AF37] rounded-full p-4 group-hover:scale-110 transition-transform"><Instagram className="w-6 h-6 text-black" /></div>
                            </div>
                          )}
                        </a>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Video className="w-16 h-16 text-gray-600" /></div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-semibold text-white mb-3">{video.titulo}</h3>
                      {video.descricao && <p className="text-gray-400 text-sm leading-relaxed">{video.descricao}</p>}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
          {videos.length > 1 && (
            <>
              <button onClick={scrollPrev} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-[#D4AF37] hover:bg-[#B8973D] rounded-full items-center justify-center text-black transition-all duration-300 shadow-lg z-10" aria-label="Vídeo anterior">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={scrollNext} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-[#D4AF37] hover:bg-[#B8973D] rounded-full items-center justify-center text-black transition-all duration-300 shadow-lg z-10" aria-label="Próximo vídeo">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 }} className="text-center mt-12">
          <a href="https://instagram.com/demattosvisage" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#D4AF37] hover:bg-[#B8973D] text-black font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-[#D4AF37]/50">
            <Instagram className="w-5 h-5" /> Siga no Instagram
          </a>
        </motion.div>
      </div>
    </section>
  );
}