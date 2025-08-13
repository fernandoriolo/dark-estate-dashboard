BEGIN;

-- Adiciona coluna de vínculo do corretor responsável ao lead
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid NULL;

-- FK para user_profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'leads_assigned_user_id_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_assigned_user_id_fkey
      FOREIGN KEY (assigned_user_id)
      REFERENCES public.user_profiles (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índice para consultas por corretor
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON public.leads(assigned_user_id);

COMMENT ON COLUMN public.leads.assigned_user_id IS 'Usuário corretor responsável (vinculado) por este lead';

COMMIT;


