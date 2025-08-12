-- Company features and RLS hardening

-- 1) Table: company_features
CREATE TABLE IF NOT EXISTS public.company_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, feature_key)
);

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.update_company_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_features_updated_at ON public.company_features;
CREATE TRIGGER trg_company_features_updated_at
BEFORE UPDATE ON public.company_features
FOR EACH ROW EXECUTE FUNCTION public.update_company_features_updated_at();

-- 2) Enable RLS
ALTER TABLE public.company_features ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies (company scope; admin only can change; gestor/admin can read within company)
DROP POLICY IF EXISTS company_features_select ON public.company_features;
DROP POLICY IF EXISTS company_features_modify ON public.company_features;

CREATE POLICY company_features_select ON public.company_features
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.company_id = company_features.company_id
  )
);

CREATE POLICY company_features_modify ON public.company_features
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.company_id = company_features.company_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
      AND up.company_id = company_features.company_id
  )
);

-- 4) Seed canonical features if companies exist (idempotent)
INSERT INTO public.company_features (company_id, feature_key, is_enabled)
SELECT c.id, f.key, f.enabled
FROM public.companies c
JOIN (
  VALUES
    ('feature_clients_pipeline', true),
    ('feature_clients_crm', true),
    ('feature_connections', true)
) AS f(key, enabled) ON TRUE
ON CONFLICT (company_id, feature_key) DO NOTHING;

-- 5) Tighten user_profiles visibility per role/company
-- Remove permissive policy if present
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.user_profiles;

-- Ensure RLS policies aligned to roles
DROP POLICY IF EXISTS user_profiles_select_self ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_select_company_manager ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_self ON public.user_profiles;

CREATE POLICY user_profiles_select_self ON public.user_profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY user_profiles_select_company_manager ON public.user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles me
    WHERE me.id = auth.uid()
      AND me.company_id = user_profiles.company_id
      AND me.role IN ('gestor','admin')
  )
);

CREATE POLICY user_profiles_update_self ON public.user_profiles
FOR UPDATE USING (id = auth.uid());

-- 6) WhatsApp Instances RLS: company scope for manager, self for broker
DROP POLICY IF EXISTS whatsapp_instances_select ON public.whatsapp_instances;
DROP POLICY IF EXISTS whatsapp_instances_modify_self_or_manager ON public.whatsapp_instances;

CREATE POLICY whatsapp_instances_select ON public.whatsapp_instances
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles me
    WHERE me.id = auth.uid()
      AND me.company_id = whatsapp_instances.company_id
      AND me.role IN ('gestor','admin')
  )
);

CREATE POLICY whatsapp_instances_modify_self_or_manager ON public.whatsapp_instances
FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles me
    WHERE me.id = auth.uid()
      AND me.company_id = whatsapp_instances.company_id
      AND me.role IN ('gestor','admin')
  )
) WITH CHECK (
  (user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_profiles me
    WHERE me.id = auth.uid()
      AND me.company_id = whatsapp_instances.company_id
      AND me.role IN ('gestor','admin')
  )
);



