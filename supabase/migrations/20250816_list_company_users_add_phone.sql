-- Atualiza RPC list_company_users para incluir phone no retorno e na busca
-- Safe replace: drop da assinatura existente e recriação com novo OUT

DROP FUNCTION IF EXISTS public.list_company_users(uuid, text, text[], int, int);

CREATE OR REPLACE FUNCTION public.list_company_users(
  target_company_id uuid DEFAULT NULL,
  search text DEFAULT NULL,
  roles text[] DEFAULT NULL,
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
) RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  company_id uuid,
  phone text,
  is_active boolean,
  created_at timestamptz
) AS $$
  SELECT up.id,
         up.email,
         up.full_name,
         up.role,
         up.company_id,
         up.phone,
         up.is_active,
         up.created_at
  FROM public.user_profiles up
  WHERE (search IS NULL OR (
          up.full_name ILIKE ('%'||search||'%') OR
          up.email ILIKE ('%'||search||'%') OR
          up.phone ILIKE ('%'||search||'%')
        ))
    AND (roles IS NULL OR up.role = ANY(roles))
  ORDER BY up.created_at DESC
  LIMIT limit_count OFFSET offset_count;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION public.list_company_users(uuid, text, text[], int, int)
IS 'Single-tenant: retorna todos os usuários incluindo phone; suporta filtros opcionais por busca/roles e paginação.';


