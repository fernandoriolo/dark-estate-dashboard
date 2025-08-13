-- Criação da tabela de auditoria (audit_logs)
-- Rastreia ações de usuários por recurso

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NULL,
  actor_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Trilhas de auditoria de ações do sistema';
COMMENT ON COLUMN public.audit_logs.company_id IS 'Empresa do evento para escopo de RLS';
COMMENT ON COLUMN public.audit_logs.actor_id IS 'Usuário autor da ação';
COMMENT ON COLUMN public.audit_logs.action IS 'Ação realizada (ex: lead.created)';
COMMENT ON COLUMN public.audit_logs.resource IS 'Recurso alvo (ex: lead, property, whatsapp_message)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID do recurso alvo';
COMMENT ON COLUMN public.audit_logs.meta IS 'Dados adicionais da ação (JSON)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Políticas
DO $$
BEGIN
  -- Limpar políticas antigas (idempotente)
  PERFORM 1 FROM pg_policy WHERE polrelid = 'public.audit_logs'::regclass;
  IF FOUND THEN
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_select_scope ON public.audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_insert_scope ON public.audit_logs';
  END IF;

  -- SELECT: Admin/Gestor veem por company_id; Corretor vê somente seus próprios logs
  CREATE POLICY audit_logs_select_scope ON public.audit_logs
    FOR SELECT USING (
      (
        (current_setting('request.jwt.claims', true)::json->>'role') IN ('admin','gestor')
        AND company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid
      )
      OR actor_id = auth.uid()
    );

  -- INSERT: Qualquer autenticado pode inserir seus próprios logs; company_id deve bater com claim
  CREATE POLICY audit_logs_insert_scope ON public.audit_logs
    FOR INSERT WITH CHECK (
      (auth.uid() IS NOT NULL)
      AND (actor_id = auth.uid())
      AND (
        company_id IS NULL OR
        company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid
      )
    );
END $$;


