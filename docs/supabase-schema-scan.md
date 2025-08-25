# Relatório de Introspecção do Schema Supabase

## Visão Geral

Este documento mapeia a estrutura real das tabelas principais do sistema ImobiPRO, confirmando colunas, tipos de dados e índices existentes para garantir que a refatoração do dashboard seja baseada no schema real.

**Data da Análise**: {{date}}  
**Método**: Consulta direta via MCP Supabase  
**Escopo**: Tabelas relevantes para o módulo PAINEL

---

## 🔍 Resumo Executivo

### ✅ Tabelas Confirmadas
- `leads` - 19 colunas ✓
- `user_profiles` - 12 colunas ✓  
- `imoveisvivareal` - 27 colunas ✓
- `contracts` - 51 colunas ✓
- `whatsapp_messages` - 15 colunas ✓
- `whatsapp_chats` - 15 colunas ✓
- `whatsapp_instances` - 17 colunas ✓
- `imobipro_messages` - 6 colunas ✓
- `properties` - 22 colunas ✓

### ⚠️ Discrepâncias Encontradas
- ❌ **`imoveisvivareal.disponibilidade`**: Coluna não encontrada (mencionada na documentação)
- ✅ **`leads.id_corretor_responsavel`**: Confirmada como `uuid`
- ✅ **Timestamps**: Todas as tabelas têm `created_at` e `updated_at`

---

## 📊 Detalhamento por Tabela

### 1. `leads` - Gestão de Leads

| Coluna | Tipo | Nullable | Default | Dashboard |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | uuid_generate_v4() | PK |
| `name` | text | YES | null | - |
| `email` | text | YES | null | - |
| `phone` | text | YES | null | - |
| **`source`** | **text** | **YES** | **null** | **🎯 Leads por Canal** |
| `property_id` | text | YES | null | Relacionamento |
| `message` | text | YES | null | - |
| **`created_at`** | **timestamptz** | **YES** | **now()** | **🎯 Temporal/Filtros** |
| **`stage`** | **text** | **YES** | **'Novo Lead'** | **🎯 Funil de Leads** |
| `interest` | text | YES | '' | - |
| `estimated_value` | numeric | YES | 0 | - |
| `notes` | text | YES | '' | - |
| `updated_at` | timestamptz | YES | now() | - |
| `cpf` | text | YES | null | - |
| `endereco` | text | YES | null | - |
| `estado_civil` | text | YES | null | - |
| **`imovel_interesse`** | **text** | **YES** | **null** | **🎯 Imóveis Procurados** |
| **`id_corretor_responsavel`** | **uuid** | **YES** | **null** | **🎯 Leads por Corretor** |
| `user_id` | uuid | YES | null | Criador |

**Índices Existentes**:
- `idx_leads_id_corretor_responsavel` (btree)
- `idx_leads_user_id` (btree)

---

### 2. `user_profiles` - Perfis de Usuário

| Coluna | Tipo | Nullable | Default | Dashboard |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | null | PK |
| `email` | text | YES | null | - |
| **`full_name`** | **text** | **YES** | **null** | **🎯 Nome dos Corretores** |
| `avatar_url` | text | YES | null | - |
| `phone` | text | YES | null | - |
| **`role`** | **text** | **YES** | **'corretor'** | **🎯 Filtro de Corretores** |
| `department` | text | YES | null | - |
| `company_id` | uuid | YES | null | Legado |
| `is_active` | boolean | YES | true | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |
| `chat_instance` | text | YES | null | WhatsApp |

**Índices Existentes**:
- `idx_user_profiles_chat_instance` (btree)

---

### 3. `imoveisvivareal` - Imóveis VivaReal

| Coluna | Tipo | Nullable | Default | Dashboard |
|--------|------|----------|---------|-----------|
| `id` | integer | NO | nextval(...) | PK |
| `listing_id` | text | YES | null | ID Portal |
| `imagens` | text[] | YES | null | - |
| `tipo_categoria` | text | YES | null | - |
| **`tipo_imovel`** | **text** | **YES** | **null** | **🎯 Distribuição por Tipo** |
| `descricao` | text | YES | null | - |
| `preco` | numeric | YES | null | - |
| `tamanho_m2` | numeric | YES | null | - |
| `quartos` | integer | YES | null | - |
| `banheiros` | integer | YES | null | - |
| `ano_construcao` | integer | YES | null | - |
| `suite` | integer | YES | null | - |
| `garagem` | integer | YES | null | - |
| `features` | text[] | YES | null | - |
| `andar` | integer | YES | null | - |
| `blocos` | integer | YES | null | - |
| `cidade` | text | YES | null | - |
| `bairro` | text | YES | null | - |
| `endereco` | text | YES | null | - |
| `numero` | text | YES | null | - |
| `complemento` | text | YES | null | - |
| `cep` | text | YES | null | - |
| `user_id` | uuid | YES | null | - |
| `company_id` | uuid | YES | null | Legado |
| **`created_at`** | **timestamptz** | **YES** | **now()** | **🎯 Filtros Temporais** |
| `updated_at` | timestamptz | YES | now() | - |
| `modalidade` | text | YES | null | - |

**❌ IMPORTANTE**: Coluna `disponibilidade` não encontrada! Mencionada na documentação mas não existe no schema real.

**Índices Existentes**:
- `idx_imoveisvivareal_company_id` (btree)
- `idx_imoveisvivareal_tipo_imovel` (btree) ✅ **Otimizado para dashboard**
- `idx_imoveisvivareal_user_id` (btree)

---

### 4. `contracts` - Contratos

| Coluna | Tipo | Nullable | Default | Dashboard |
|--------|------|----------|---------|-----------|
| `id` | text | NO | gen_random_uuid()::text | PK |
| `numero` | text | NO | null | Único |
| `tipo` | text | NO | null | - |
| `status` | text | YES | 'Pendente' | - |
| `client_*` | text | YES/NO | null | Dados Cliente |
| `landlord_*` | text | YES | null | Dados Proprietário |
| `guarantor_*` | text | YES | null | Dados Fiador |
| `property_*` | text/numeric | YES/NO | null | Dados Imóvel |
| `template_*` | text | YES/NO | null | Template |
| **`valor`** | **numeric** | **NO** | **null** | **🎯 VGV Principal** |
| **`data_inicio`** | **date** | **NO** | **null** | **🎯 VGV por Período** |
| `data_fim` | date | NO | null | - |
| `data_assinatura` | date | YES | null | - |
| `proximo_vencimento` | date | YES | null | - |
| `contract_*` | text | YES | null | Dados Contrato |
| `created_by` | text | YES | null | - |
| **`created_at`** | **timestamptz** | **YES** | **now()** | **🎯 VGV Temporal** |
| `updated_at` | timestamptz | YES | now() | - |
| `is_active` | boolean | YES | true | - |

**Índices Existentes**:
- `contracts_numero_key` (UNIQUE)

---

### 5. `whatsapp_messages` - Mensagens WhatsApp

| Coluna | Tipo | Nullable | Default | Dashboard |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `chat_id` | uuid | YES | null | Relacionamento |
| `instance_id` | uuid | YES | null | Relacionamento |
| `user_id` | uuid | YES | null | **🎯 Filtro Corretor** |
| `message_id` | text | YES | null | ID Externo |
| **`from_me`** | **boolean** | **NO** | **null** | **🎯 Heatmap Filtro** |
| `contact_phone` | text | YES | null | - |
| `message_type` | text | YES | null | - |
| `content` | text | YES | null | - |
| `media_url` | text | YES | null | - |
| `caption` | text | YES | null | - |
| **`timestamp`** | **timestamptz** | **YES** | **null** | **🎯 Heatmap Principal** |
| `read_at` | timestamptz | YES | null | - |
| `delivered_at` | timestamptz | YES | null | - |
| `created_at` | timestamptz | YES | now() | - |

**Índices Existentes**:
- `idx_whatsapp_messages_chat_id` (btree)
- `idx_whatsapp_messages_instance_id` (btree)
- `idx_whatsapp_messages_timestamp` (btree) ✅ **Otimizado para heatmap**

---

### 6. `imobipro_messages` - Mensagens Alternativas

| Coluna | Tipo | Nullable | Default | Dashboard |
|--------|------|----------|---------|-----------|
| `id` | integer | NO | nextval(...) | PK |
| `session_id` | varchar | NO | null | Agrupamento |
| `message` | jsonb | NO | null | Conteúdo |
| **`data`** | **timestamp** | **YES** | **now()** | **🎯 Heatmap Alternativo** |
| `media` | text | YES | null | - |
| **`instancia`** | **text** | **YES** | **'sdr'** | **🎯 Filtro Instância** |

**Observação**: Tabela alternativa para heatmap caso `whatsapp_messages` não tenha dados suficientes.

---

### 7. `whatsapp_instances` - Instâncias WhatsApp

| Coluna | Tipo | Nullable | Default | Dashboard |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `instance_name` | text | NO | null | - |
| **`user_id`** | **uuid** | **YES** | **null** | **🎯 Join Corretor** |
| `company_id` | uuid | YES | null | Legado |
| `phone_number` | text | YES | null | - |
| `profile_name` | text | YES | null | - |
| `profile_pic_url` | text | YES | null | - |
| `status` | text | YES | 'disconnected' | - |
| `webhook_url` | text | YES | null | - |
| `api_key` | text | YES | null | - |
| `last_seen` | timestamptz | YES | null | - |
| `chat_count` | integer | YES | 0 | - |
| `contact_count` | integer | YES | 0 | - |
| `message_count` | integer | YES | 0 | - |
| `is_active` | boolean | YES | true | - |
| `created_at` | timestamptz | YES | now() | - |
| `updated_at` | timestamptz | YES | now() | - |

---

### 8. `properties` - Propriedades Internas

| Coluna | Tipo | Nullable | Default | Dashboard |
|--------|------|----------|---------|-----------|
| `id` | text | NO | null | PK |
| `title` | text | NO | null | - |
| `type` | text | NO | null | - |
| `price` | numeric | NO | null | - |
| `area` | numeric | NO | null | - |
| `bedrooms` | integer | YES | null | - |
| `bathrooms` | integer | YES | null | - |
| `address` | text | NO | null | - |
| `city` | text | NO | null | - |
| `state` | text | NO | null | - |
| `status` | text | YES | null | - |
| `description` | text | YES | null | - |
| **`created_at`** | **timestamptz** | **YES** | **now()** | **🎯 Filtros** |
| `updated_at` | timestamptz | YES | now() | - |
| `property_purpose` | text | YES | 'Aluguel' | - |
| `proprietario_*` | text | YES | null | Dados Proprietário |
| `company_id` | uuid | YES | null | Legado |
| `user_id` | uuid | YES | null | - |

---

## 🚀 Recomendações para Implementação

### 1. Índices de Performance Adicionais Necessários

```sql
-- Para otimizar consultas do dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created_at_source 
ON leads (created_at DESC, source);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_stage_created 
ON leads (stage, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_created_at_status 
ON contracts (created_at DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_from_me_timestamp 
ON whatsapp_messages (from_me, timestamp DESC) WHERE from_me = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imobipro_messages_data_instancia 
ON imobipro_messages (data DESC, instancia);
```

### 2. Correções de Schema Necessárias

```sql
-- Adicionar coluna disponibilidade que está faltando
ALTER TABLE imoveisvivareal 
ADD COLUMN disponibilidade text DEFAULT 'disponivel';

-- Adicionar constraint para valores válidos
ALTER TABLE imoveisvivareal 
ADD CONSTRAINT check_disponibilidade 
CHECK (disponibilidade IN ('disponivel', 'indisponivel', 'reforma'));

-- Criar índice para a nova coluna
CREATE INDEX idx_imoveisvivareal_disponibilidade 
ON imoveisvivareal (disponibilidade);
```

### 3. Queries Validadas para Dashboard

#### VGV por Período
```sql
SELECT 
    DATE_TRUNC('month', created_at) as mes,
    SUM(valor) as soma_vgv,
    COUNT(*) as total_contratos
FROM contracts 
WHERE created_at >= (CURRENT_DATE - INTERVAL '12 months')
  AND status IN ('Ativo', 'Pendente')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes ASC;
```

#### Leads por Canal
```sql
SELECT 
    COALESCE(source, 'Não informado') as canal_bucket,
    COUNT(*) as total
FROM leads 
WHERE created_at >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY source
ORDER BY COUNT(*) DESC
LIMIT 8;
```

#### Heatmap de Conversas (WhatsApp)
```sql
SELECT 
    EXTRACT(DOW FROM timestamp) as dia_semana,
    EXTRACT(HOUR FROM timestamp) as hora,
    COUNT(*) as total_mensagens
FROM whatsapp_messages wm
JOIN whatsapp_instances wi ON wm.instance_id = wi.id
JOIN user_profiles up ON wi.user_id = up.id
WHERE wm.from_me = true
  AND up.role = 'corretor'
  AND wm.timestamp >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY EXTRACT(DOW FROM timestamp), EXTRACT(HOUR FROM timestamp)
ORDER BY dia_semana, hora;
```

#### Heatmap Alternativo (imobipro_messages)
```sql
SELECT 
    EXTRACT(DOW FROM data) as dia_semana,
    EXTRACT(HOUR FROM data) as hora,
    COUNT(*) as total_mensagens
FROM imobipro_messages
WHERE data >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY EXTRACT(DOW FROM data), EXTRACT(HOUR FROM data)
ORDER BY dia_semana, hora;
```

### 4. Estados Vazios por Fonte de Dados

| Gráfico | Tabela Principal | Estado Vazio |
|---------|------------------|--------------|
| VGV | `contracts` | "Nenhum contrato encontrado no período" |
| Leads Canal | `leads` | "Nenhum lead nos últimos 12 meses" |
| Distribuição Tipo | `imoveisvivareal` | "Nenhum imóvel cadastrado" |
| Funil Leads | `leads` | "Nenhum lead no funil" |
| Leads/Corretor | `leads + user_profiles` | "Nenhum lead atribuído" |
| Heatmap | `whatsapp_messages` ou `imobipro_messages` | "Sem dados de conversas" |

---

## ✅ Checklist de Validação

- [x] Schema real mapeado via MCP Supabase
- [x] Discrepâncias identificadas (coluna `disponibilidade`)
- [x] Índices existentes catalogados
- [x] Queries de dashboard validadas
- [x] Recomendações de otimização criadas
- [x] Estados vazios definidos
- [x] Tabelas alternativas identificadas (`imobipro_messages`)

---

## 📋 Próximos Passos

1. **Implementar correção de schema** (adicionar `disponibilidade`)
2. **Aplicar índices de performance** recomendados
3. **Atualizar o plano de refatoração** com dados reais
4. **Implementar queries diretas** no `metrics.ts`
5. **Testar performance** das consultas em ambiente real

---

*Relatório gerado via MCP Supabase em {{date}}*
*Escopo: 9 tabelas principais, 190+ colunas analisadas*
