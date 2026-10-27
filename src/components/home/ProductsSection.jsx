import React from 'react';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, FileText, Download, Eye, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import useEmblaCarousel from 'embla-carousel-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const DESCRICAO_MAX = 80;

function formatarTextoRevista(texto) {
  const partes = texto.split(/(?<=\.)\s{2,}|\n\n+/).filter(p => p.trim().length > 0);
  if (partes.length <= 1) {
    const sentences = texto.match(/[^.!?]+[.!?]+/g) || [texto];
    const grupos = [];
    let grupo = '';
    for (const s of sentences) {
      grupo += s + ' ';
      if (grupo.length >= 120) { grupos.push(grupo.trim()); grupo = ''; }
    }
    if (grupo.trim()) grupos.push(grupo.trim());
    return grupos.length > 1 ? grupos : [texto];
  }
  return partes;
}

function DescricaoProduto({ texto }) {
  if (!texto) return null;
  if (texto.length <= DESCRICAO_MAX) return <p className="text-gray-400 text-sm leading-relaxed mb-6">{texto}</p>;
  const paragrafos = formatarTextoRevista(texto);
  return (
    <Popover>
      <p className="text-gray-400 text-sm leading-relaxed mb-6">
        {texto.slice(0, DESCRICAO_MAX).trim()}...{' '}
        <PopoverTrigger asChild>
          <button className="text-[#D4AF37] text-xs underline underline-offset-2 hover:text-[#B8973D] transition-colors cursor-pointer">ler mais</button>
        </PopoverTrigger>
      </p>
      <PopoverContent side="bottom" align="start" avoidCollisions={true} className="max-w-xs bg-[#1a1a1a] border border-[#D4AF37]/30 text-gray-300 text-sm leading-relaxed p-4 shadow-xl">
        <div className="space-y-3">
          {paragrafos.map((p, i) => <p key={i} className={i === 0 ? "text-white font-medium" : "text-gray-400"}>{p.trim()}</p>)}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const defaultProducts = [
  { nome: 'Pomada Modeladora', descricao: 'Fixação forte e brilho natural para penteados modernos.', preco: 35, estoque: 10 },
  { nome: 'Óleo para Barba', descricao: 'Hidratação profunda e aroma marcante.', preco: 45, estoque: 15 },
  { nome: 'Shampoo Premium', descricao: 'Limpeza profunda sem ressecar os fios.', preco: 40, estoque: 8 },
  { nome: 'Cera Texturizadora', descricao: 'Acabamento matte com controle total.', preco: 38, estoque: 12 },
];

export default function ProductsSection({ produtos: produtosDB = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, align: 'start', slidesToScroll: 1,
    breakpoints: { '(min-width: 768px)': { slidesToScroll: 2 }, '(min-width: 1024px)': { slidesToScroll: 4 } }
  });

  const produtos = produtosDB.length > 0 ? produtosDB : defaultProducts;

  const adicionarAoCarrinho = async (produto) => {
    try {
      const itemTipo = produto._item_kind === 'combo' ? 'combo' : 'produto';
      const user = await base44.auth.me();
      if (user) {
        await base44.entities.ItemCarrinho.create({
          cliente_email: user.email, item_tipo: itemTipo, item_id: produto.id,
          item_nome: produto.nome, item_preco: produto.preco, quantidade: 1,
          produto_tipo: produto.tipo, produto_arquivo_pdf_url: produto.arquivo_pdf_url || null
        });
      } else {
        const carrinhoLocal = JSON.parse(localStorage.getItem('carrinho_temp') || '[]');
        const itemExistente = carrinhoLocal.find(item => item.item_id === produto.id && item.item_tipo === itemTipo);
        if (itemExistente) { itemExistente.quantidade += 1; }
        else { carrinhoLocal.push({ item_tipo: itemTipo, item_id: produto.id, item_nome: produto.nome, item_preco: produto.preco, quantidade: 1, produto_tipo: produto.tipo }); }
        localStorage.setItem('carrinho_temp', JSON.stringify(carrinhoLocal));
      }
      toast.success(`${produto.nome} adicionado ao carrinho!`);
    } catch (error) {
      toast.error('Erro ao adicionar ao carrinho');
    }
  };

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <section id="produtos" className="py-20 sm:py-24 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
          <span className="text-[#D4AF37] text-sm tracking-[0.2em] uppercase font-light">Nossos Produtos</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-4" style={{ fontFamily: 'Georgia, serif' }}>
            Produtos <span className="text-[#D4AF37]">Premium</span>
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">Seleção exclusiva de produtos profissionais para cuidados masculinos.</p>
        </motion.div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {produtos.map((produto, index) => (
                <div key={produto.id || produto.nome} className="flex-[0_0_100%] md:flex-[0_0_48%] lg:flex-[0_0_23%] min-w-0">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 hover:border-[#D4AF37]/30 transition-all duration-500 flex flex-col h-full">
                    {produto.imagem_url && (
                      <div className="w-full h-48 mb-6 rounded-xl overflow-hidden bg-[#0a0a0a]">
                        <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    {!produto.imagem_url && (
                      <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/20 transition-colors duration-300">
                        {produto.tipo === 'digital' ? <FileText className="w-8 h-8 text-[#D4AF37]" /> : <Package className="w-8 h-8 text-[#D4AF37]" />}
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      {produto._item_kind === 'combo' ? (
                        <span className="text-xs px-2 py-1 rounded-full border bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30">📦 Combo</span>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full border ${produto.tipo === 'digital' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30'}`}>
                          {produto.tipo === 'digital' ? 'Digital' : 'Físico'}
                        </span>
                      )}
                    </div>
                    {produto.creditos_ia > 0 && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-500/30 flex items-center gap-1"><Award className="w-3 h-3" />+{produto.creditos_ia} IA</span>
                      </div>
                    )}
                    {produto.creditos_ia <= 0 && produto.tipo === 'fisico' && produto.estoque <= 5 && produto.estoque > 0 && (
                      <div className="absolute top-4 right-4"><span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded-full border border-yellow-500/30">Últimas unidades</span></div>
                    )}
                    {produto.creditos_ia <= 0 && produto.tipo === 'fisico' && produto.estoque === 0 && (
                      <div className="absolute top-4 right-4"><span className="bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded-full border border-red-500/30">Esgotado</span></div>
                    )}
                    <h3 className="text-xl font-semibold text-white mb-3">{produto.nome}</h3>
                    <DescricaoProduto texto={produto.descricao} />
                    <div className="flex-grow"></div>
                    <div className="space-y-2">
                      {produto.tipo === 'digital' && produto.arquivo_previa_url && (
                        <a href={produto.arquivo_previa_url} target="_blank" rel="noopener noreferrer" className="w-full">
                          <Button size="sm" className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"><Eye className="w-4 h-4 mr-2" />Ver Prévia Grátis</Button>
                        </a>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-[#D4AF37] font-semibold text-lg">R$ {produto.preco.toFixed(2)}</div>
                        <Button onClick={() => adicionarAoCarrinho(produto)} size="sm" className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                          disabled={produto.tipo === 'fisico' && produto.estoque === 0}>
                          {produto._item_kind === 'combo' || produto.tipo === 'digital' ? (<><Download className="w-4 h-4 mr-1" />Adquirir</>) : (<><ShoppingCart className="w-4 h-4 mr-1" />Comprar</>)}
                        </Button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={scrollPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-[#D4AF37] hover:bg-[#B8973D] rounded-full flex items-center justify-center text-black transition-all duration-300 shadow-lg z-10"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={scrollNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-[#D4AF37] hover:bg-[#B8973D] rounded-full flex items-center justify-center text-black transition-all duration-300 shadow-lg z-10"><ChevronRight className="w-6 h-6" /></button>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 }} className="text-center mt-12">
          <p className="text-gray-400 mb-4">Produtos físicos disponíveis para retirada no local. Produtos digitais com download imediato após confirmação do pagamento.</p>
          <Link to={createPageUrl('Catalogo')}><Button className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">Ver Catálogo Completo</Button></Link>
        </motion.div>
      </div>
    </section>
  );
}