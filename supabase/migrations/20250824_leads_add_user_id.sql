BEGIN;

-- Adiciona coluna de autoria ao lead
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

-- FK para user_profiles(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'leads'
      AND tc.constraint_name = 'leads_user_id_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.user_profiles (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índice para consultas por autor
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);

COMMENT ON COLUMN public.leads.user_id IS 'Autor/criador do lead (FK para user_profiles.id).';

COMMIT;


