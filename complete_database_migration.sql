-- ==================================================
-- MIGRAÇÃO COMPLETA - IMOBIPRO DASHBOARD
-- Script consolidado para criação completa do banco de dados
-- ==================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================================================
-- 2. FUNÇÕES AUXILIARES
-- ==================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==================================================
-- 3. TABELAS DE USUÁRIOS E EMPRESAS
-- ==================================================

-- Tabela de empresas/imobiliárias
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  plan TEXT CHECK (plan IN ('basico', 'profissional', 'enterprise')) DEFAULT 'basico',
  max_users INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de perfis/roles de usuários
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('corretor', 'gestor', 'admin')) DEFAULT 'corretor',
  company_id UUID REFERENCES public.companies(id),
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 4. SISTEMA DE PERMISSÕES
-- ==================================================

-- Tabela de permissões por role
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

-- ==================================================
-- 5. TABELAS PRINCIPAIS DO NEGÓCIO
-- ==================================================

-- Tabela de propriedades
CREATE TABLE IF NOT EXISTS public.properties (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'house', 'apartment', 'commercial', 'land'
  price DECIMAL(12,2) NOT NULL,
  area DECIMAL(10,2) NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT DEFAULT 'available', -- 'available', 'sold', 'rented'
  description TEXT,
  property_purpose TEXT CHECK (property_purpose IN ('Aluguel', 'Venda')) DEFAULT 'Aluguel',
  proprietario_nome TEXT,
  proprietario_estado_civil TEXT,
  proprietario_cpf TEXT,
  proprietario_endereco TEXT,
  proprietario_email TEXT,
  user_id UUID REFERENCES public.user_profiles(id),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de imagens das propriedades
CREATE TABLE IF NOT EXISTS public.property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de leads/clientes
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL, -- 'OLX', 'ZAP Imóveis', 'Viva Real', 'Facebook', 'Google Ads', etc.
  property_id TEXT REFERENCES public.properties(id),
  message TEXT,
  stage TEXT DEFAULT 'Novo Lead',
  interest TEXT DEFAULT '',
  estimated_value DECIMAL(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  cpf TEXT,
  endereco TEXT,
  estado_civil TEXT,
  imovel_interesse TEXT,
  user_id UUID REFERENCES public.user_profiles(id),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 6. SISTEMA DE CONTRATOS
-- ==================================================

-- Tabela de templates de contratos
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  template_type TEXT CHECK (template_type IN ('Locacao', 'Venda')) DEFAULT 'Locacao',
  user_id UUID REFERENCES public.user_profiles(id),
  company_id UUID REFERENCES public.companies(id),
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Tabela de contratos
CREATE TABLE IF NOT EXISTS public.contracts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  numero TEXT NOT NULL UNIQUE,
  tipo TEXT CHECK (tipo IN ('Locacao', 'Venda')) NOT NULL,
  status TEXT CHECK (status IN ('Ativo', 'Pendente', 'Vencendo', 'Expirado', 'Cancelado')) DEFAULT 'Pendente',
  
  -- Client information
  client_id TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_cpf TEXT,
  client_address TEXT,
  client_nationality TEXT,
  client_marital_status TEXT,
  
  -- Landlord information
  landlord_name TEXT,
  landlord_email TEXT,
  landlord_phone TEXT,
  landlord_cpf TEXT,
  landlord_address TEXT,
  landlord_nationality TEXT,
  landlord_marital_status TEXT,
  
  -- Guarantor information
  guarantor_name TEXT,
  guarantor_email TEXT,
  guarantor_phone TEXT,
  guarantor_cpf TEXT,
  guarantor_address TEXT,
  guarantor_nationality TEXT,
  guarantor_marital_status TEXT,
  
  -- Property information
  property_id TEXT REFERENCES public.properties(id),
  property_title TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_type TEXT,
  property_area DECIMAL(10,2),
  property_city TEXT,
  property_state TEXT,
  property_zip_code TEXT,
  
  -- Template and contract details
  template_id TEXT REFERENCES public.contract_templates(id),
  template_name TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  data_assinatura DATE,
  proximo_vencimento DATE,
  contract_duration TEXT,
  payment_day TEXT,
  payment_method TEXT,
  contract_city TEXT,
  contract_file_path TEXT,
  contract_file_name TEXT,
  
  -- Metadata
  user_id UUID REFERENCES public.user_profiles(id),
  company_id UUID REFERENCES public.companies(id),
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ==================================================
-- 7. SISTEMA WHATSAPP
-- ==================================================

-- Tabela de instâncias WhatsApp por usuário
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  phone_number TEXT,
  profile_name TEXT,
  profile_pic_url TEXT,
  status TEXT CHECK (status IN ('connected', 'disconnected', 'connecting', 'qr_code', 'error')) DEFAULT 'disconnected',
  webhook_url TEXT,
  api_key TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  contact_count INTEGER DEFAULT 0,
  chat_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, instance_name),
  UNIQUE(instance_name)
);

-- Tabela de conversas/chats WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  contact_avatar TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  tags TEXT[],
  lead_id UUID REFERENCES public.leads(id),
  property_id TEXT REFERENCES public.properties(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(instance_id, contact_phone)
);

-- Tabela de mensagens WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  message_id TEXT, -- ID da mensagem no WhatsApp
  from_me BOOLEAN NOT NULL,
  contact_phone TEXT,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'contact')),
  content TEXT,
  media_url TEXT,
  caption TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ==================================================

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Índices para properties
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_company_id ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);

-- Índices para contracts
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);

-- Índices para WhatsApp
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON public.whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON public.whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance_id ON public.whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_user_id ON public.whatsapp_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id ON public.whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp);

-- ==================================================
-- 9. TRIGGERS PARA UPDATED_AT
-- ==================================================

-- Triggers para companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at 
BEFORE UPDATE ON public.companies 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
BEFORE UPDATE ON public.user_profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para role_permissions
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at 
BEFORE UPDATE ON public.role_permissions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para properties
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at 
BEFORE UPDATE ON public.properties 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para leads
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at 
BEFORE UPDATE ON public.leads 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para contracts
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at 
BEFORE UPDATE ON public.contracts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para contract_templates
DROP TRIGGER IF EXISTS update_contract_templates_updated_at ON public.contract_templates;
CREATE TRIGGER update_contract_templates_updated_at 
BEFORE UPDATE ON public.contract_templates 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para WhatsApp
DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at 
BEFORE UPDATE ON public.whatsapp_instances 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_chats_updated_at ON public.whatsapp_chats;
CREATE TRIGGER update_whatsapp_chats_updated_at 
BEFORE UPDATE ON public.whatsapp_chats 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- 10. FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- ==================================================

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.email));
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==================================================
-- 11. STORAGE BUCKETS
-- ==================================================

-- Bucket para imagens de propriedades
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para templates de contratos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contract-templates', 'contract-templates', false)
ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ==================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- 13. FUNÇÕES AUXILIARES PARA RLS
-- ==================================================

-- Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM public.user_profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'corretor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para verificar se usuário é gestor
CREATE OR REPLACE FUNCTION public.is_manager(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = user_uuid 
    AND role IN ('gestor', 'admin')
  );
END;
$$ language plpgsql security definer;

-- Função para obter empresa do usuário
CREATE OR REPLACE FUNCTION public.get_user_company(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
  company_uuid UUID;
BEGIN
  SELECT company_id INTO company_uuid 
  FROM public.user_profiles 
  WHERE id = user_uuid;
  
  RETURN company_uuid;
END;
$$ language plpgsql security definer;

-- Função para verificar permissão
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

-- ==================================================
-- 14. POLÍTICAS RLS
-- ==================================================

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Gestores can view all profiles in company" ON public.user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('gestor', 'admin')
    AND up.company_id = user_profiles.company_id
  )
);

-- Políticas para companies
CREATE POLICY "Users can view own company" ON public.companies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.company_id = companies.id
  )
);

-- Políticas para role_permissions
CREATE POLICY "Admins can manage permissions" ON public.role_permissions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view own permissions" ON public.role_permissions
FOR SELECT USING (
  role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
);

-- Políticas para properties
CREATE POLICY "Users can view own properties" ON public.properties
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('gestor', 'admin')
    AND up.company_id = properties.company_id
  )
);

CREATE POLICY "Users can manage own properties" ON public.properties
FOR ALL USING (user_id = auth.uid());

-- Políticas para property_images
CREATE POLICY "Anyone can view property images" ON public.property_images
FOR SELECT USING (true);

CREATE POLICY "Anyone can create property images" ON public.property_images
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update property images" ON public.property_images
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete property images" ON public.property_images
FOR DELETE USING (true);

-- Políticas para leads
CREATE POLICY "Users can view own leads" ON public.leads
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('gestor', 'admin')
    AND up.company_id = leads.company_id
  )
);

CREATE POLICY "Users can manage own leads" ON public.leads
FOR ALL USING (user_id = auth.uid());

-- Políticas para contracts
CREATE POLICY "Users can view own contracts" ON public.contracts
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('gestor', 'admin')
    AND up.company_id = contracts.company_id
  )
);

CREATE POLICY "Users can manage own contracts" ON public.contracts
FOR ALL USING (user_id = auth.uid());

-- Políticas para contract_templates
CREATE POLICY "Anyone can view contract templates" ON public.contract_templates
FOR SELECT USING (true);

CREATE POLICY "Anyone can create contract templates" ON public.contract_templates
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update contract templates" ON public.contract_templates
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete contract templates" ON public.contract_templates
FOR DELETE USING (true);

-- Políticas para whatsapp_instances
CREATE POLICY "Users can view own instances" ON public.whatsapp_instances
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('gestor', 'admin')
    AND up.company_id = whatsapp_instances.company_id
  )
);

CREATE POLICY "Users can manage own instances" ON public.whatsapp_instances
FOR ALL USING (user_id = auth.uid());

-- Políticas para whatsapp_chats
CREATE POLICY "Users can view own chats" ON public.whatsapp_chats
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('gestor', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi 
      WHERE wi.id = whatsapp_chats.instance_id 
      AND wi.company_id = up.company_id
    )
  )
);

CREATE POLICY "Users can manage own chats" ON public.whatsapp_chats
FOR ALL USING (user_id = auth.uid());

-- Políticas para whatsapp_messages
CREATE POLICY "Users can view own messages" ON public.whatsapp_messages
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('gestor', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi 
      WHERE wi.id = whatsapp_messages.instance_id 
      AND wi.company_id = up.company_id
    )
  )
);

CREATE POLICY "Users can manage own messages" ON public.whatsapp_messages
FOR ALL USING (user_id = auth.uid());

-- ==================================================
-- 15. POLÍTICAS DE STORAGE
-- ==================================================

-- Políticas para property-images bucket
CREATE POLICY "Anyone can view property images" ON storage.objects
FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Anyone can upload property images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Anyone can update property images" ON storage.objects
FOR UPDATE USING (bucket_id = 'property-images');

CREATE POLICY "Anyone can delete property images" ON storage.objects
FOR DELETE USING (bucket_id = 'property-images');

-- Políticas para contract-templates bucket
CREATE POLICY "Authenticated users can view contract templates" ON storage.objects
FOR SELECT USING (bucket_id = 'contract-templates' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload contract templates" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'contract-templates' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contract templates" ON storage.objects
FOR UPDATE USING (bucket_id = 'contract-templates' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete contract templates" ON storage.objects
FOR DELETE USING (bucket_id = 'contract-templates' AND auth.role() = 'authenticated');

-- ==================================================
-- 16. DADOS INICIAIS
-- ==================================================

-- Criar empresa padrão
INSERT INTO public.companies (id, name, plan, max_users)
VALUES (gen_random_uuid(), 'ImobiPro - Empresa Demo', 'enterprise', 50)
ON CONFLICT DO NOTHING;

-- Inserir permissões padrão (apenas se não existirem)
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

-- ==================================================
-- 17. FUNÇÕES UTILITÁRIAS
-- ==================================================

-- Função para estatísticas WhatsApp
CREATE OR REPLACE FUNCTION get_whatsapp_stats(user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    total_instances INTEGER,
    connected_instances INTEGER,
    total_chats INTEGER,
    total_messages INTEGER,
    unread_messages INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT wi.id)::INTEGER as total_instances,
        COUNT(DISTINCT CASE WHEN wi.status = 'connected' THEN wi.id END)::INTEGER as connected_instances,
        COUNT(DISTINCT wc.id)::INTEGER as total_chats,
        COUNT(DISTINCT wm.id)::INTEGER as total_messages,
        COALESCE(SUM(wc.unread_count), 0)::INTEGER as unread_messages
    FROM public.whatsapp_instances wi
    LEFT JOIN public.whatsapp_chats wc ON wi.id = wc.instance_id
    LEFT JOIN public.whatsapp_messages wm ON wc.id = wm.chat_id
    WHERE (user_id_param IS NULL OR wi.user_id = user_id_param)
    AND wi.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 18. COMENTÁRIOS
-- ==================================================

COMMENT ON TABLE public.companies IS 'Empresas/imobiliárias que usam o sistema';
COMMENT ON TABLE public.user_profiles IS 'Perfis e roles dos usuários do sistema';
COMMENT ON TABLE public.role_permissions IS 'Permissões granulares por role de usuário';
COMMENT ON TABLE public.properties IS 'Propriedades/imóveis gerenciados no sistema';
COMMENT ON TABLE public.property_images IS 'Imagens das propriedades';
COMMENT ON TABLE public.leads IS 'Leads/clientes em potencial';
COMMENT ON TABLE public.contracts IS 'Contratos de locação e venda';
COMMENT ON TABLE public.contract_templates IS 'Templates de contratos reutilizáveis';
COMMENT ON TABLE public.whatsapp_instances IS 'Instâncias WhatsApp por usuário';
COMMENT ON TABLE public.whatsapp_chats IS 'Conversas WhatsApp de cada usuário';
COMMENT ON TABLE public.whatsapp_messages IS 'Mensagens dos chats WhatsApp';

-- ==================================================
-- MIGRAÇÃO COMPLETA FINALIZADA
-- ==================================================

SELECT '🎉 MIGRAÇÃO COMPLETA FINALIZADA COM SUCESSO!' as status;
SELECT 'Todas as tabelas, funções, triggers e políticas foram criadas.' as info;
SELECT 'O sistema está pronto para uso!' as final_message;
