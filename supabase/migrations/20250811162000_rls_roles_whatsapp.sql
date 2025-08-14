-- WHATSAPP_* RLS por role

-- INSTANCES: apenas gestor/admin
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instances FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  PERFORM 1 FROM pg_policy WHERE polrelid = 'public.whatsapp_instances'::regclass;
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_instances_select_company_manager ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_instances_insert_check_company ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_instances_update_delete_scope ON public.whatsapp_instances';
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_instances_delete_scope ON public.whatsapp_instances';
  END IF;
END $$;

CREATE POLICY whatsapp_instances_select_by_role ON public.whatsapp_instances
FOR SELECT USING (public.get_current_role() IN ('admin','gestor'));
CREATE POLICY whatsapp_instances_insert_by_role ON public.whatsapp_instances
FOR INSERT WITH CHECK (public.get_current_role() IN ('admin','gestor'));
CREATE POLICY whatsapp_instances_update_by_role ON public.whatsapp_instances
FOR UPDATE USING (public.get_current_role() IN ('admin','gestor')) WITH CHECK (public.get_current_role() IN ('admin','gestor'));
CREATE POLICY whatsapp_instances_delete_by_role ON public.whatsapp_instances
FOR DELETE USING (public.get_current_role() IN ('admin','gestor'));

-- CHATS: admin/gestor todos; corretor apenas os seus
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chats FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  PERFORM 1 FROM pg_policy WHERE polrelid = 'public.whatsapp_chats'::regclass;
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_chats_select_company_manager ON public.whatsapp_chats';
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_chats_write_scope ON public.whatsapp_chats';
  END IF;
END $$;

CREATE POLICY whatsapp_chats_select_by_role ON public.whatsapp_chats
FOR SELECT
USING (
  CASE public.get_current_role()
    WHEN 'admin' THEN true
    WHEN 'gestor' THEN true
    ELSE (user_id = auth.uid())
  END
);

CREATE POLICY whatsapp_chats_insert_by_role ON public.whatsapp_chats
FOR INSERT
WITH CHECK (
  CASE public.get_current_role()
    WHEN 'admin' THEN true
    WHEN 'gestor' THEN true
    ELSE (user_id = auth.uid())
  END
);

CREATE POLICY whatsapp_chats_update_by_role ON public.whatsapp_chats
FOR UPDATE
USING (public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid())
WITH CHECK (public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid());

CREATE POLICY whatsapp_chats_delete_by_role ON public.whatsapp_chats
FOR DELETE USING (public.get_current_role() IN ('admin','gestor'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_user_id ON public.whatsapp_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_created_at ON public.whatsapp_chats(created_at DESC);

-- MESSAGES: admin/gestor todos; corretor apenas os seus (from_me=true) e leitura dos seus chats
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  PERFORM 1 FROM pg_policy WHERE polrelid = 'public.whatsapp_messages'::regclass;
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_messages_select_company_manager ON public.whatsapp_messages';
    EXECUTE 'DROP POLICY IF EXISTS whatsapp_messages_write_scope ON public.whatsapp_messages';
  END IF;
END $$;

-- SELECT: gestor/admin todos; corretor: mensagens do próprio user_id OU de chats onde é dono
CREATE POLICY whatsapp_messages_select_by_role ON public.whatsapp_messages
FOR SELECT
USING (
  public.get_current_role() IN ('admin','gestor')
  OR user_id = auth.uid()
);

-- INSERT: corretor pode enviar (from_me=true) para seus chats; gestor/admin sem restrição
CREATE POLICY whatsapp_messages_insert_by_role ON public.whatsapp_messages
FOR INSERT
WITH CHECK (
  CASE public.get_current_role()
    WHEN 'admin' THEN true
    WHEN 'gestor' THEN true
    ELSE (user_id = auth.uid() AND from_me = true)
  END
);

CREATE POLICY whatsapp_messages_update_by_role ON public.whatsapp_messages
FOR UPDATE
USING (public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid())
WITH CHECK (public.get_current_role() IN ('admin','gestor') OR user_id = auth.uid());

CREATE POLICY whatsapp_messages_delete_by_role ON public.whatsapp_messages
FOR DELETE USING (public.get_current_role() IN ('admin','gestor'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);
