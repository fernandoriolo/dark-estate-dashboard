-- Add disponibilidade to properties and adjust RLS to allow UPDATE of disponibilidade by any authenticated
BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS disponibilidade text CHECK (disponibilidade in ('disponivel','indisponivel','reforma')) DEFAULT 'disponivel',
  ADD COLUMN IF NOT EXISTS disponibilidade_observacao text;

-- Trigger to enforce that non-admin/gestor can only change disponibilidade fields
CREATE OR REPLACE FUNCTION public.enforce_properties_limited_update()
RETURNS trigger AS $$
DECLARE v_role text;
BEGIN
  v_role := public.get_user_role();
  IF v_role NOT IN ('admin','gestor') THEN
    -- If any field other than disponibilidade/disponibilidade_observacao/updated_at changes, block
    IF (to_jsonb(NEW) - '{disponibilidade,disponibilidade_observacao,updated_at}'::text[])
       IS DISTINCT FROM (to_jsonb(OLD) - '{disponibilidade,disponibilidade_observacao,updated_at}'::text[]) THEN
      RAISE EXCEPTION 'Apenas atualização de disponibilidade é permitida para o seu perfil' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_limited_update ON public.properties;
CREATE TRIGGER trg_properties_limited_update
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.enforce_properties_limited_update();

-- Similar trigger for imoveisvivareal (completa proteção de campos)
CREATE OR REPLACE FUNCTION public.enforce_imoveis_limited_update()
RETURNS trigger AS $$
DECLARE v_role text;
BEGIN
  v_role := public.get_user_role();
  IF v_role NOT IN ('admin','gestor') THEN
    IF (to_jsonb(NEW) - '{disponibilidade,disponibilidade_observacao,updated_at}'::text[])
       IS DISTINCT FROM (to_jsonb(OLD) - '{disponibilidade,disponibilidade_observacao,updated_at}'::text[]) THEN
      RAISE EXCEPTION 'Apenas atualização de disponibilidade é permitida para o seu perfil' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_imoveis_limited_update ON public.imoveisvivareal;
CREATE TRIGGER trg_imoveis_limited_update
BEFORE UPDATE ON public.imoveisvivareal
FOR EACH ROW
EXECUTE FUNCTION public.enforce_imoveis_limited_update();

-- Policies: allow UPDATE for authenticated (enforced by trigger for non-admin/gestor)
DROP POLICY IF EXISTS properties_update_admin_gestor ON public.properties;
CREATE POLICY properties_update_admin_gestor ON public.properties
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS imoveisvivareal_update_admin_gestor ON public.imoveisvivareal;
CREATE POLICY imoveisvivareal_update_admin_gestor ON public.imoveisvivareal
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

COMMIT;
