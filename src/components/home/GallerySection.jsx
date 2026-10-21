import React from 'react';
import { motion } from 'framer-motion';

const defaultImages = [
  { url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80', alt: 'Ambiente da barbearia', colSpan: 'col-span-2', rowSpan: 'row-span-2' },
  { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80', alt: 'Corte de cabelo', colSpan: 'col-span-1', rowSpan: 'row-span-1' },
  { url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80', alt: 'Barbeiro em ação', colSpan: 'col-span-1', rowSpan: 'row-span-1' },
  { url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=80', alt: 'Tratamento de barba', colSpan: 'col-span-1', rowSpan: 'row-span-1' },
  { url: 'https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&q=80', alt: 'Detalhes do salão', colSpan: 'col-span-1', rowSpan: 'row-span-1' },
];

export default function GallerySection({ galeria = [] }) {
  const images = galeria.length > 0 ? galeria : defaultImages;

  return (
    <section id="galeria" className="py-20 sm:py-24 bg-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <span className="text-[#D4AF37] text-sm tracking-[0.2em] uppercase font-light">Galeria</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-4" style={{ fontFamily: 'Georgia, serif' }}>
            Nosso <span className="text-[#D4AF37]">Espaço</span>
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">Conheça o ambiente pensado para proporcionar a melhor experiência</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {images.map((image, index) => (
            <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative overflow-hidden rounded-xl group ${image.colSpan} ${image.rowSpan}`}>
              <img src={image.url} alt={image.alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-white text-lg font-medium">{image.alt}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}