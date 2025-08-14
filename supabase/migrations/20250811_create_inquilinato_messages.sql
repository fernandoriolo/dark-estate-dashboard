-- Tabela de histórico do chat da Lei do Inquilinato
-- Convenções: snake_case, RLS habilitada, políticas por usuário

CREATE TABLE IF NOT EXISTS public.inquilinato_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inquilinato_messages_user_id ON public.inquilinato_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_inquilinato_messages_created_at ON public.inquilinato_messages(created_at);

-- RLS
ALTER TABLE public.inquilinato_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário só lê suas próprias mensagens
CREATE POLICY inquilinato_messages_select_own ON public.inquilinato_messages
FOR SELECT
USING (user_id = auth.uid());

-- INSERT: usuário só insere mensagens atribuídas a si mesmo
CREATE POLICY inquilinato_messages_insert_own ON public.inquilinato_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND role IN ('user','assistant')
);

-- Nota: Sem UPDATE/DELETE por padrão. Criar conforme necessidade operacional.


