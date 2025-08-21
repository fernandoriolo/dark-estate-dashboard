import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

interface GlobalN8NConfig {
  id?: string;
  company_id: string;
  hmac_secret: string;
  default_bearer_token: string;
  default_timeout_ms: number;
  retry_attempts: number;
  created_at?: string;
  updated_at?: string;
}

export function useGlobalN8NConfig() {
  const { profile, isAdmin } = useUserProfile();
  const [config, setConfig] = useState<GlobalN8NConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar configuração global
  const loadConfig = useCallback(async () => {
    try {
      if (!profile || !isAdmin) {
        console.log('🔐 GlobalN8N: Apenas ADMINs podem gerenciar configurações globais');
        setConfig(null);
        return;
      }

      console.log('📡 GlobalN8N: Carregando configuração global...');

      const { data, error } = await supabase
        .from('global_n8n_config')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      console.log('✅ GlobalN8N: Configuração carregada:', data ? 'Encontrada' : 'Não existe');
      setConfig(data);

    } catch (error: any) {
      console.error('❌ GlobalN8N: Erro ao carregar configuração:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [profile, isAdmin]);

  // Salvar configuração global
  const saveConfig = useCallback(async (configData: Omit<GlobalN8NConfig, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (!profile || !isAdmin) {
        throw new Error('Apenas ADMINs podem salvar configurações globais');
      }

      console.log('💾 GlobalN8N: Salvando configuração global...', configData);

      const configToSave = {
        ...configData,
        company_id: profile.company_id,
        is_active: true,
        updated_at: new Date().toISOString(),
        created_by: profile.id,
        updated_by: profile.id
      };

      let result;

      if (config?.id) {
        // Atualizar configuração existente
        const { data, error } = await supabase
          .from('global_n8n_config')
          .update(configToSave)
          .eq('id', config.id)
          .eq('company_id', profile.company_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Criar nova configuração
        const newConfig = {
          ...configToSave,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('global_n8n_config')
          .insert(newConfig)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      console.log('✅ GlobalN8N: Configuração salva:', result);
      setConfig(result);
      return result;

    } catch (error: any) {
      console.error('❌ GlobalN8N: Erro ao salvar configuração:', error);
      throw error;
    }
  }, [profile, isAdmin, config]);

  // Aplicar configuração a todos os endpoints
  const applyToAllEndpoints = useCallback(async (bearerToken: string) => {
    try {
      if (!profile || !isAdmin) {
        throw new Error('Apenas ADMINs podem aplicar configurações globais');
      }

      console.log('🔄 GlobalN8N: Aplicando Bearer Token a todos os endpoints...');

      const { data, error } = await supabase
        .from('n8n_endpoints')
        .update({ 
          bearer_token: bearerToken,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', profile.company_id)
        .select();

      if (error) throw error;

      console.log(`✅ GlobalN8N: Bearer Token aplicado a ${data.length} endpoints`);
      return data;

    } catch (error: any) {
      console.error('❌ GlobalN8N: Erro ao aplicar configuração:', error);
      throw error;
    }
  }, [profile, isAdmin]);

  // Gerar HMAC secret aleatório
  const generateHMACSecret = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  // Validar configuração
  const validateConfig = useCallback((configData: Partial<GlobalN8NConfig>) => {
    const errors: string[] = [];

    if (!configData.hmac_secret || configData.hmac_secret.length < 32) {
      errors.push('HMAC Secret deve ter pelo menos 32 caracteres');
    }

    if (!configData.default_bearer_token || configData.default_bearer_token.length < 10) {
      errors.push('Bearer Token deve ter pelo menos 10 caracteres');
    }

    if (!configData.default_timeout_ms || configData.default_timeout_ms < 5000 || configData.default_timeout_ms > 300000) {
      errors.push('Timeout deve estar entre 5000ms e 300000ms');
    }

    if (!configData.retry_attempts || configData.retry_attempts < 1 || configData.retry_attempts > 10) {
      errors.push('Tentativas de retry devem estar entre 1 e 10');
    }

    return errors;
  }, []);

  useEffect(() => {
    if (profile) {
      loadConfig();
    }
  }, [profile, loadConfig]);

  return {
    config,
    loading,
    error,
    isAdmin,
    profile,
    saveConfig,
    applyToAllEndpoints,
    generateHMACSecret,
    validateConfig,
    refreshConfig: loadConfig
  };
}