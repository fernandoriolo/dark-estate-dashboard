-- ==================================================
-- Ajuste de RLS: Admin global (bypass de company_id)
-- Data: 2025-08-10
-- ==================================================

-- Helper para reduzir repetição
CREATE OR REPLACE FUNCTION public._admin_global()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql;

-- user_profiles: admin pode ver/atualizar todos os perfis
DROP POLICY IF EXISTS "user_profiles_select_admin_all" ON public.user_profiles;
CREATE POLICY "user_profiles_select_admin_all" ON public.user_profiles
  FOR SELECT USING (public._admin_global());

DROP POLICY IF EXISTS "user_profiles_update_admin_all" ON public.user_profiles;
CREATE POLICY "user_profiles_update_admin_all" ON public.user_profiles
  FOR UPDATE USING (public._admin_global());

-- companies: admin vê todas as empresas
DROP POLICY IF EXISTS "companies_select_admin_all" ON public.companies;
CREATE POLICY "companies_select_admin_all" ON public.companies
  FOR SELECT USING (public._admin_global());

-- properties
DROP POLICY IF EXISTS "properties_select_company_manager" ON public.properties;
CREATE POLICY "properties_select_company_manager" ON public.properties
  FOR SELECT USING (
    public._admin_global() OR (company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin'))
  );

DROP POLICY IF EXISTS "properties_insert_check_company" ON public.properties;
CREATE POLICY "properties_insert_check_company" ON public.properties
  FOR INSERT WITH CHECK (
    (public._admin_global() AND company_id IS NOT NULL)
    OR (company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin')))
  );

DROP POLICY IF EXISTS "properties_update_delete_scope" ON public.properties;
CREATE POLICY "properties_update_delete_scope" ON public.properties
  FOR UPDATE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  )
  WITH CHECK (
    (public._admin_global() AND company_id IS NOT NULL) OR company_id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS "properties_delete_scope" ON public.properties;
CREATE POLICY "properties_delete_scope" ON public.properties
  FOR DELETE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  );

-- property_images (herda do imóvel)
DROP POLICY IF EXISTS "property_images_select_company" ON public.property_images;
CREATE POLICY "property_images_select_company" ON public.property_images
  FOR SELECT USING (
    public._admin_global() OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id AND p.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "property_images_write_scope" ON public.property_images;
CREATE POLICY "property_images_write_scope" ON public.property_images
  FOR ALL USING (
    public._admin_global() OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND (
          (p.user_id = auth.uid() AND p.company_id = public.get_user_company_id()) OR
          (public.get_user_role() IN ('gestor','admin') AND p.company_id = public.get_user_company_id())
        )
    )
  )
  WITH CHECK (
    public._admin_global() OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id AND p.company_id = public.get_user_company_id()
    )
  );

-- leads
DROP POLICY IF EXISTS "leads_select_company_manager" ON public.leads;
CREATE POLICY "leads_select_company_manager" ON public.leads
  FOR SELECT USING (
    public._admin_global() OR (company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin'))
  );

DROP POLICY IF EXISTS "leads_insert_check_company" ON public.leads;
CREATE POLICY "leads_insert_check_company" ON public.leads
  FOR INSERT WITH CHECK (
    (public._admin_global() AND company_id IS NOT NULL)
    OR (company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin')))
  );

DROP POLICY IF EXISTS "leads_update_delete_scope" ON public.leads;
CREATE POLICY "leads_update_delete_scope" ON public.leads
  FOR UPDATE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  )
  WITH CHECK ((public._admin_global() AND company_id IS NOT NULL) OR company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "leads_delete_scope" ON public.leads;
CREATE POLICY "leads_delete_scope" ON public.leads
  FOR DELETE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  );

-- contract_templates
DROP POLICY IF EXISTS "contract_templates_select_company" ON public.contract_templates;
CREATE POLICY "contract_templates_select_company" ON public.contract_templates
  FOR SELECT USING (public._admin_global() OR company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "contract_templates_insert_check_company" ON public.contract_templates;
CREATE POLICY "contract_templates_insert_check_company" ON public.contract_templates
  FOR INSERT WITH CHECK (
    (public._admin_global() AND company_id IS NOT NULL)
    OR (company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin')))
  );

DROP POLICY IF EXISTS "contract_templates_update_scope" ON public.contract_templates;
CREATE POLICY "contract_templates_update_scope" ON public.contract_templates
  FOR UPDATE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  ) WITH CHECK ((public._admin_global() AND company_id IS NOT NULL) OR company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "contract_templates_delete_scope" ON public.contract_templates;
CREATE POLICY "contract_templates_delete_scope" ON public.contract_templates
  FOR DELETE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  );

-- contracts
DROP POLICY IF EXISTS "contracts_select_company_manager" ON public.contracts;
CREATE POLICY "contracts_select_company_manager" ON public.contracts
  FOR SELECT USING (
    public._admin_global() OR (company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin'))
  );

DROP POLICY IF EXISTS "contracts_insert_check_company" ON public.contracts;
CREATE POLICY "contracts_insert_check_company" ON public.contracts
  FOR INSERT WITH CHECK (
    (public._admin_global() AND company_id IS NOT NULL)
    OR (company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin')))
  );

DROP POLICY IF EXISTS "contracts_update_delete_scope" ON public.contracts;
CREATE POLICY "contracts_update_delete_scope" ON public.contracts
  FOR UPDATE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  )
  WITH CHECK ((public._admin_global() AND company_id IS NOT NULL) OR company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "contracts_delete_scope" ON public.contracts;
CREATE POLICY "contracts_delete_scope" ON public.contracts
  FOR DELETE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  );

-- whatsapp_instances
DROP POLICY IF EXISTS "whatsapp_instances_select_company_manager" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_select_company_manager" ON public.whatsapp_instances
  FOR SELECT USING (
    public._admin_global() OR (company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin'))
  );

DROP POLICY IF EXISTS "whatsapp_instances_insert_check_company" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_insert_check_company" ON public.whatsapp_instances
  FOR INSERT WITH CHECK (
    (public._admin_global() AND company_id IS NOT NULL)
    OR (company_id = public.get_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin')))
  );

DROP POLICY IF EXISTS "whatsapp_instances_update_delete_scope" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_update_delete_scope" ON public.whatsapp_instances
  FOR UPDATE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  ) WITH CHECK ((public._admin_global() AND company_id IS NOT NULL) OR company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "whatsapp_instances_delete_scope" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_delete_scope" ON public.whatsapp_instances
  FOR DELETE USING (
    public._admin_global()
    OR ((user_id = auth.uid() AND company_id = public.get_user_company_id())
        OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id()))
  );

-- whatsapp_chats
DROP POLICY IF EXISTS "whatsapp_chats_select_company_manager" ON public.whatsapp_chats;
CREATE POLICY "whatsapp_chats_select_company_manager" ON public.whatsapp_chats
  FOR SELECT USING (
    public._admin_global() OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_chats.instance_id
        AND wi.company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('gestor','admin')
    )
  );

DROP POLICY IF EXISTS "whatsapp_chats_write_scope" ON public.whatsapp_chats;
CREATE POLICY "whatsapp_chats_write_scope" ON public.whatsapp_chats
  FOR ALL USING (
    public._admin_global() OR (user_id = auth.uid()) OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_chats.instance_id
        AND wi.company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('gestor','admin')
    )
  );

-- whatsapp_messages
DROP POLICY IF EXISTS "whatsapp_messages_select_company_manager" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_select_company_manager" ON public.whatsapp_messages
  FOR SELECT USING (
    public._admin_global() OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_messages.instance_id
        AND wi.company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('gestor','admin')
    )
  );

DROP POLICY IF EXISTS "whatsapp_messages_write_scope" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_write_scope" ON public.whatsapp_messages
  FOR ALL USING (
    public._admin_global() OR (user_id = auth.uid()) OR EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = whatsapp_messages.instance_id
        AND wi.company_id = public.get_user_company_id()
        AND public.get_user_role() IN ('gestor','admin')
    )
  );


