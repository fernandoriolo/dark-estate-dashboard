-- ==================================================
-- RPC: list_company_users (remover escopo por company)
-- Objetivo: Sistema single-tenant (uma empresa) — listar todos os usuários
-- sem dependência de company_id, mantendo filtros opcionais e paginação.
-- Data: 2025-08-13
-- ==================================================

CREATE OR REPLACE FUNCTION public.list_company_users(
  target_company_id uuid DEFAULT NULL, -- ignorado no modo single-tenant
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
  is_active boolean,
  created_at timestamptz
) AS $$
  /*
    Single-tenant: não aplicar nenhum filtro por empresa.
    Mantém filtros opcionais por search/roles e paginação.
    Importante: assinatura mantida para compatibilidade com o frontend.
  */
  SELECT up.id,
         up.email,
         up.full_name,
         up.role,
         up.company_id,
         up.is_active,
         up.created_at
  FROM public.user_profiles up
  WHERE (search IS NULL OR (up.full_name ILIKE ('%'||search||'%') OR up.email ILIKE ('%'||search||'%')))
    AND (roles IS NULL OR up.role = ANY(roles))
  ORDER BY up.created_at DESC
  LIMIT limit_count OFFSET offset_count;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION public.list_company_users(uuid, text, text[], int, int)
IS 'Single-tenant: retorna todos os usuários sem filtro por empresa; suporta filtros opcionais por busca/roles e paginação.';


