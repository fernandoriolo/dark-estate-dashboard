-- Relaciona mensagens a conversas

ALTER TABLE public.inquilinato_messages
ADD COLUMN IF NOT EXISTS conversation_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_inq_messages_conversation_id ON public.inquilinato_messages(conversation_id);


