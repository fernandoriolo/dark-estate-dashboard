import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ImovelVivaReal {
  id: number;
  listing_id: string | null;
  imagens: string[] | null;
  tipo_categoria: string | null;
  tipo_imovel: string | null;
  descricao: string | null;
  preco: number | null;
  tamanho_m2: number | null;
  quartos: number | null;
  banheiros: number | null;
  ano_construcao: number | null;
  suite: number | null;
  garagem: number | null;
  features: string[] | null;
  andar: number | null;
  blocos: number | null;
  cidade: string | null;
  bairro: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  user_id: string | null;
  company_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useImoveisVivaReal() {
  const [imoveis, setImoveis] = useState<ImovelVivaReal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);

  const refetch = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('imoveisvivareal')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setImoveis((data as ImovelVivaReal[]) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar imóveis');
    } finally {
      setLoading(false);
    }
  };

  const createImovel = async (novo: Omit<ImovelVivaReal, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'company_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: insertError } = await supabase
        .from('imoveisvivareal')
        .insert([{ ...novo, user_id: user.id }])
        .select()
        .single();

      if (insertError) throw insertError;
      await refetch();
      return data as ImovelVivaReal;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar imóvel');
      return null;
    }
  };

  const updateImovel = async (id: number, updates: Partial<ImovelVivaReal>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('imoveisvivareal')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      await refetch();
      return data as ImovelVivaReal;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar imóvel');
      return null;
    }
  };

  const deleteImovel = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('imoveisvivareal')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setImoveis(prev => prev.filter(i => i.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar imóvel');
      return false;
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (subscribedRef.current) return;

    const channel = supabase
      .channel(`imoveisvivareal-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'imoveisvivareal' },
        () => refetch()
      );

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        subscribedRef.current = true;
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        subscribedRef.current = false;
      }
    };
  }, []);

  return { imoveis, loading, error, refetch, createImovel, updateImovel, deleteImovel };
}


