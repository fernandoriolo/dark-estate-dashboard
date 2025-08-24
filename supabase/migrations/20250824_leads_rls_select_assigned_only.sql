BEGIN;

-- Garantir RLS ativa
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

-- Remover policies antigas de SELECT que conflitam
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS leads_select_by_role ON public.leads;
    DROP POLICY IF EXISTS leads_select_own ON public.leads;
    DROP POLICY IF EXISTS leads_select_company_manager ON public.leads;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- SELECT: admin/gestor veem todos; corretor apenas os atribuídos a si
CREATE POLICY leads_select_by_role ON public.leads
FOR SELECT
USING (
  CASE public.get_user_role()
    WHEN 'admin' THEN true
    WHEN 'gestor' THEN true
    ELSE (id_corretor_responsavel = auth.uid())
  END
);

COMMIT;


