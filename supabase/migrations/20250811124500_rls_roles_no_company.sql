-- RLS por role (sem companies) para properties e imoveisvivareal
BEGIN;

-- PROPERTIES
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename = 'properties' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.properties';
  END LOOP;
END $$;

-- Leitura: qualquer usuário autenticado pode ler
CREATE POLICY properties_select_all_roles ON public.properties
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Inserção: apenas admin/gestor
CREATE POLICY properties_insert_admin_gestor ON public.properties
FOR INSERT
WITH CHECK (public.get_user_role() IN ('admin','gestor'));

-- Update: apenas admin/gestor
CREATE POLICY properties_update_admin_gestor ON public.properties
FOR UPDATE
USING (public.get_user_role() IN ('admin','gestor'))
WITH CHECK (public.get_user_role() IN ('admin','gestor'));

-- Delete: apenas admin/gestor
CREATE POLICY properties_delete_admin_gestor ON public.properties
FOR DELETE
USING (public.get_user_role() IN ('admin','gestor'));


-- PROPERTY_IMAGES (seguir mesmo modelo de gestão)
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol2 RECORD;
BEGIN
  FOR pol2 IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename = 'property_images' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol2.policyname) || ' ON public.property_images';
  END LOOP;
END $$;

-- Leitura: autenticados
CREATE POLICY property_images_select_all_roles ON public.property_images
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Inserção/Update/Delete: admin/gestor
CREATE POLICY property_images_insert_admin_gestor ON public.property_images
FOR INSERT
WITH CHECK (public.get_user_role() IN ('admin','gestor'));

CREATE POLICY property_images_update_admin_gestor ON public.property_images
FOR UPDATE
USING (public.get_user_role() IN ('admin','gestor'))
WITH CHECK (public.get_user_role() IN ('admin','gestor'));

CREATE POLICY property_images_delete_admin_gestor ON public.property_images
FOR DELETE
USING (public.get_user_role() IN ('admin','gestor'));


-- IMOVEISVIVAREAL
ALTER TABLE public.imoveisvivareal ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol3 RECORD;
BEGIN
  FOR pol3 IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename = 'imoveisvivareal' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol3.policyname) || ' ON public.imoveisvivareal';
  END LOOP;
END $$;

-- Leitura: qualquer usuário autenticado pode ler
CREATE POLICY imoveisvivareal_select_all_roles ON public.imoveisvivareal
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Inserção: admin/gestor
CREATE POLICY imoveisvivareal_insert_admin_gestor ON public.imoveisvivareal
FOR INSERT
WITH CHECK (public.get_user_role() IN ('admin','gestor'));

-- Update: admin/gestor
CREATE POLICY imoveisvivareal_update_admin_gestor ON public.imoveisvivareal
FOR UPDATE
USING (public.get_user_role() IN ('admin','gestor'))
WITH CHECK (public.get_user_role() IN ('admin','gestor'));

-- Delete: admin/gestor
CREATE POLICY imoveisvivareal_delete_admin_gestor ON public.imoveisvivareal
FOR DELETE
USING (public.get_user_role() IN ('admin','gestor'));

COMMIT;
