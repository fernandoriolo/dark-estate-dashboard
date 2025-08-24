-- Criação da tabela imobipro_messages
-- Tabela para armazenar mensagens do sistema ImobiPro (chat/conversas)
-- Convenções: snake_case, RLS habilitada, políticas por usuário autenticado

BEGIN;

-- Criar a tabela principal
CREATE TABLE IF NOT EXISTS public.imobipro_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  instancia TEXT,
  message JSONB NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  media TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE public.imobipro_messages IS 'Mensagens do sistema ImobiPro - chat e conversas';
COMMENT ON COLUMN public.imobipro_messages.session_id IS 'Identificador da sessão de conversa';
COMMENT ON COLUMN public.imobipro_messages.instancia IS 'Instância/corretor responsável pela conversa';
COMMENT ON COLUMN public.imobipro_messages.message IS 'Conteúdo da mensagem em formato JSON (type, content, etc.)';
COMMENT ON COLUMN public.imobipro_messages.data IS 'Timestamp da mensagem (pode diferir de created_at)';
COMMENT ON COLUMN public.imobipro_messages.media IS 'URL ou referência para mídia anexada';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_imobipro_messages_session_id ON public.imobipro_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_imobipro_messages_data_desc ON public.imobipro_messages(data DESC);
CREATE INDEX IF NOT EXISTS idx_imobipro_messages_instancia ON public.imobipro_messages(instancia);
CREATE INDEX IF NOT EXISTS idx_imobipro_messages_created_at ON public.imobipro_messages(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_imobipro_messages_updated_at
  BEFORE UPDATE ON public.imobipro_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.imobipro_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imobipro_messages FORCE ROW LEVEL SECURITY;

-- Políticas RLS
-- SELECT: permitir usuários autenticados (política temporária)
-- TODO: Implementar company_id e restringir por empresa
CREATE POLICY imobipro_messages_select_authenticated
  ON public.imobipro_messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- INSERT: permitir usuários autenticados
CREATE POLICY imobipro_messages_insert_authenticated
  ON public.imobipro_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: permitir usuários autenticados (restrito)
CREATE POLICY imobipro_messages_update_authenticated
  ON public.imobipro_messages
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- DELETE: não permitir por padrão (apenas admins via service role)
-- Sem policy de DELETE = ninguém pode deletar via RLS

COMMIT;

-- TODO (futuro):
-- 1) Adicionar coluna company_id (uuid) para multi-tenancy
-- 2) Endurecer policies: company_id = claim.company_id
-- 3) Implementar audit logs para mudanças
-- 4) Considerar particionamento por data se volume crescer muito
