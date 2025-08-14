-- Habilita RLS e cria policy mínima para leitura autenticada em imobipro_messages
-- Contexto: tabela sem company_id; política temporária até modelar tenant scope

BEGIN;

-- Garantir existência da tabela (não cria, apenas referencia)
ALTER TABLE IF EXISTS public.imobipro_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.imobipro_messages FORCE ROW LEVEL SECURITY;

-- Limpeza de policies antigas para evitar conflitos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'imobipro_messages'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS imobipro_messages_select_authenticated ON public.imobipro_messages';
  END IF;
END $$;

-- SELECT: permitir apenas usuários autenticados (temporário)
CREATE POLICY imobipro_messages_select_authenticated
  ON public.imobipro_messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Índices para performance na UI (lista por sessão e ordenação por data)
CREATE INDEX IF NOT EXISTS idx_imobipro_messages_session_id ON public.imobipro_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_imobipro_messages_data_desc ON public.imobipro_messages(data DESC);

COMMIT;

-- TODO (futuro):
-- 1) Adicionar coluna company_id (uuid) e backfill
-- 2) Endurecer policy: company_id = claim.company_id
-- 3) WITH CHECK para INSERT/UPDATE

