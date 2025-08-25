# IMOBIPRO Database Migration Package

Este pacote contém todas as migrations e configurações necessárias para instalar o sistema IMOBIPRO em um projeto Supabase novo.

## 📋 Conteúdo do Pacote

```
supabase/
├── migrations/
│   └── 20250825193901_complete_remote_schema.sql    # Schema completo
├── functions/
│   ├── admin-create-user/                           # Edge functions
│   ├── admin-update-user/
│   ├── admin-delete-user/
│   └── README.md                                    # Documentação das functions
├── seed.sql                                         # Dados de demonstração
└── README_MIGRATIONS.md                             # Este arquivo
```

## 🔧 Pré-requisitos

### Instalações Necessárias
```bash
# Node.js 18+ 
node --version

# Supabase CLI
npm install -g @supabase/cli

# Verificar instalação
supabase --version
```

### Conta Supabase
- Projeto Supabase criado (gratuito ou Pro)
- Acesso às credenciais do projeto
- Permissions de administrador no projeto

## 🚀 Instalação Passo a Passo

### 1. Preparação do Ambiente

```bash
# Clonar ou copiar o diretório supabase/
cd seu-projeto/

# Login no Supabase CLI
supabase login

# Linkar ao seu projeto (substitua pelo seu PROJECT_REF)
supabase link --project-ref abcdefghijklmnopqrstuvwxyz
```

### 2. Aplicar Migrations

⚠️ **ATENÇÃO:** Esta operação irá recriar todo o banco. Backup dos dados existentes antes de prosseguir.

```bash
# Opção 1: Reset completo (RECOMENDADO para novos projetos)
supabase db reset

# Opção 2: Push das migrations (para projetos existentes)
supabase db push
```

### 3. Aplicar Dados de Demonstração (Opcional)

```bash
# Via Supabase CLI
supabase db execute --file supabase/seed.sql

# OU via Dashboard
# Copie o conteúdo de seed.sql e execute no SQL Editor
```

### 4. Deploy das Edge Functions

```bash
# Deploy de todas as functions
supabase functions deploy admin-create-user
supabase functions deploy admin-update-user  
supabase functions deploy admin-delete-user

# OU em batch
supabase functions deploy admin-create-user admin-update-user admin-delete-user
```

### 5. Configurar Variáveis de Ambiente

```bash
# No seu projeto .env ou configuração do frontend
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui

# Para as Edge Functions (via Supabase Dashboard)
# Settings > Edge Functions > Environment Variables
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui
```

## 🗄️ Estrutura do Banco Criada

### Tabelas Principais
- `companies` - Empresas/imobiliárias
- `user_profiles` - Perfis de usuário  
- `imoveisvivareal` - Propriedades/imóveis (tabela principal)
- `leads` - Leads de clientes
- `contracts` - Contratos
- `contract_templates` - Templates de contrato
- `imobipro_messages` - Sistema de mensagens/WhatsApp
- `oncall_schedules` - Sistema de plantão
- `role_permissions` - Permissões por role

### Recursos Configurados
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Policies baseadas em company_id e roles
- ✅ Triggers automáticos (created_at, updated_at)
- ✅ Funções auxiliares (get_user_company_id, etc.)
- ✅ Índices de performance
- ✅ Constraints de integridade
- ✅ Audit logs automático

### Roles de Usuário
- **admin**: Acesso global, pode gerenciar qualquer empresa
- **gestor**: Acesso total à própria empresa, gerencia corretores
- **corretor**: Acesso limitado aos próprios leads/propriedades

## 🔐 Segurança e RLS

### Políticas Implementadas
- Usuários só veem dados da própria empresa (company_id)
- Corretores só veem leads atribuídos a eles
- Gestores veem tudo da empresa
- Admins têm acesso global mas são auditados

### Audit Logs
Todas as operações críticas são registradas em `audit_logs`:
- Criação/edição de propriedades
- Gestão de leads
- Alterações de usuários
- Operações administrativas

## 👥 Criação do Primeiro Usuário Admin

Após aplicar as migrations, você precisa criar um usuário admin:

### 1. Via Supabase Dashboard
```sql
-- No SQL Editor do Dashboard
-- Primeiro criar usuário no auth
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  email_confirmed_at,
  phone_confirmed_at,
  confirmation_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@seudominio.com',
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW(),
  NOW(),
  NULL,
  NOW()
);

-- Depois criar o perfil admin
INSERT INTO public.user_profiles (
  user_id,
  email,
  role,
  company_id,
  full_name
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@seudominio.com'),
  'admin@seudominio.com',
  'admin',
  NULL,
  'Administrador do Sistema'
);
```

### 2. Via Edge Function (após deploy)
```bash
curl -X POST 'https://seu-projeto.supabase.co/functions/v1/admin-create-user' \
  -H 'Authorization: Bearer SEU_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@seudominio.com",
    "role": "admin",
    "company_id": null
  }'
```

## 🧪 Dados de Demonstração

Se você aplicou o `seed.sql`, terá:
- 2 empresas de demonstração
- Propriedades de exemplo
- Templates de contrato
- Permissões configuradas
- Configurações básicas

**IDs de Teste:**
- Empresa 1: `550e8400-e29b-41d4-a716-446655440001`
- Empresa 2: `550e8400-e29b-41d4-a716-446655440002`

## 🔍 Validação da Instalação

### Verificar Tabelas
```sql
-- Contar tabelas criadas (deve ser 16 tabelas principais)
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verificar tabelas principais
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('companies', 'user_profiles', 'imoveisvivareal', 'leads', 'contracts', 'contract_templates', 'imobipro_messages', 'oncall_schedules', 'role_permissions');
```

### Verificar RLS
```sql
-- Verificar se RLS está ativo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

### Verificar Functions
```sql
-- Listar funções customizadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

### Verificar Edge Functions
```bash
# Listar functions deployadas
supabase functions list
```

## 🐛 Troubleshooting

### Erro: "relation does not exist"
**Causa:** Migration não foi aplicada corretamente
**Solução:** 
```bash
supabase db reset
# ou
supabase db push
```

### Erro: "permission denied for table"
**Causa:** RLS bloqueando acesso
**Solução:** Verificar se user_profiles está criado corretamente

### Erro: "JWT expired" nas Edge Functions
**Causa:** Token de autenticação inválido
**Solução:** Fazer novo login no frontend

### Erro: "Network error" 
**Causa:** URL ou chaves incorretas
**Solução:** Verificar SUPABASE_URL e SUPABASE_ANON_KEY

### Performance Lenta
**Solução:** Verificar se os índices foram criados:
```sql
-- Verificar índices
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';
```

## 📞 Suporte

### Logs do Sistema
```bash
# Logs das Edge Functions
supabase functions logs admin-create-user

# Logs do banco (via Dashboard)
# Database > Logs
```

### Documentação Adicional
- [Documentação oficial Supabase](https://supabase.com/docs)
- [Guide de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)

### Arquivos de Referência
- `docs/schema-db-imobipro.md` - Documentação detalhada do schema
- `docs/hierarquia-usuarios.md` - Matriz de permissões
- `supabase/functions/README.md` - Documentação das Edge Functions

## 🔄 Atualizações Futuras

Para aplicar novas migrations:
```bash
# Baixar novas migrations
git pull origin main

# Aplicar incrementalmente  
supabase db push

# OU reset completo (perde dados)
supabase db reset
```

---

**Versão:** 1.0.1  
**Data:** 2025-01-25  
**Compatibilidade:** Supabase CLI 1.x+, PostgreSQL 15+

**Nota:** Schema atualizado para remover tabelas não utilizadas:
- Removidas: `properties`, `property_images`, `whatsapp_chats`, `whatsapp_messages`, `oncall_events`
- Usando: `imoveisvivareal` para propriedades, `imobipro_messages` para WhatsApp
