-- Drop antigas policies com company_id e recriar por role

-- LEADS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  PERFORM 1 FROM pg_policy WHERE polrelid = 'public.leads'::regclass;
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS leads_select_company_manager ON public.leads';
    EXECUTE 'DROP POLICY IF EXISTS leads_insert_check_company ON public.leads';
    EXECUTE 'DROP POLICY IF EXISTS leads_update_delete_scope ON public.leads';
    EXECUTE 'DROP POLICY IF EXISTS leads_delete_scope ON public.leads';
  END IF;
END $$;

-- SELECT: gestores/admin veem todos; corretor vê apenas seus
CREATE POLICY leads_select_by_role ON public.leads
FOR SELECT
USING (
  CASE public.get_current_role()
    WHEN 'admin' THEN true
    WHEN 'gestor' THEN true
    ELSE (user_id = auth.uid())
  END
);

-- INSERT: corretor pode criar seus; gestor/admin podem criar qualquer
CREATE POLICY leads_insert_by_role ON public.leads
FOR INSERT
WITH CHECK (
  CASE public.get_current_role()
    WHEN 'admin' THEN true
    WHEN 'gestor' THEN true
    ELSE (user_id = auth.uid())
  END
);

-- UPDATE/DELETE: apenas gestor/admin; corretor pode atualizar somente seus (opcional)
CREATE POLICY leads_update_by_role ON public.leads
FOR UPDATE
USING (
  public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid()
)
WITH CHECK (
  public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid()
);

CREATE POLICY leads_delete_by_role ON public.leads
FOR DELETE
USING (public.get_current_role() IN ('admin','gestor'));

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- CONTRACT_TEMPLATES
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  PERFORM 1 FROM pg_policy WHERE polrelid = 'public.contract_templates'::regclass;
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS contract_templates_select_company ON public.contract_templates';
    EXECUTE 'DROP POLICY IF EXISTS contract_templates_insert_check_company ON public.contract_templates';
    EXECUTE 'DROP POLICY IF EXISTS contract_templates_update_scope ON public.contract_templates';
    EXECUTE 'DROP POLICY IF EXISTS contract_templates_delete_scope ON public.contract_templates';
  END IF;
END $$;

-- SELECT: todos autenticados
CREATE POLICY contract_templates_select_by_role ON public.contract_templates
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: todos autenticados
CREATE POLICY contract_templates_insert_by_role ON public.contract_templates
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE/DELETE: admin/gestor, ou autor (via user_id)
CREATE POLICY contract_templates_update_by_role ON public.contract_templates
FOR UPDATE
USING (public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid())
WITH CHECK (public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid());

CREATE POLICY contract_templates_delete_by_role ON public.contract_templates
FOR DELETE
USING (public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_contract_templates_user_id ON public.contract_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_created_at ON public.contract_templates(created_at DESC);
