import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useAuthManager } from './useAuthManager';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'corretor' | 'gestor' | 'admin';
  company_id: string;
  department?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  plan: 'basico' | 'profissional' | 'enterprise';
  max_users: number;
  is_active: boolean;
}

export function useUserProfile() {
  const { session, user: authUser } = useAuthManager();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs para controle de estado
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const mountedRef = useRef(true);

  // Verificar se é gestor
  const isManager = profile?.role === 'gestor' || profile?.role === 'admin';
  
  // Verificar se é admin
  const isAdmin = profile?.role === 'admin';

  // Carregar dados do usuário com proteção contra carregamentos múltiplos
  const loadUserData = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Verificar se o componente ainda está montado
    if (!mountedRef.current) {
      return;
    }
    
    // Prevenir carregamentos múltiplos simultâneos
    if (isLoadingRef.current && !force) {
      return;
    }
    
    // Prevenir carregamentos muito frequentes (debounce de 5 segundos)
    if (!force && (now - lastLoadTimeRef.current) < 5000) {
      return;
    }

    // Se já temos um perfil válido e não é um carregamento forçado, não recarregar
    // Comentado temporariamente para resolver problema de travamento
    // if (!force && profile && user) {
    //   return;
    // }

    try {
      isLoadingRef.current = true;
      lastLoadTimeRef.current = now;
      
      // Só mostrar loading se for o primeiro carregamento ou não temos perfil
      if (force || !profile) {
        setLoading(true);
      }
      setError(null);

      // Obter usuário autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw userError;
      }

      // Verificar se o componente ainda está montado antes de continuar
      if (!mountedRef.current) {
        return;
      }

      if (!user) {
        setUser(null);
        setProfile(null);
        setCompany(null);
        return;
      }

      setUser(user);

      // Buscar perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Verificar se o componente ainda está montado antes de continuar
      if (!mountedRef.current) {
        return;
      }

      if (profileError) {
        throw profileError;
      }

      // Se o perfil não existir ou estiver inativo, desconectar e bloquear
      if (!profileData || profileData.is_active === false) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setCompany(null);
        setError('Seu acesso está desativado.');
        return;
      }

      setProfile(profileData as UserProfile);
      setCompany(null);

    } catch (error: any) {
      if (mountedRef.current) {
        setError(error.message);
      }
    } finally {
      isLoadingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Atualizar perfil
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!profile) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data as UserProfile);
      return data;
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  };

  // Criar perfil para novo usuário
  const createProfile = async (profileData: {
    full_name: string;
    role?: 'corretor' | 'gestor' | 'admin';
    company_id?: string;
    department?: string;
    phone?: string;
  }) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          ...profileData
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data as UserProfile);
      return data;
    } catch (error: any) {
      console.error('Erro ao criar perfil:', error);
      throw error;
    }
  };

  // Obter todos os usuários (apenas para gestores)
  const getCompanyUsers = async (): Promise<UserProfile[]> => {
    try {
      if (!isManager) {
        throw new Error('Sem permissão para ver usuários');
      }

      const { data, error } = await supabase.rpc('list_company_users', {
        target_company_id: company?.id ?? null,
        search: null,
        roles: null,
        limit_count: 100,
        offset_count: 0,
      });

      if (error) throw error;

      return (data as unknown as UserProfile[]) || [];
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  };

  // Alterar role de usuário (apenas para admins)
  const changeUserRole = async (userId: string, newRole: 'corretor' | 'gestor' | 'admin') => {
    try {
      if (!isAdmin) {
        throw new Error('Sem permissão para alterar roles');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Erro ao alterar role:', error);
      throw error;
    }
  };

  // Desativar usuário (apenas para admins)
  const deactivateUser = async (userId: string) => {
    try {
      if (!isAdmin) {
        throw new Error('Sem permissão para desativar usuários');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Erro ao desativar usuário:', error);
      throw error;
    }
  };

  // Reativar usuário (apenas para admins)
  const activateUser = async (userId: string) => {
    try {
      if (!isAdmin) {
        throw new Error('Sem permissão para reativar usuários');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_active: true })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Erro ao reativar usuário:', error);
      throw error;
    }
  };

  // Deletar usuário completamente (apenas para admins, apenas se inativo)
  const deleteUser = async (userId: string) => {
    try {
      if (!isAdmin) {
        throw new Error('Sem permissão para deletar usuários');
      }

      // Usar Edge Function para deletar completamente
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão inválida para deletar usuário');

      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Falha ao deletar usuário');
      }
      if ((fnData as any)?.error) {
        throw new Error((fnData as any).error);
      }

      return fnData;
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  };

  // Criar convite para novo usuário (apenas para admins)
  const createNewUser = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role: 'corretor' | 'gestor' | 'admin';
    department?: string;
    phone?: string;
  }) => {
    try {
      if (!isAdmin) {
        throw new Error('Sem permissão para criar usuários');
      }

      // Preferir criação via Edge Function com service_role (invocação direta via supabase.functions)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão inválida para criar usuário');

      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name,
          role: userData.role,
          phone: userData.phone || undefined,
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Falha ao criar usuário');
      }
      if ((fnData as any)?.error) {
        throw new Error((fnData as any).error);
      }

      // Recarregar lista chamadora cuidará do fetch
      return { id: (fnData as any)?.user_id } as any;

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  };

  // Reagir a mudanças de sessão do gerenciador centralizado
  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
      // Só carregar perfil se não temos um ou se o usuário mudou
      if (!profile || profile.id !== session.user.id) {
        loadUserData(true);
      }
    } else {
      // Limpar estado quando não há sessão
      setUser(null);
      setProfile(null);
      setCompany(null);
      setError(null);
      setLoading(false);
    }
  }, [session]);

  // Carregamento inicial
  useEffect(() => {
    if (authUser) {
      loadUserData(true);
    }
  }, []);

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Assinar mudanças no próprio perfil para desconectar imediatamente se desativado
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` },
        async (payload) => {
          const nextIsActive = (payload.new as any)?.is_active;
          if (nextIsActive === false) {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            setCompany(null);
            setError('Seu acesso foi desativado.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    user,
    profile,
    company,
    loading,
    error,
    isManager,
    isAdmin,
    updateProfile,
    createProfile,
    getCompanyUsers,
    changeUserRole,
    deactivateUser,
    activateUser,
    deleteUser,
    createNewUser,
    refreshData: () => loadUserData(true)
  };
} 