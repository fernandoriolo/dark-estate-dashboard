-- Adiciona permissão de menu para o módulo Plantão
-- Idioma: pt-BR

INSERT INTO public.role_permissions (role, permission_key, permission_name, category, description, is_enabled) VALUES
  ('corretor', 'menu_plantao', 'Plantão', 'menu', 'Acessar módulo Plantão', true),
  ('gestor',   'menu_plantao', 'Plantão', 'menu', 'Acessar módulo Plantão', true),
  ('admin',    'menu_plantao', 'Plantão', 'menu', 'Acessar módulo Plantão', true)
ON CONFLICT (role, permission_key) DO NOTHING;


