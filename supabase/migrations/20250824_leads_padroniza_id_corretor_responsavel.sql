BEGIN;

-- Padroniza a coluna canônica de responsável pelo lead: id_corretor_responsavel

-- 1) Garantir coluna id_corretor_responsavel
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS id_corretor_responsavel uuid NULL;

-- 2) Backfill a partir de assigned_user_id (se existir)
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

-- 3) Constraint de FK para user_profiles(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'leads'
      AND tc.constraint_name = 'leads_id_corretor_responsavel_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_id_corretor_responsavel_fkey
      FOREIGN KEY (id_corretor_responsavel)
      REFERENCES public.user_profiles (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4) Índice para consultas por responsável
CREATE INDEX IF NOT EXISTS idx_leads_id_corretor_responsavel ON public.leads(id_corretor_responsavel);

-- 5) Comentário explicativo
COMMENT ON COLUMN public.leads.id_corretor_responsavel IS 'Corretor responsável pelo lead (FK para user_profiles.id).';

-- 6) Remover assigned_user_id e artefatos legados, se existirem
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'assigned_user_id'
  ) THEN
    -- Dropar índice legado
    IF EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'leads' AND indexname = 'idx_leads_assigned_user_id'
    ) THEN
      DROP INDEX IF EXISTS public.idx_leads_assigned_user_id;
    END IF;

    -- Dropar FK legado
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' AND table_name = 'leads' AND constraint_name = 'leads_assigned_user_id_fkey'
    ) THEN
      ALTER TABLE public.leads DROP CONSTRAINT leads_assigned_user_id_fkey;
    END IF;

    -- Dropar coluna
    ALTER TABLE public.leads DROP COLUMN assigned_user_id;
  END IF;
END $$;

COMMIT;


