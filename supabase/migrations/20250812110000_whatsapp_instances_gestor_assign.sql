-- Fortalecer RLS do módulo de conexões (whatsapp_instances)
-- Objetivo: permitir que GESTOR/ADMIN vinculem instâncias a outros usuários (corretores/gestores)
-- da MESMA company, e impedir reatribuição para usuários de outra empresa.

ALTER TABLE IF EXISTS public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Limpeza idempotente de políticas existentes, independente do nome usado em migrações anteriores
DO $$
BEGIN
  PERFORM 1 FROM pg_policy WHERE polrelid = 'public.whatsapp_instances'::regclass;
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_instances_select_by_role ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_instances_insert_by_role ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_instances_update_by_role ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_instances_delete_by_role ON public.whatsapp_instances';

    EXECUTE 'DROP POLICY IF EXISTS "whatsapp_instances_select_own" ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS "whatsapp_instances_select_company_manager" ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS "whatsapp_instances_insert_check_company" ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS "whatsapp_instances_update_delete_scope" ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS "whatsapp_instances_delete_scope" ON public.whatsapp_instances';
  END IF;
END $$;

-- SELECT: corretor vê as próprias; gestor/admin vê todas da própria empresa
CREATE POLICY "whatsapp_instances_select_own" ON public.whatsapp_instances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "whatsapp_instances_select_company_manager" ON public.whatsapp_instances
  FOR SELECT USING (
    company_id = public.get_user_company_id() AND public.get_user_role() IN ('gestor','admin')
  );

-- INSERT: permitir gestor/admin inserir para qualquer usuário da mesma empresa (ou para si)
CREATE POLICY "whatsapp_instances_insert_check_company" ON public.whatsapp_instances
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id()
    AND (user_id = auth.uid() OR public.get_user_role() IN ('gestor','admin'))
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = user_id AND up.company_id = public.get_user_company_id()
    )
  );

-- UPDATE: corretor pode atualizar próprias instâncias; gestor/admin pode reatribuir
-- para qualquer usuário da mesma empresa. Com WITH CHECK garantindo integridade.
CREATE POLICY "whatsapp_instances_update_scope" ON public.whatsapp_instances
  FOR UPDATE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id())
    OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = user_id AND up.company_id = public.get_user_company_id()
    )
  );

-- DELETE: mesmo escopo do UPDATE
CREATE POLICY "whatsapp_instances_delete_scope" ON public.whatsapp_instances
  FOR DELETE USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id())
    OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  );

-- Índices úteis (idempotentes)
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company_id ON public.whatsapp_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON public.whatsapp_instances(user_id);


