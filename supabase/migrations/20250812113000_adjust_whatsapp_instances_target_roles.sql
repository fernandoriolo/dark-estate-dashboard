-- Ajuste fino: restringir GESTOR a vincular instâncias apenas a 'gestor' ou 'corretor'.
-- ADMIN pode vincular para qualquer role. Escopo segue limitado por company_id do ator.

ALTER TABLE IF EXISTS public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Remover políticas afetadas para recriação (idempotente)
DO $$
BEGIN
  PERFORM 1 FROM pg_policy WHERE polrelid = 'public.whatsapp_instances'::regclass;
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS "whatsapp_instances_insert_check_company" ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS "whatsapp_instances_update_scope" ON public.whatsapp_instances';
  END IF;
END $$;

-- Recriar INSERT com restrição de alvo por role quando o ator for GESTOR
CREATE POLICY "whatsapp_instances_insert_check_company" ON public.whatsapp_instances
  FOR INSERT
  WITH CHECK (
    -- Sempre dentro da company do ator
    company_id = public.get_user_company_id()
    AND (
      -- Corretor só pode inserir para si via app (normalmente bloqueado na UI)
      user_id = auth.uid()
      OR public.get_user_role() IN ('gestor','admin')
    )
    AND (
      -- ADMIN: sem restrição de role do alvo (além da company)
      public.get_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = user_id
          AND up.company_id = public.get_user_company_id()
          AND up.role IN ('gestor','corretor')
      )
    )
  );

-- Recriar UPDATE com a mesma restrição de alvo quando o ator for GESTOR
CREATE POLICY "whatsapp_instances_update_scope" ON public.whatsapp_instances
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND company_id = public.get_user_company_id())
    OR (public.get_user_role() IN ('gestor','admin') AND company_id = public.get_user_company_id())
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND (
      public.get_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = user_id
          AND up.company_id = public.get_user_company_id()
          AND up.role IN ('gestor','corretor')
      )
    )
  );


