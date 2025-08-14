-- Conversas do chat da Lei do Inquilinato

CREATE TABLE IF NOT EXISTS public.inquilinato_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NULL,
  title TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inq_conversations_user_id ON public.inquilinato_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_inq_conversations_last_message_at ON public.inquilinato_conversations(last_message_at);

ALTER TABLE public.inquilinato_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY inq_conversations_select_own ON public.inquilinato_conversations
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY inq_conversations_insert_own ON public.inquilinato_conversations
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY inq_conversations_update_own ON public.inquilinato_conversations
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_inq_conversations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_inq_conversations_updated_at ON public.inquilinato_conversations;
CREATE TRIGGER update_inq_conversations_updated_at
  BEFORE UPDATE ON public.inquilinato_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_inq_conversations_updated_at();


