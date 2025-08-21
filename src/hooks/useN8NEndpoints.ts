import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { N8NEndpoint, EndpointCategory } from '@/lib/n8n/types';
import { useUserProfile } from './useUserProfile';

export function useN8NEndpoints() {
  const { profile, isAdmin } = useUserProfile();
  const [endpoints, setEndpoints] = useState<N8NEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar endpoints (apenas ADMINs)
  const loadEndpoints = useCallback(async () => {
    try {
      if (!profile || !isAdmin) {
        console.log('🔐 N8N: Apenas ADMINs podem gerenciar endpoints');
        setEndpoints([]);
        return;
      }

      console.log('📡 N8N: Carregando endpoints...');

      const { data, error } = await supabase
        .from('n8n_endpoints')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;

      console.log(`✅ N8N: ${data?.length || 0} endpoints carregados`);
      setEndpoints(data || []);

    } catch (error: any) {
      console.error('❌ N8N: Erro ao carregar endpoints:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [profile, isAdmin]);

  // Criar endpoint
  const createEndpoint = useCallback(async (endpointData: Omit<N8NEndpoint, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>) => {
    try {
      if (!profile || !isAdmin) {
        throw new Error('Apenas ADMINs podem criar endpoints');
      }

      console.log('➕ N8N: Criando endpoint:', endpointData);

      const { data, error } = await supabase
        .from('n8n_endpoints')
        .insert({
          ...endpointData,
          company_id: profile.company_id,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ N8N: Endpoint criado:', data);
      await loadEndpoints(); // Recarregar lista
      return data;

    } catch (error: any) {
      console.error('❌ N8N: Erro ao criar endpoint:', error);
      throw error;
    }
  }, [profile, isAdmin, loadEndpoints]);

  // Atualizar endpoint
  const updateEndpoint = useCallback(async (id: string, updates: Partial<N8NEndpoint>) => {
    try {
      if (!profile || !isAdmin) {
        throw new Error('Apenas ADMINs podem atualizar endpoints');
      }

      console.log('📝 N8N: Atualizando endpoint:', id, updates);

      const { data, error } = await supabase
        .from('n8n_endpoints')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('company_id', profile.company_id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ N8N: Endpoint atualizado:', data);
      await loadEndpoints(); // Recarregar lista
      return data;

    } catch (error: any) {
      console.error('❌ N8N: Erro ao atualizar endpoint:', error);
      throw error;
    }
  }, [profile, isAdmin, loadEndpoints]);

  // Deletar endpoint
  const deleteEndpoint = useCallback(async (id: string) => {
    try {
      if (!profile || !isAdmin) {
        throw new Error('Apenas ADMINs podem deletar endpoints');
      }

      console.log('🗑️ N8N: Deletando endpoint:', id);

      const { error } = await supabase
        .from('n8n_endpoints')
        .delete()
        .eq('id', id)
        .eq('company_id', profile.company_id);

      if (error) throw error;

      console.log('✅ N8N: Endpoint deletado');
      await loadEndpoints(); // Recarregar lista

    } catch (error: any) {
      console.error('❌ N8N: Erro ao deletar endpoint:', error);
      throw error;
    }
  }, [profile, isAdmin, loadEndpoints]);

  // Obter endpoints por categoria
  const getEndpointsByCategory = useCallback((category: EndpointCategory) => {
    return endpoints.filter(endpoint => endpoint.category === category);
  }, [endpoints]);

  // Obter endpoint por chave
  const getEndpointByKey = useCallback((endpointKey: string) => {
    return endpoints.find(endpoint => endpoint.endpoint_key === endpointKey);
  }, [endpoints]);

  // Ativar/Desativar endpoint
  const toggleEndpoint = useCallback(async (id: string, isActive: boolean) => {
    return updateEndpoint(id, { is_active: isActive });
  }, [updateEndpoint]);

  useEffect(() => {
    if (profile) {
      loadEndpoints();
    }
  }, [profile, loadEndpoints]);

  // Subscription para mudanças em tempo real (apenas para ADMINs)
  useEffect(() => {
    if (!profile || !isAdmin) return;

    const subscription = supabase
      .channel('n8n_endpoints_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'n8n_endpoints',
          filter: `company_id=eq.${profile.company_id}`
        },
        () => {
          console.log('🔄 N8N: Endpoints alterados, recarregando...');
          loadEndpoints();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, isAdmin, loadEndpoints]);

  return {
    endpoints,
    loading,
    error,
    isAdmin,
    profile,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    toggleEndpoint,
    getEndpointsByCategory,
    getEndpointByKey,
    refreshEndpoints: loadEndpoints
  };
}