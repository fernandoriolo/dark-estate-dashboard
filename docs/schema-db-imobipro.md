# ImobiPRO — Esquema de Banco de Dados (Supabase)

Este documento reflete o estado ATUAL do schema e das políticas RLS, após a migração do modelo multi-tenant por empresa para um modelo de acesso por papéis (role-based). A tabela `companies` permanece existente, porém INATIVA para RLS/negócio no MVP atual.

## Visão Geral de Schemas
- auth: autenticação do Supabase (gerenciado pela plataforma)
- public: domínio de negócio do ImobiPRO
- storage: objetos e buckets do Storage
- realtime/vault: serviços internos do Supabase

## Princípios de Segurança (RLS)
- Acesso controlado por role: `admin`, `gestor`, `corretor`.
- Função `public.get_current_role()` (SECURITY DEFINER) determina a role efetiva a partir de `user_profiles.role` (fallback: claim ou `corretor`).
- Padrões aplicados:
  - Admin/Gestor: acesso amplo e operações de gestão
  - Corretor: acesso restrito aos próprios dados; exceções explícitas documentadas
- FORCE RLS ativado onde indicado (ver cada tabela).
## Funções e Utilitários

- `public.get_current_role()`
  - SECURITY DEFINER, STABLE.
  - Busca a role do usuário em `public.user_profiles` por `auth.uid()`.
  - Fallback: `request.jwt.claims.user_metadata.role`, depois `corretor`.
  - Uso nas policies: padroniza checagens e endurece contra claims manipuladas.

---

## Tabelas do Schema public

### user_profiles — Perfis de Usuário
- PK: `id (uuid)` — espelha `auth.users.id`
- Campos principais: `email`, `full_name`, `role` (default 'corretor'), `phone`, `avatar_url`, `is_active`, timestamps
- RLS: HABILITADO (FORCE RLS recomendado)
  - SELECT/UPDATE: somente o próprio registro (`id = auth.uid()`).
- Observação: mantém `company_id` apenas por legado; não utilizado nas policies do MVP.

### properties — Imóveis
- PK: `id (text)`
- Campos: `title`, `type`, `price`, `area`, `bedrooms`, ... `user_id`, `company_id` (legado), `created_at`, `updated_at`,
  - Disponibilidade: `disponibilidade` ('disponivel' | 'indisponivel' | 'reforma'), `disponibilidade_observacao (text)`
- RLS: HABILITADO (FORCE RLS recomendado)
  - SELECT: todos autenticados podem ler (modelo aberto)
  - INSERT: todos autenticados (corretor pode adicionar)
  - UPDATE/DELETE: apenas `gestor`/`admin`
  - Exceção para corretor: pode atualizar apenas `disponibilidade` + `disponibilidade_observacao`
- Triggers/Validações:
  - Enforce de observação ao definir `indisponivel`/`reforma`
  - Restrição de UPDATE por corretor (apenas disponibilidade)
- Índices: `created_at DESC` (ordenar listagens recentes)

### property_images — Imagens de Imóveis
- PK: `id (uuid)`
- Campos: `property_id (text)`, `image_url`, `image_order`, `created_at`
- RLS: HABILITADO (FORCE RLS recomendado)
  - SELECT: todos autenticados
  - INSERT/UPDATE/DELETE: `gestor`/`admin`
- Storage: bucket `property-images` com policies alinhadas (leitura pública opcional; reavaliar em produção)

### imoveisvivareal — Import de Portais
- PK: `id (serial)`
- Campos: `listing_id`, `imagens[]`, `tipo_categoria`, `tipo_imovel`, `descricao`, `preco`, `cidade`, ... `user_id`, `company_id (legado)`, timestamps
- RLS: HABILITADO
  - SELECT: todos autenticados
  - INSERT: todos autenticados (corretor pode adicionar)
  - UPDATE/DELETE: apenas `gestor`/`admin`
  - Exceção para corretor: pode atualizar apenas `disponibilidade` + `disponibilidade_observacao`
- Índices: `created_at DESC`

### leads — Leads
- PK: `id (uuid)`
- Campos: dados do lead, `property_id`, `user_id`, `id_corretor_responsavel (uuid, FK user_profiles.id)`, `created_at`, `updated_at`, `company_id (legado)`
- RLS: HABILITADO + FORCE RLS
  - SELECT: `admin/gestor` veem todos; `corretor` apenas os próprios (`user_id = auth.uid()`) e/ou visão "Meus Leads" por `id_corretor_responsavel = auth.uid()`
  - INSERT: `admin/gestor` livres; `corretor` somente se `user_id = auth.uid()`
  - UPDATE: `admin/gestor` livres; `corretor` apenas nos próprios
  - DELETE: apenas `admin/gestor`
- Índices: `user_id`, `id_corretor_responsavel`, `created_at DESC`
- Nota: coluna legada `assigned_user_id` descontinuada após backfill; usar apenas `id_corretor_responsavel`.

### contract_templates — Templates de Contrato
- PK: `id (text)`
- Campos: `name`, `description`, `file_*`, `template_type`, `user_id`, `created_at`, `updated_at`, `company_id (legado)`
- RLS: HABILITADO + FORCE RLS
  - SELECT/INSERT: todos autenticados
  - UPDATE/DELETE: `admin/gestor` OU autor (`user_id = auth.uid()`)
- Índices: `user_id`, `created_at DESC`
- Storage: bucket `contract-templates` permite upload/update/delete/view para autenticados (alinhado ao frontend)

### contracts — Contratos
- PK: `id (text)`
- Campos: informações contratuais + `property_id`, `template_id`, `user_id`, `created_at`, `updated_at`, `company_id (legado)`
- RLS: a ajustar (próximo passo)
  - Proposta: `admin/gestor` CRUD; `corretor` leitura dos seus/relacionados; delete negado
- Índices recomendados: `user_id`, `created_at DESC`, `property_id`, `template_id`

### whatsapp_instances — Instâncias do WhatsApp
- PK: `id (uuid)`
- Campos: `user_id`, metadados, `created_at`, `updated_at`, `company_id (legado)`
- RLS: HABILITADO + FORCE RLS
  - SELECT/INSERT/UPDATE/DELETE: somente `admin/gestor`

### whatsapp_chats — Conversas
- PK: `id (uuid)`
- Campos: `instance_id`, `user_id`, `contact_*`, `lead_id`, `property_id`, `created_at`, `updated_at`
- RLS: HABILITADO + FORCE RLS
  - SELECT: `admin/gestor` todos; `corretor` apenas os próprios (`user_id = auth.uid()`)
  - INSERT/UPDATE: `admin/gestor` livres; `corretor` somente se `user_id = auth.uid()`
  - DELETE: `admin/gestor`
- Índices: `user_id`, `created_at DESC`

### whatsapp_messages — Mensagens
- ### oncall_schedules — Escalas de plantão por calendário
  - PK: `id (uuid)`
  - Campos: `user_id`, `company_id`, `calendar_id`, `calendar_name`, `mon_*`..`sun_*` (flags `*_works` + `*_start`/`*_end`), `created_at`, `updated_at`
  - Índices: `user_id`, `company_id`, `calendar_id`
  - RLS: dono (`user_id`) ou `gestor/admin` da mesma empresa; `WITH CHECK` garante `company_id` consistente

- PK: `id (uuid)`
- Campos: `chat_id`, `instance_id`, `user_id`, `from_me`, `content`, timestamps
- RLS: HABILITADO + FORCE RLS
  - SELECT: `admin/gestor` todos; `corretor` apenas os próprios (`user_id = auth.uid()`)
  - INSERT: `admin/gestor` livres; `corretor` apenas com `from_me=true` e `user_id = auth.uid()`
  - UPDATE: `admin/gestor` livres; `corretor` apenas nos próprios
  - DELETE: `admin/gestor`
- Índices: `user_id`, `created_at DESC`

---

## Storage — Buckets e Policies
- Buckets: `property-images`, `contract-templates`
- Policies em `storage.objects` (resumo):
  - `property-images`: leitura pública opcional; escrita restrita (alinhado às policies de tabela)
  - `contract-templates`: operações para autenticados; alinhado com `contract_templates`

---

## Observações e Recomendações
- `companies` permanece para compatibilidade, mas não é usada no acesso.
- Remover gradualmente referências de `company_id` de policies antigas.
- Consistência de autoria: considere triggers BEFORE INSERT para preencher `user_id = auth.uid()` quando nulo.
- Manter `verify_access_levels.sql` como gate de merge (CI) e expandir conforme módulos evoluírem.
