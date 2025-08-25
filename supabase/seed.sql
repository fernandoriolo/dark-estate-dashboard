-- =============================================================================
-- SEED DATA FOR IMOBIPRO SYSTEM
-- =============================================================================
-- This file contains safe demo data for new installations
-- DO NOT include production data, PII, or sensitive information

-- Demo company data
INSERT INTO public.companies (id, name, email, phone, address, active, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Demo Imobiliária', 'contato@demoimobiliaria.com', '+5511999999999', 'Rua Demo, 123 - São Paulo, SP', true, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Exemplo Imóveis', 'info@exemploimoveis.com', '+5511888888888', 'Av. Exemplo, 456 - Rio de Janeiro, RJ', true, NOW());

-- Demo company features
INSERT INTO public.company_features (id, company_id, feature_name, enabled, created_at) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'whatsapp_integration', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'lead_management', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'property_management', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'contract_templates', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'whatsapp_integration', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'lead_management', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'property_management', true, NOW());

-- Demo company settings
INSERT INTO public.company_settings (id, company_id, setting_key, setting_value, created_at) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'timezone', 'America/Sao_Paulo', NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'currency', 'BRL', NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'default_commission_rate', '5.0', NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'timezone', 'America/Sao_Paulo', NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'currency', 'BRL', NOW());

-- Demo properties
INSERT INTO public.properties (id, company_id, title, description, property_type, property_purpose, price, location, neighborhood, city, state, zip_code, bedrooms, bathrooms, garage_spaces, area_m2, active, created_at) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'Apartamento 2 Quartos - Demo', 'Apartamento demonstrativo com 2 quartos, sala, cozinha e banheiro. Localização privilegiada.', 'Apartamento', 'Aluguel', 2500.00, 'Rua das Flores, 123', 'Centro', 'São Paulo', 'SP', '01000-000', 2, 1, 1, 65.50, true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'Casa 3 Quartos - Exemplo', 'Casa de exemplo com 3 quartos, 2 banheiros, sala, cozinha e quintal.', 'Casa', 'Venda', 450000.00, 'Av. Principal, 789', 'Jardim Exemplo', 'São Paulo', 'SP', '01200-000', 3, 2, 2, 120.00, true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'Loft Moderno - Demo', 'Loft moderno e funcional, ideal para jovens profissionais.', 'Loft', 'Aluguel', 1800.00, 'Rua Moderna, 456', 'Vila Nova', 'Rio de Janeiro', 'RJ', '20000-000', 1, 1, 1, 45.00, true, NOW());

-- Demo contract templates  
INSERT INTO public.contract_templates (id, company_id, name, template_type, content, active, created_at) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'Contrato de Locação Padrão', 'locacao', 'Este é um template de demonstração para contratos de locação. {{nome_locatario}} compromete-se a pagar o valor de R$ {{valor_aluguel}} mensalmente.', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'Contrato de Venda Padrão', 'venda', 'Template demonstrativo para contratos de venda. O comprador {{nome_comprador}} adquire o imóvel pelo valor de R$ {{valor_venda}}.', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'Contrato de Locação Simples', 'locacao', 'Template simples de locação para demonstração do sistema.', true, NOW());

-- Demo role permissions
INSERT INTO public.role_permissions (id, company_id, role, module, permission, granted, created_at) VALUES
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'gestor', 'properties', 'read', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'gestor', 'properties', 'write', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'gestor', 'leads', 'read', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'gestor', 'leads', 'write', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'corretor', 'properties', 'read', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'corretor', 'leads', 'read', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'corretor', 'leads', 'write', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'gestor', 'properties', 'read', true, NOW()),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'gestor', 'leads', 'read', true, NOW());

-- =============================================================================
-- INSTRUCTIONS FOR USE
-- =============================================================================
-- 
-- To apply this seed data:
-- 1. Ensure your migrations have been applied successfully
-- 2. Run: psql -h <host> -p <port> -U <user> -d <database> -f supabase/seed.sql
-- 3. Or use Supabase CLI: supabase db reset (applies migrations + seed)
-- 4. Or in Supabase Dashboard SQL Editor, copy and paste this content
--
-- Note: This creates demo companies with IDs that can be used for testing
-- Company 1 ID: 550e8400-e29b-41d4-a716-446655440001
-- Company 2 ID: 550e8400-e29b-41d4-a716-446655440002
--
-- Remember to create user profiles manually or via auth signup flow
-- as they depend on auth.users table managed by Supabase Auth
