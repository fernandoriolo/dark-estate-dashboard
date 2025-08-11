-- Harden storage policies for bucket `contract-templates`
-- - Leitura: limitada por empresa (gestor/admin) ou dono do objeto; admin é global
-- - Mutação: apenas autenticados; update/delete por dono ou gestor/admin da mesma empresa (admin global)
-- - Função auxiliar SECURITY DEFINER para checagem de empresa sem recursão de RLS

-- Função auxiliar: verifica se o usuário alvo pertence à mesma empresa do requester
CREATE OR REPLACE FUNCTION public.is_same_company_as(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = target_user_id
      AND up.company_id::text = public.get_user_company_id()
  );
$$;

COMMENT ON FUNCTION public.is_same_company_as(uuid)
IS 'Retorna true se target_user_id pertence à mesma company_id do requester (usa get_user_company_id; SECURITY DEFINER)';

-- Garantir bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-templates', 'contract-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas desse bucket
DROP POLICY IF EXISTS "Authenticated users can view contract templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contract templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract templates" ON storage.objects;

-- SELECT: dono, gestor/admin da mesma empresa, ou admin global
CREATE POLICY "contract_templates_select_scoped" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'contract-templates'
  AND (
    owner = auth.uid()
    OR (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
    OR (
      (current_setting('request.jwt.claims', true)::json->>'role') IN ('gestor')
      AND public.is_same_company_as(owner)
    )
  )
);

-- INSERT: qualquer autenticado pode inserir nesse bucket
CREATE POLICY "contract_templates_insert_authenticated" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'contract-templates' AND auth.role() = 'authenticated'
);

-- UPDATE: dono, gestor mesma empresa, ou admin
CREATE POLICY "contract_templates_update_scoped" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'contract-templates'
  AND (
    owner = auth.uid()
    OR (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
    OR (
      (current_setting('request.jwt.claims', true)::json->>'role') IN ('gestor')
      AND public.is_same_company_as(owner)
    )
  )
)
WITH CHECK (bucket_id = 'contract-templates');

-- DELETE: dono, gestor mesma empresa, ou admin
CREATE POLICY "contract_templates_delete_scoped" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'contract-templates'
  AND (
    owner = auth.uid()
    OR (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
    OR (
      (current_setting('request.jwt.claims', true)::json->>'role') IN ('gestor')
      AND public.is_same_company_as(owner)
    )
  )
);


