import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook centralizado que busca TODOS os dados da Home em uma única chamada.
 * Evita rate limit (429) ao substituir ~12 chamadas individuais por 1.
 */
export function useHomeData() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['home-data'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getHomeData', {});
      return response.data?.success ? response.data : null;
    },
    retry: 2,
    retryDelay: 1500,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    homeData: data,
    isLoading,
    error,
    // Atalhos para cada seção
    hero: data?.hero || [],
    sobre: data?.sobre || null,
    totalAtendimentos: data?.totalAtendimentos || 0,
    atendimentosPorProfissional: data?.atendimentosPorProfissional || {},
    servicos: data?.servicos || [],
    profissionais: data?.profissionais || [],
    produtos: data?.produtos || [],
    galeria: data?.galeria || [],
    depoimentos: data?.depoimentos || [],
    configuracoes: data?.configuracoes || [],
    instagram: data?.instagram || { ativa: false, videos: [] },
  };
}