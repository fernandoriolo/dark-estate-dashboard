BEGIN;

-- Adiciona coluna id_corretor_responsavel (uuid)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS id_corretor_responsavel uuid NULL;

-- Backfill a partir de assigned_user_id se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'assigned_user_id'
  ) THEN
    UPDATE public.leads
    SET id_corretor_responsavel = COALESCE(id_corretor_responsavel, assigned_user_id)
    WHERE id_corretor_responsavel IS NULL;
  END IF;
END $$;

-- FK para user_profiles (nome explícito da constraint)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'leads_id_corretor_responsavel_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_id_corretor_responsavel_fkey
      FOREIGN KEY (id_corretor_responsavel)
      REFERENCES public.user_profiles (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índice
CREATE INDEX IF NOT EXISTS idx_leads_id_corretor_responsavel ON public.leads(id_corretor_responsavel);

COMMENT ON COLUMN public.leads.id_corretor_responsavel IS 'Corretor responsável pelo lead.';

COMMIT;


