BEGIN;

-- Garantir RLS ativa
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

-- Remover policies antigas que conflitam
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS leads_update_by_role ON public.leads;
    DROP POLICY IF EXISTS leads_insert_by_role ON public.leads;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- INSERT: admin/gestor livres; corretor somente se for autor e não atribuir outro corretor
CREATE POLICY leads_insert_by_role ON public.leads
FOR INSERT
WITH CHECK (
  CASE public.get_user_role()
    WHEN 'admin' THEN true
    WHEN 'gestor' THEN true
    ELSE (
      user_id = auth.uid()
      AND (
        id_corretor_responsavel IS NULL OR id_corretor_responsavel = auth.uid()
      )
    )
  END
);

-- UPDATE: admin/gestor livres; corretor apenas se autor e não trocar responsável para outro
CREATE POLICY leads_update_by_role ON public.leads
FOR UPDATE
USING (
  public.get_user_role() IN ('admin','gestor') OR user_id = auth.uid()
)
WITH CHECK (
  CASE public.get_user_role()
    WHEN 'admin' THEN true
    WHEN 'gestor' THEN true
    ELSE (
      user_id = auth.uid()
      AND (
        id_corretor_responsavel IS NULL OR id_corretor_responsavel = auth.uid()
      )
    )
  END
);

COMMIT;


