import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar se é gestor
  const isManager = profile?.role === 'gestor' || profile?.role === 'admin';
  
  // Verificar se é admin
  const isAdmin = profile?.role === 'admin';

  // Carregar dados do usuário
  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter usuário autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

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

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        throw profileError;
      }

      setProfile(profileData);

      // Não precisamos mais de dados da empresa
      setCompany(null);

    } catch (error: any) {
      console.error('Erro ao carregar dados do usuário:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

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

      setProfile(data);
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

      setProfile(data);
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

      // Como não podemos criar usuários diretamente no auth.users,
      // vamos usar a funcionalidade de signup do Supabase
      
      // 1. Criar o usuário usando a API de signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role,
            department: userData.department || '',
            phone: userData.phone || ''
          }
        }
      });

      if (authError) {
        console.error('Erro ao criar usuário no auth:', authError);
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Usuário não foi criado corretamente');
      }

      // 2. O perfil será criado automaticamente pelo trigger, 
      // mas vamos tentar criar/atualizar manualmente para garantir os dados corretos
      
      // Aguardar um pouco para o trigger funcionar
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar se o perfil foi criado e atualizar se necessário
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (existingProfile) {
        // Atualizar com os dados corretos
        const { data: updatedProfile, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: userData.full_name,
            role: userData.role,
            department: userData.department || null,
            phone: userData.phone || null,
            is_active: true,
            // Garantir vínculo à mesma empresa do criador
            company_id: profile?.company_id || null
          })
          .eq('id', authData.user.id)
          .select()
          .single();

        if (updateError) {
          console.error('Erro ao atualizar perfil:', updateError);
        }

        console.log('✅ Usuário criado com sucesso!');
        console.log('📧 Email:', userData.email);
        console.log('🔑 Senha:', userData.password);
        console.log('👤 Nome:', userData.full_name);
        console.log('🎭 Cargo:', userData.role);
        
        return updatedProfile || existingProfile;
      } else {
        // Se não foi criado automaticamente, criar manualmente
        const { data: newProfile, error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            // Vincular à empresa do criador (admin)
            company_id: profile?.company_id || null,
            department: userData.department || null,
            phone: userData.phone || null,
            is_active: true
          })
          .select()
          .single();

        if (profileError) {
          console.error('Erro ao criar perfil manualmente:', profileError);
          throw profileError;
        }

        console.log('✅ Usuário e perfil criados com sucesso!');
        return newProfile;
      }

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadUserData();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setCompany(null);
      } else if (event === 'SIGNED_IN' && session) {
        loadUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    createNewUser,
    refreshData: loadUserData
  };
} 