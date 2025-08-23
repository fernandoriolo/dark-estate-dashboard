-- Policies para notifications e connection_requests
-- Assume helpers get_user_company_id() e get_user_role() já existem

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas conflitantes (se existirem)
DO $$ BEGIN
  DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
  DROP POLICY IF EXISTS notifications_insert_company ON public.notifications;
  DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: somente o dono da notificação
CREATE POLICY notifications_select_own ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- INSERT: qualquer usuário pode criar notificação para usuários da MESMA empresa
-- Garante que o alvo pertence à mesma company
CREATE POLICY notifications_insert_company ON public.notifications
FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = notifications.user_id
      AND up.company_id = public.get_user_company_id()
  )
);

-- UPDATE: apenas o dono pode atualizar (ex.: marcar como lida)
CREATE POLICY notifications_update_own ON public.notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);


-- Connection Requests
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS connection_requests_select_scope ON public.connection_requests;
  DROP POLICY IF EXISTS connection_requests_insert_self ON public.connection_requests;
  DROP POLICY IF EXISTS connection_requests_update_manager ON public.connection_requests;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: dono vê as próprias; gestores/admins veem da empresa
CREATE POLICY connection_requests_select_scope ON public.connection_requests
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    public.get_user_role() IN ('gestor','admin')
    AND company_id = public.get_user_company_id()
  )
);

-- INSERT: corretor cria para si na própria empresa
CREATE POLICY connection_requests_insert_self ON public.connection_requests
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND company_id = public.get_user_company_id()
);

-- UPDATE: gestores/admins da mesma empresa podem aprovar/rejeitar
CREATE POLICY connection_requests_update_manager ON public.connection_requests
FOR UPDATE
USING (
  public.get_user_role() IN ('gestor','admin')
  AND company_id = public.get_user_company_id()
)
WITH CHECK (
  public.get_user_role() IN ('gestor','admin')
  AND company_id = public.get_user_company_id()
);

-- Índice para filtro por empresa e status
CREATE INDEX IF NOT EXISTS idx_connection_requests_company_status ON public.connection_requests(company_id, status);


