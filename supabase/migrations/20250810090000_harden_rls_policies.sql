-- ==================================================
-- Harden and unify RLS policies (multi-tenant by company + role)
-- Preserva MVP e corrige políticas permissivas/duplicadas
-- Data: 2025-08-10
-- ==================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Garantir colunas de escopo multi-tenant nas tabelas de domínio
ALTER TABLE IF EXISTS public.properties 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE IF EXISTS public.leads 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE IF EXISTS public.contracts 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE IF EXISTS public.contract_templates 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE IF EXISTS public.whatsapp_instances 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- ==================================================
-- Funções auxiliares (SECURITY DEFINER) sem recursão em RLS
-- ==================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 1) Tentar via JWT (user_metadata.role)
  SELECT COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', NULL) INTO user_role;

  -- 2) Fallback para user_profiles (sem recursão, SECURITY DEFINER)
  IF user_role IS NULL OR user_role = '' THEN
    SELECT role INTO user_role 
    FROM public.user_profiles 
    WHERE id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN COALESCE(user_role, 'corretor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_uuid UUID;
BEGIN
  SELECT company_id INTO company_uuid 
  FROM public.user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualiza updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para setar user_id e company_id automaticamente
CREATE OR REPLACE FUNCTION public.set_row_tenant_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN NEW.user_id = auth.uid(); END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id = public.get_user_company_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de defaults
DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS set_defaults_properties ON public.properties;
    CREATE TRIGGER set_defaults_properties BEFORE INSERT ON public.properties
      FOR EACH ROW EXECUTE FUNCTION public.set_row_tenant_defaults();
  END IF;
  IF to_regclass('public.leads') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS set_defaults_leads ON public.leads;
    CREATE TRIGGER set_defaults_leads BEFORE INSERT ON public.leads
      FOR EACH ROW EXECUTE FUNCTION public.set_row_tenant_defaults();
  END IF;
  IF to_regclass('public.contracts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS set_defaults_contracts ON public.contracts;
    CREATE TRIGGER set_defaults_contracts BEFORE INSERT ON public.contracts
      FOR EACH ROW EXECUTE FUNCTION public.set_row_tenant_defaults();
  END IF;
  IF to_regclass('public.contract_templates') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS set_defaults_contract_templates ON public.contract_templates;
    CREATE TRIGGER set_defaults_contract_templates BEFORE INSERT ON public.contract_templates
      FOR EACH ROW EXECUTE FUNCTION public.set_row_tenant_defaults();
  END IF;
  IF to_regclass('public.whatsapp_instances') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS set_defaults_whatsapp_instances ON public.whatsapp_instances;
    CREATE TRIGGER set_defaults_whatsapp_instances BEFORE INSERT ON public.whatsapp_instances
      FOR EACH ROW EXECUTE FUNCTION public.set_row_tenant_defaults();
  END IF;
END $$;

-- ==================================================
-- Habilitar RLS nas tabelas (idempotente)
-- ==================================================
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- Remover políticas permissivas / conflitantes (DROP IF EXISTS por nome conhecido)
-- ==================================================

-- properties
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can create properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can update properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can delete properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage own properties" ON public.properties;

-- property_images
DROP POLICY IF EXISTS "Anyone can view property images" ON public.property_images;
DROP POLICY IF EXISTS "Anyone can create property images" ON public.property_images;
DROP POLICY IF EXISTS "Anyone can update property images" ON public.property_images;
DROP POLICY IF EXISTS "Anyone can delete property images" ON public.property_images;

-- leads
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can manage own leads" ON public.leads;

-- contract_templates
DROP POLICY IF EXISTS "Anyone can view contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Anyone can create contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Anyone can update contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Anyone can delete contract templates" ON public.contract_templates;

-- contracts
DROP POLICY IF EXISTS "Anyone can view contracts" ON public.contracts;
DROP POLICY IF EXISTS "Anyone can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Anyone can update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Anyone can delete contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can manage own contracts" ON public.contracts;

-- user_profiles / companies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Gestores can view all profiles in company" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;

-- whatsapp_instances (vários nomes usados em scripts auxiliares)
DROP POLICY IF EXISTS "Users can view own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can insert own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can update own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can delete own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Managers can view all instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Managers can manage all instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_select_policy" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_insert_policy" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update_policy" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_delete_policy" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_delete" ON public.whatsapp_instances;

-- whatsapp_chats/messages (limpar nomes comuns)
DROP POLICY IF EXISTS "Users can view own chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Managers can view all company chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Users can manage own chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Users can view own messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Managers can view all company messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can manage own messages" ON public.whatsapp_messages;

-- ==================================================
-- Novas políticas padronizadas por tabela
-- ==================================================

-- user_profiles: somente o próprio registro
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- companies: leitura pela empresa do usuário
CREATE POLICY "companies_select_by_membership" ON public.companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.company_id = companies.id
    )
  );

-- properties
CREATE POLICY "properties_select_own" ON public.properties
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "properties_select_company_manager" ON public.properties
  FOR SELECT USING (
    company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin')
  );
CREATE POLICY "properties_insert_check_company" ON public.properties
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin'))
  );
CREATE POLICY "properties_update_delete_scope" ON public.properties
  FOR UPDATE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
  );
CREATE POLICY "properties_delete_scope" ON public.properties
  FOR DELETE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  );

-- property_images: escopo via propriedade associada
CREATE POLICY "property_images_select_company" ON public.property_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND p.company_id = public.get_user_company_id()
    )
  );
CREATE POLICY "property_images_write_scope" ON public.property_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND (
          (p.user_id = auth.uid() AND p.company_id = public.get_user_company_id()) OR
          (public.get_user_role() IN ('gestor','admin') AND p.company_id = public.get_user_company_id())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id AND p.company_id = public.get_user_company_id()
    )
  );

-- leads
CREATE POLICY "leads_select_own" ON public.leads
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "leads_select_company_manager" ON public.leads
  FOR SELECT USING (
    company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin')
  );
CREATE POLICY "leads_insert_check_company" ON public.leads
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin'))
  );
CREATE POLICY "leads_update_delete_scope" ON public.leads
  FOR UPDATE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  )
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "leads_delete_scope" ON public.leads
  FOR DELETE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  );

-- contract_templates
CREATE POLICY "contract_templates_select_company" ON public.contract_templates
  FOR SELECT USING (company_id = public.get_user_company_id());
CREATE POLICY "contract_templates_insert_check_company" ON public.contract_templates
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin'))
  );
CREATE POLICY "contract_templates_update_scope" ON public.contract_templates
  FOR UPDATE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  ) WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "contract_templates_delete_scope" ON public.contract_templates
  FOR DELETE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  );

-- contracts
CREATE POLICY "contracts_select_own" ON public.contracts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "contracts_select_company_manager" ON public.contracts
  FOR SELECT USING (
    company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin')
  );
CREATE POLICY "contracts_insert_check_company" ON public.contracts
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin'))
  );
CREATE POLICY "contracts_update_delete_scope" ON public.contracts
  FOR UPDATE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  )
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "contracts_delete_scope" ON public.contracts
  FOR DELETE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  );

-- whatsapp_instances
CREATE POLICY "whatsapp_instances_select_own" ON public.whatsapp_instances
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_select_company_manager" ON public.whatsapp_instances
  FOR SELECT USING (
    company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin')
  );
CREATE POLICY "whatsapp_instances_insert_check_company" ON public.whatsapp_instances
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin'))
  );
CREATE POLICY "whatsapp_instances_update_delete_scope" ON public.whatsapp_instances
  FOR UPDATE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  ) WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "whatsapp_instances_delete_scope" ON public.whatsapp_instances
  FOR DELETE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id()) OR
    (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  );

-- whatsapp_chats (escopo via whatsapp_instances.company_id)
CREATE POLICY "whatsapp_chats_select_own" ON public.whatsapp_chats
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "whatsapp_chats_select_company_manager" ON public.whatsapp_chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_chats.instance_id
        AND wi.company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('gestor','admin')
    )
  );
CREATE POLICY "whatsapp_chats_write_scope" ON public.whatsapp_chats
  FOR ALL USING (
    (user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_chats.instance_id
        AND wi.company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('gestor','admin')
    )
  );

-- whatsapp_messages (escopo via whatsapp_instances.company_id)
CREATE POLICY "whatsapp_messages_select_own" ON public.whatsapp_messages
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "whatsapp_messages_select_company_manager" ON public.whatsapp_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_messages.instance_id
        AND wi.company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('gestor','admin')
    )
  );
CREATE POLICY "whatsapp_messages_write_scope" ON public.whatsapp_messages
  FOR ALL USING (
    (user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_messages.instance_id
        AND wi.company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('gestor','admin')
    )
  );

-- ==================================================
-- Storage policies (property-images) — leitura pública, mutações autenticadas
-- ==================================================

-- Remover políticas antigas conhecidas no storage.objects (idempotente)
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update property images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete property images" ON storage.objects;

-- Regras mínimas por bucket
CREATE POLICY IF NOT EXISTS "Public can view property images" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY IF NOT EXISTS "Authenticated can upload property images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images');

CREATE POLICY IF NOT EXISTS "Authenticated can update property images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images');

CREATE POLICY IF NOT EXISTS "Authenticated can delete property images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-images');

-- ==================================================
-- Verificações rápidas
-- ==================================================
-- Mostrar políticas aplicadas em tabelas-chave
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('properties','leads','contracts','contract_templates','user_profiles','companies','whatsapp_instances','whatsapp_chats','whatsapp_messages','property_images')
ORDER BY tablename, policyname;


