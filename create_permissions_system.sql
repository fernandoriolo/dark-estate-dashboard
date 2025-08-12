-- ==================================================
-- SISTEMA DE PERMISSÕES GRANULARES POR ROLE (SAFE VERSION)
-- ==================================================

-- 1. Remover políticas existentes (se existirem)
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can view own permissions" ON public.role_permissions;

-- 2. Remover funções existentes (se existirem)
DROP FUNCTION IF EXISTS public.has_permission(TEXT);
DROP FUNCTION IF EXISTS public.update_role_permissions_updated_at();

-- 3. Remover trigger existente (se existir)
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;

-- 4. Criar tabela de permissões por role
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('corretor', 'gestor', 'admin')),
  permission_key TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(role, permission_key)
);

-- 5. Inserir permissões padrão (apenas se não existirem)
INSERT INTO public.role_permissions (role, permission_key, permission_name, category, description, is_enabled) VALUES

-- MENUS - CORRETOR (básico)
('corretor', 'menu_dashboard', 'Painel Principal', 'menu', 'Acesso ao dashboard', true),
('corretor', 'menu_properties', 'Propriedades', 'menu', 'Gerenciar propriedades', true),
('corretor', 'menu_contracts', 'Contratos', 'menu', 'Gerenciar contratos', true),
('corretor', 'menu_agenda', 'Agenda', 'menu', 'Agenda de compromissos', true),
('corretor', 'menu_clients', 'Pipeline Clientes', 'menu', 'Pipeline de clientes', true),
('corretor', 'menu_clients_crm', 'CRM Clientes', 'menu', 'CRM completo', false),
('corretor', 'menu_reports', 'Relatórios', 'menu', 'Relatórios', false),
('corretor', 'menu_portals', 'Portais', 'menu', 'Portais imobiliários', false),
('corretor', 'menu_connections', 'Conexões WhatsApp', 'menu', 'WhatsApp', false),
('corretor', 'menu_users', 'Usuários', 'menu', 'Gerenciar usuários', false),

-- MENUS - GESTOR (intermediário)
('gestor', 'menu_dashboard', 'Painel Principal', 'menu', 'Acesso ao dashboard', true),
('gestor', 'menu_properties', 'Propriedades', 'menu', 'Gerenciar propriedades', true),
('gestor', 'menu_contracts', 'Contratos', 'menu', 'Gerenciar contratos', true),
('gestor', 'menu_agenda', 'Agenda', 'menu', 'Agenda de compromissos', true),
('gestor', 'menu_clients', 'Pipeline Clientes', 'menu', 'Pipeline de clientes', true),
('gestor', 'menu_clients_crm', 'CRM Clientes', 'menu', 'CRM completo', true),
('gestor', 'menu_reports', 'Relatórios', 'menu', 'Relatórios', true),
('gestor', 'menu_portals', 'Portais', 'menu', 'Portais imobiliários', true),
('gestor', 'menu_connections', 'Conexões WhatsApp', 'menu', 'WhatsApp', true),
('gestor', 'menu_users', 'Usuários', 'menu', 'Visualizar usuários', true),

-- MENUS - ADMIN (todos)
('admin', 'menu_dashboard', 'Painel Principal', 'menu', 'Acesso ao dashboard', true),
('admin', 'menu_properties', 'Propriedades', 'menu', 'Gerenciar propriedades', true),
('admin', 'menu_contracts', 'Contratos', 'menu', 'Gerenciar contratos', true),
('admin', 'menu_agenda', 'Agenda', 'menu', 'Agenda de compromissos', true),
('admin', 'menu_clients', 'Pipeline Clientes', 'menu', 'Pipeline de clientes', true),
('admin', 'menu_clients_crm', 'CRM Clientes', 'menu', 'CRM completo', true),
('admin', 'menu_reports', 'Relatórios', 'menu', 'Relatórios', true),
('admin', 'menu_portals', 'Portais', 'menu', 'Portais imobiliários', true),
('admin', 'menu_connections', 'Conexões WhatsApp', 'menu', 'WhatsApp', true),
('admin', 'menu_users', 'Usuários', 'menu', 'Gerenciar usuários', true),
('admin', 'menu_permissions', 'Configurar Permissões', 'menu', 'Configurar permissões', true)

ON CONFLICT (role, permission_key) DO NOTHING;

-- Módulo Lei do Inquilinato (visível para todos por padrão)
INSERT INTO public.role_permissions (role, permission_key, permission_name, category, description, is_enabled) VALUES
('corretor', 'menu_inquilinato', 'Lei do Inquilinato', 'menu', 'Módulo informativo da Lei do Inquilinato', true),
('gestor', 'menu_inquilinato', 'Lei do Inquilinato', 'menu', 'Módulo informativo da Lei do Inquilinato', true),
('admin', 'menu_inquilinato', 'Lei do Inquilinato', 'menu', 'Módulo informativo da Lei do Inquilinato', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- 6. Habilitar RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS
CREATE POLICY "Admins can manage permissions" ON public.role_permissions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view own permissions" ON public.role_permissions
FOR SELECT USING (
  role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
);

-- 8. Função para verificar permissão
CREATE OR REPLACE FUNCTION public.has_permission(permission_key_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_perm BOOLEAN;
BEGIN
  SELECT role INTO user_role FROM public.user_profiles WHERE id = auth.uid();
  
  IF user_role = 'admin' THEN RETURN true; END IF;
  
  SELECT is_enabled INTO has_perm
  FROM public.role_permissions
  WHERE role = user_role AND permission_key = permission_key_param;
  
  RETURN COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para trigger updated_at
CREATE OR REPLACE FUNCTION public.update_role_permissions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

-- 10. Criar trigger
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_role_permissions_updated_at();

-- 11. Verificar criação
SELECT 'Sistema de permissões criado/atualizado com sucesso!' AS status;

-- 12. Mostrar estatísticas
SELECT 
  role,
  COUNT(*) as total_permissions,
  COUNT(*) FILTER (WHERE is_enabled = true) as enabled_permissions
FROM public.role_permissions 
GROUP BY role 
ORDER BY role;
