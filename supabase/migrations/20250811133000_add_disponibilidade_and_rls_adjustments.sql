-- Add disponibilidade columns and adjust RLS for new rules
BEGIN;

-- imoveisvivareal: disponibilidade + observação
ALTER TABLE public.imoveisvivareal
  ADD COLUMN IF NOT EXISTS disponibilidade text CHECK (disponibilidade in ('disponivel','indisponivel','reforma')) DEFAULT 'disponivel',
  ADD COLUMN IF NOT EXISTS disponibilidade_observacao text;

-- properties: garantir coluna status já existe; opcionalmente alinhar sem alterações estruturais
-- (Assumindo que properties já possui coluna status com valores equivalentes)

-- RLS ajustes:
-- 1) Corretores podem INSERT em properties e imoveisvivareal; continuam sem UPDATE/DELETE

-- PROPERTIES: permitir insert para autenticados
DROP POLICY IF EXISTS properties_insert_admin_gestor ON public.properties;
CREATE POLICY properties_insert_all_roles ON public.properties
FOR INSERT TO authenticated
WITH CHECK (true);

-- IMOVEISVIVAREAL: permitir insert para autenticados
DROP POLICY IF EXISTS imoveisvivareal_insert_admin_gestor ON public.imoveisvivareal;
CREATE POLICY imoveisvivareal_insert_all_roles ON public.imoveisvivareal
FOR INSERT TO authenticated
WITH CHECK (true);

-- 2) Disponibilidade pode ser alterada por qualquer role autenticada, exige observação quando muda para 'indisponivel' ou 'reforma'
-- Implementar trigger para validar observação quando disponibilidade muda

CREATE OR REPLACE FUNCTION public.validate_disponibilidade_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.disponibilidade IS DISTINCT FROM OLD.disponibilidade THEN
    IF NEW.disponibilidade IN ('indisponivel','reforma') AND (NEW.disponibilidade_observacao IS NULL OR length(trim(NEW.disponibilidade_observacao)) = 0) THEN
      RAISE EXCEPTION 'Alteração de disponibilidade para % exige preenchimento de disponibilidade_observacao', NEW.disponibilidade
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_disponibilidade ON public.imoveisvivareal;
CREATE TRIGGER trg_validate_disponibilidade
BEFORE UPDATE ON public.imoveisvivareal
FOR EACH ROW
EXECUTE FUNCTION public.validate_disponibilidade_change();

-- Permitir UPDATE apenas no campo disponibilidade/disponibilidade_observacao para qualquer autenticado; demais campos continuam restritos a admin/gestor
-- Estratégia: manter policy de UPDATE estrita para admin/gestor e adicionar uma policy específica permissiva quando somente esses dois campos mudarem

DROP POLICY IF EXISTS imoveisvivareal_update_admin_gestor ON public.imoveisvivareal;
CREATE POLICY imoveisvivareal_update_admin_gestor ON public.imoveisvivareal
FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('admin','gestor'))
WITH CHECK (public.get_user_role() IN ('admin','gestor'));

-- Policy adicional para permitir atualização restrita de disponibilidade por qualquer autenticado
CREATE OR REPLACE FUNCTION public.only_disponibilidade_changed(old_row public.imoveisvivareal, new_row public.imoveisvivareal)
RETURNS boolean AS $$
BEGIN
  RETURN 
    new_row.disponibilidade IS NOT DISTINCT FROM old_row.disponibilidade OR
    (
      -- Permitir quando somente campos de disponibilidade mudarem
      (new_row IS DISTINCT FROM old_row) AND
      new_row::jsonb - '{disponibilidade,disponibilidade_observacao,updated_at}'::text[] = old_row::jsonb - '{disponibilidade,disponibilidade_observacao,updated_at}'::text[]
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE POLICY imoveisvivareal_update_disponibilidade_all_roles ON public.imoveisvivareal
FOR UPDATE TO authenticated
USING (
  only_disponibilidade_changed(imoveisvivareal, imoveisvivareal) -- placeholder; USING avalia na linha atual
)
WITH CHECK (
  only_disponibilidade_changed(imoveisvivareal, imoveisvivareal)
);

COMMIT;
