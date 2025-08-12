-- ==================================================
-- RPC: list_company_users (SECURITY DEFINER)
-- Lista usuários por empresa com checagens de papel
-- Data: 2025-08-10
-- ==================================================

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
  is_active boolean,
  created_at timestamptz
) AS $$
DECLARE
  requester_role text;
  requester_company uuid;
  effective_company uuid;
BEGIN
  requester_role := public.get_user_role();
  requester_company := public.get_user_company_id();

  IF requester_role = 'admin' THEN
    effective_company := COALESCE(target_company_id, requester_company);
  ELSIF requester_role = 'gestor' THEN
    effective_company := requester_company;
  ELSE
    -- corretor: retornar apenas o próprio registro
    RETURN QUERY
      SELECT up.id, up.email, up.full_name, up.role, up.company_id, up.is_active, up.created_at
      FROM public.user_profiles up
      WHERE up.id = auth.uid();
    RETURN;
  END IF;

  RETURN QUERY
    SELECT up.id, up.email, up.full_name, up.role, up.company_id, up.is_active, up.created_at
    FROM public.user_profiles up
    WHERE (effective_company IS NULL OR up.company_id = effective_company)
      AND (search IS NULL OR (up.full_name ILIKE ('%'||search||'%') OR up.email ILIKE ('%'||search||'%')))
      AND (roles IS NULL OR up.role = ANY(roles))
    ORDER BY up.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.list_company_users(uuid, text, text[], int, int)
IS 'Lista usuários por empresa com checagens de papel (admin global; gestor empresa própria; corretor apenas si próprio)';


