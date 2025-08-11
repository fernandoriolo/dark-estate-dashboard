-- Adiciona permissão de menu para o módulo "Lei do Inquilinato"
-- Segue convenções: snake_case no DB; ON CONFLICT para idempotência

INSERT INTO public.role_permissions (role, permission_key, permission_name, category, description, is_enabled)
VALUES
  ('corretor', 'menu_inquilinato', 'Lei do Inquilinato', 'menu', 'Módulo informativo da Lei do Inquilinato', true),
  ('gestor',   'menu_inquilinato', 'Lei do Inquilinato', 'menu', 'Módulo informativo da Lei do Inquilinato', true),
  ('admin',    'menu_inquilinato', 'Lei do Inquilinato', 'menu', 'Módulo informativo da Lei do Inquilinato', true)
ON CONFLICT (role, permission_key) DO NOTHING;


