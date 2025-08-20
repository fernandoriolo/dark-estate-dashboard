import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface RolePermission {
  id: string;
  role: 'corretor' | 'gestor' | 'admin';
  permission_key: string;
  permission_name: string;
  category: string;
  description?: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function usePermissions() {
  const { profile, isAdmin } = useUserProfile();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar permissões do usuário atual
  const loadUserPermissions = async () => {
    try {
      if (!profile) return;

      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', profile.role);

      if (error) throw error;

      // Converter para objeto chave-valor para fácil consulta
      const permsMap: Record<string, boolean> = {};
      data?.forEach(perm => {
        permsMap[perm.permission_key] = perm.is_enabled;
      });

      setUserPermissions(permsMap);

    } catch (error: any) {
      console.error('Erro ao carregar permissões do usuário:', error);
      setError(error.message);
    }
  };

  // Carregar todas as permissões (apenas para admins)
  const loadAllPermissions = async () => {
    try {
      if (!isAdmin) return;

      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('category', { ascending: true })
        .order('permission_name', { ascending: true });

      if (error) throw error;

      setPermissions(data || []);

    } catch (error: any) {
      console.error('Erro ao carregar todas as permissões:', error);
      setError(error.message);
    }
  };

  // Verificar se usuário tem uma permissão específica
  const hasPermission = (permissionKey: string): boolean => {
    // Admin sempre tem todas as permissões
    if (profile?.role === 'admin') return true;

    return userPermissions[permissionKey] || false;
  };

  // Atualizar permissão (apenas para admins)
  const updatePermission = async (id: string, isEnabled: boolean) => {
    try {
      if (!isAdmin) {
        throw new Error('Sem permissão para alterar configurações');
      }

      const { data, error } = await supabase
        .from('role_permissions')
        .update({ is_enabled: isEnabled })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar estado local
      setPermissions(prev => 
        prev.map(perm => 
          perm.id === id ? { ...perm, is_enabled: isEnabled } : perm
        )
      );

      return data;

    } catch (error: any) {
      console.error('Erro ao atualizar permissão:', error);
      throw error;
    }
  };

  // Obter permissões por role
  const getPermissionsByRole = (role: 'corretor' | 'gestor' | 'admin') => {
    return permissions.filter(perm => perm.role === role);
  };

  // Obter permissões por categoria
  const getPermissionsByCategory = (category: string) => {
    return permissions.filter(perm => perm.category === category);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadUserPermissions(),
        loadAllPermissions()
      ]);
      setLoading(false);
    };

    if (profile) {
      loadData();
    }
  }, [profile, isAdmin]);

  return {
    permissions,
    userPermissions,
    loading,
    error,
    hasPermission,
    updatePermission,
    getPermissionsByRole,
    getPermissionsByCategory,
    refreshPermissions: () => {
      loadUserPermissions();
      loadAllPermissions();
    }
  };
}
