# Plano de Refatoração - Painel Dashboard

## Visão Geral

Este documento mapeia cada gráfico do módulo PAINEL às tabelas reais do banco de dados, eliminando dependências de views e definindo consultas diretas para melhor performance e controle.

## Análise dos Gráficos Atuais

### 1. VGV e Imóveis (Gráfico Principal)

**Localização**: `DashboardCharts.tsx` - Card principal com gráfico combinado
**Função Atual**: `fetchVgvByPeriod()`
**View Utilizada**: `vw_segura_metricas_vgv_mensal`

#### Mapeamento para Tabelas Reais

**Tabela Principal**: `contracts`
- **Colunas Necessárias**: 
  - `valor` (numeric) - Valor do contrato (VGV)
  - `data_inicio` (date) - Data de início do contrato
  - `created_at` (timestamptz) - Data de criação
  - `status` (text) - Status do contrato ('Ativo', 'Pendente', etc.)

**Consulta SQL Refatorada**:
```sql
-- VGV Mensal dos últimos 12 meses
SELECT 
    DATE_TRUNC('month', created_at) as mes,
    SUM(valor) as soma_vgv,
    COUNT(*) as total_contratos
FROM contracts 
WHERE created_at >= (CURRENT_DATE - INTERVAL '12 months')
  AND status IN ('Ativo', 'Pendente')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes ASC;

-- Para outros períodos (semanal, diário, anual)
-- Substituir 'month' por 'week', 'day' ou 'year'
```

**Estados Vazios**: "Nenhum contrato encontrado no período selecionado."

---

### 2. Leads por Canal

**Localização**: `DashboardCharts.tsx` - Gráfico de barras horizontais
**Função Atual**: `fetchLeadsPorCanalTop8()`
**View Utilizada**: `vw_chart_leads_por_canal`

#### Mapeamento para Tabelas Reais

**Tabela Principal**: `leads`
- **Colunas Necessárias**:
  - `source` (text) - Canal de origem do lead
  - `created_at` (timestamptz) - Data de criação

**Consulta SQL Refatorada**:
```sql
-- Top 8 canais por volume de leads
SELECT 
    COALESCE(source, 'Não informado') as canal_bucket,
    COUNT(*) as total
FROM leads 
WHERE created_at >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY source
ORDER BY COUNT(*) DESC
LIMIT 8;
```

**Mapeamento de Canais**:
```typescript
const channelMapping: Record<string, string> = {
  'sdr_facebook': 'Facebook',
  'sdr_google': 'Google', 
  'sdr_whatsapp': 'WhatsApp',
  'vivareal': 'VivaReal',
  'zapimoveis': 'ZapImóveis'
};
```

**Estados Vazios**: "Nenhum lead encontrado nos últimos 12 meses."

---

### 3. Distribuição por Tipo de Imóvel

**Localização**: `DashboardCharts.tsx` - Gráfico de pizza
**Função Atual**: `fetchDistribuicaoPorTipo()`
**View Utilizada**: `vw_chart_distribuicao_tipo_imovel`

#### Mapeamento para Tabelas Reais

**Tabela Principal**: `imoveisvivareal`
- **Colunas Necessárias**:
  - `tipo_imovel` (text) - Tipo do imóvel
  - `created_at` (timestamptz) - Data de criação

**Consulta SQL Refatorada**:
```sql
-- Distribuição por tipo de imóvel
SELECT 
    COALESCE(tipo_imovel, 'Não informado') as tipo_imovel,
    COUNT(*) as total
FROM imoveisvivareal
WHERE created_at >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY tipo_imovel
ORDER BY COUNT(*) DESC;
```

**Normalização de Tipos** (manter a lógica existente):
```typescript
function normalizePropertyType(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes('apart')) return 'Apartamento';
  if (normalized.includes('casa')) return 'Casa';
  if (normalized.includes('terreno')) return 'Terreno';
  // ... resto da lógica existente
}
```

**Estados Vazios**: "Nenhum imóvel cadastrado."

---

### 4. Funil de Leads

**Localização**: `DashboardCharts.tsx` - Gráfico de linha/área
**Função Atual**: `fetchFunilLeads()`
**View Utilizada**: `vw_chart_funil_leads`

#### Mapeamento para Tabelas Reais

**Tabela Principal**: `leads`
- **Colunas Necessárias**:
  - `stage` (text) - Estágio do lead
  - `created_at` (timestamptz) - Data de criação

**Consulta SQL Refatorada**:
```sql
-- Funil de estágios dos leads
SELECT 
    COALESCE(stage, 'Novo Lead') as estagio,
    COUNT(*) as total
FROM leads
WHERE created_at >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY stage
ORDER BY 
  CASE stage
    WHEN 'Novo Lead' THEN 1
    WHEN 'Visita Agendada' THEN 2
    WHEN 'Em Negociação' THEN 3
    WHEN 'Fechamento' THEN 4
    ELSE 5
  END;
```

**Estados Vazios**: "Nenhum lead no funil de vendas."

---

### 5. Leads por Corretor

**Localização**: `DashboardCharts.tsx` - Gráfico de barras verticais
**Função Atual**: `fetchLeadsPorCorretor()`
**View Utilizada**: `vw_chart_leads_por_corretor`

#### Mapeamento para Tabelas Reais

**Tabelas Principais**: `leads` + `user_profiles`
- **Join**: `leads.id_corretor_responsavel = user_profiles.id`
- **Colunas Necessárias**:
  - `user_profiles.full_name` - Nome do corretor
  - `leads.id_corretor_responsavel` - ID do corretor responsável
  - `leads.created_at` - Data de criação

**Consulta SQL Refatorada**:
```sql
-- Leads por corretor
SELECT 
    COALESCE(up.full_name, 'Sem corretor') as corretor_nome,
    COUNT(l.id) as total_leads
FROM leads l
LEFT JOIN user_profiles up ON l.id_corretor_responsavel = up.id
WHERE l.created_at >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY up.full_name
ORDER BY COUNT(l.id) DESC;

-- Leads sem corretor (separado)
SELECT COUNT(*) as total_sem_corretor
FROM leads 
WHERE id_corretor_responsavel IS NULL
  AND created_at >= (CURRENT_DATE - INTERVAL '12 months');
```

**Estados Vazios**: "Nenhum lead atribuído a corretores."

---

### 6. Leads por Tempo

**Localização**: `DashboardCharts.tsx` - Gráfico temporal com filtros
**Função Atual**: `fetchLeadsPorTempo()`
**View Utilizada**: `vw_chart_leads_temporal`

#### Mapeamento para Tabelas Reais

**Tabela Principal**: `leads`
- **Colunas Necessárias**:
  - `created_at` (timestamptz) - Data de criação

**Consulta SQL Refatorada**:
```sql
-- Leads por mês (últimos 12 meses)
SELECT 
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mes_key,
    COUNT(*) as total_leads
FROM leads
WHERE created_at >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes_key ASC;

-- Para outros períodos, ajustar DATE_TRUNC:
-- Semanal: DATE_TRUNC('week', created_at)
-- Diário: DATE_TRUNC('day', created_at)
-- Anual: DATE_TRUNC('year', created_at)
```

**Estados Vazios**: "Nenhum lead criado no período selecionado."

---

### 7. Heatmap de Conversas por Corretor

**Localização**: `DashboardCharts.tsx` - Grid 7x24 (dias x horas)
**Função Atual**: `fetchHeatmapConversasPorCorretor()`
**View Utilizada**: `vw_metricas_heatmap_conversas_corretores`

#### Mapeamento para Tabelas Reais

**Opção 1: WhatsApp Messages** (se disponível)
```sql
-- Heatmap baseado em whatsapp_messages
SELECT 
    EXTRACT(DOW FROM timestamp) as dia_semana,
    EXTRACT(HOUR FROM timestamp) as hora,
    COUNT(*) as total_mensagens
FROM whatsapp_messages wm
JOIN whatsapp_instances wi ON wm.instance_id = wi.id
JOIN user_profiles up ON wi.user_id = up.id
WHERE wm.from_me = true  -- Apenas mensagens enviadas pelos corretores
  AND up.role = 'corretor'
  AND wm.timestamp >= (CURRENT_DATE - INTERVAL '30 days')
  -- Filtro opcional por corretor:
  -- AND ($1::uuid IS NULL OR up.id = $1)
GROUP BY EXTRACT(DOW FROM timestamp), EXTRACT(HOUR FROM timestamp)
ORDER BY dia_semana, hora;
```

**Opção 2: Tabela Alternativa** (imobipro_messages)
```sql
-- Heatmap baseado em imobipro_messages
SELECT 
    EXTRACT(DOW FROM data) as dia_semana,
    EXTRACT(HOUR FROM data) as hora,
    COUNT(*) as total_mensagens
FROM imobipro_messages im
WHERE data >= (CURRENT_DATE - INTERVAL '30 days')
  -- Filtro por instância/corretor se necessário:
  -- AND ($1::text IS NULL OR instancia = $1)
GROUP BY EXTRACT(DOW FROM data), EXTRACT(HOUR FROM data)
ORDER BY dia_semana, hora;
```

**Conversão de Dias da Semana**:
```typescript
// Postgres: 0=Dom, 1=Seg, ... 6=Sáb
// UI: 0=Seg, 1=Ter, ... 6=Dom
const day = dow === 0 ? 6 : dow - 1;
```

**Estados Vazios**: "Não há dados de conversas dos corretores nos últimos 30 dias."

---

### 8. Corretores com Conversas (Filtro)

**Localização**: `DashboardCharts.tsx` - Dropdown para filtrar heatmap
**Função Atual**: `fetchCorretoresComConversas()`

#### Mapeamento para Tabelas Reais

**Consulta SQL Refatorada**:
```sql
-- Corretores que têm conversas (whatsapp_messages)
SELECT DISTINCT
    up.id,
    COALESCE(up.full_name, up.email, 'Corretor sem nome') as name
FROM user_profiles up
JOIN whatsapp_instances wi ON up.id = wi.user_id  
JOIN whatsapp_messages wm ON wi.id = wm.instance_id
WHERE up.role = 'corretor'
  AND wm.from_me = true
  AND wm.timestamp >= (CURRENT_DATE - INTERVAL '30 days')
ORDER BY up.full_name;

-- Alternativa com imobipro_messages (se aplicável)
SELECT DISTINCT
    instancia as id,
    instancia as name
FROM imobipro_messages
WHERE data >= (CURRENT_DATE - INTERVAL '30 days')
ORDER BY instancia;
```

---

### 9. Taxa de Ocupação/Disponibilidade

**Localização**: `DashboardCharts.tsx` - Gráfico de pizza alternativo
**Função Atual**: `fetchTaxaOcupacao()`
**View Utilizada**: `vw_segura_metricas_ocupacao_disponibilidade`

#### Mapeamento para Tabelas Reais

**Tabela Principal**: `imoveisvivareal`
- **Colunas Necessárias**:
  - `disponibilidade` (text) - Status de disponibilidade

**Consulta SQL Refatorada**:
```sql
-- Taxa de ocupação por disponibilidade
SELECT 
    COALESCE(disponibilidade, 'não informado') as disponibilidade,
    COUNT(*) as total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM imoveisvivareal
GROUP BY disponibilidade
ORDER BY total DESC;
```

**Estados Vazios**: "Nenhum imóvel cadastrado para análise de ocupação."

---

### 10. Imóveis Mais Procurados

**Localização**: `DashboardCharts.tsx` - Gráfico de barras horizontais
**Função Atual**: `fetchImoveisMaisProcurados()`

#### Mapeamento para Tabelas Reais

**Tabela Principal**: `leads`
- **Colunas Necessárias**:
  - `imovel_interesse` (text) - ID do imóvel de interesse

**Consulta SQL Refatorada**:
```sql
-- Top 6 imóveis mais procurados
SELECT 
    imovel_interesse as id,
    'Imóvel ' || imovel_interesse as name,
    COUNT(*) as value
FROM leads
WHERE imovel_interesse IS NOT NULL 
  AND imovel_interesse != ''
  AND created_at >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY imovel_interesse
ORDER BY COUNT(*) DESC
LIMIT 6;
```

**Estados Vazios**: "Nenhum imóvel com interesse de leads registrado."

---

## Estrutura de Implementação

### 1. Arquivo de Serviços Refatorado

**Localização**: `src/services/metrics.ts`

```typescript
// Interface para períodos temporais
export type VgvPeriod = 'todo' | 'anual' | 'mensal' | 'semanal' | 'diario';
export type TimeRange = 'total' | 'year' | 'month' | 'week' | 'day';

// Funções principais refatoradas (sem views)
export async function fetchVgvByPeriodDirect(period: VgvPeriod);
export async function fetchLeadsPorCanalDirect();
export async function fetchDistribuicaoPorTipoDirect();
export async function fetchFunilLeadsDirect();
export async function fetchLeadsPorCorretorDirect();
export async function fetchLeadsPorTempoDirect(timeRange: TimeRange);
export async function fetchHeatmapConversasDirect(brokerId?: string);
export async function fetchCorretoresComConversasDirect();
export async function fetchTaxaOcupacaoDirect();
export async function fetchImoveisMaisProcuradosDirect();
```

### 2. Estados Vazios Padronizados

```typescript
// Mensagens de estado vazio por gráfico
export const EMPTY_STATES = {
  vgv: "Nenhum contrato encontrado no período selecionado.",
  leadsPorCanal: "Nenhum lead encontrado nos últimos 12 meses.",
  distribuicaoTipo: "Nenhum imóvel cadastrado.",
  funilLeads: "Nenhum lead no funil de vendas.",
  leadsPorCorretor: "Nenhum lead atribuído a corretores.",
  leadsPorTempo: "Nenhum lead criado no período selecionado.",
  heatmapConversas: "Não há dados de conversas dos corretores nos últimos 30 dias.",
  taxaOcupacao: "Nenhum imóvel cadastrado para análise de ocupação.",
  imoveisProcurados: "Nenhum imóvel com interesse de leads registrado."
} as const;
```

### 3. Filters e Normalizers

**Localização**: `src/lib/charts/normalizers.ts`

```typescript
// Manter as funções existentes de normalização
export function normalizePropertyType(type: string): string;
export function mapChannelName(channel: string): string;

// Adicionar novas se necessário
export function normalizeLeadStage(stage: string): string;
```

### 4. Indices de Performance Recomendados

```sql
-- Indices para otimizar consultas do dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_created_at_status 
ON contracts (created_at DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created_at_source 
ON leads (created_at DESC, source);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_corretor_created 
ON leads (id_corretor_responsavel, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_stage_created 
ON leads (stage, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imoveisvivareal_tipo_created 
ON imoveisvivareal (tipo_imovel, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_timestamp_user 
ON whatsapp_messages (timestamp DESC, user_id) WHERE from_me = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imobipro_messages_data_instancia 
ON imobipro_messages (data DESC, instancia);
```

## Cronograma de Migração

### Fase 1: Preparação (1-2 dias)
- [ ] Criar funções refatoradas em `metrics.ts`
- [ ] Implementar testes unitários para as novas consultas
- [ ] Validar performance com dados reais

### Fase 2: Implementação (2-3 dias)
- [ ] Substituir uma função por vez no `DashboardCharts.tsx`
- [ ] Testar cada gráfico individualmente
- [ ] Implementar tratamento de estados vazios

### Fase 3: Otimização (1-2 dias)
- [ ] Aplicar índices de performance
- [ ] Monitorar tempo de resposta dos gráficos
- [ ] Ajustar consultas se necessário

### Fase 4: Limpeza (1 dia)
- [ ] Remover funções antigas que usavam views
- [ ] Atualizar documentação
- [ ] Validar todos os gráficos funcionando

## Impacto no Layout

### Sem Alterações Visuais
- Todos os gráficos mantêm a mesma aparência
- Mesmos tipos de gráfico (linha, barra, pizza, heatmap)
- Mesmas opções de filtro e período

### Melhorias de Performance Esperadas
- Redução de 30-50% no tempo de carregamento
- Eliminação de dependências de views complexas
- Maior controle sobre otimizações de consulta

### Benefícios de Manutenção
- Consultas SQL diretas e transparentes
- Facilidade para debug e otimização
- Menor complexidade de dependências
- Melhor controle de RLS e segurança

## Considerações de Segurança

### Row Level Security (RLS)
- Todas as consultas respeitam as policies existentes
- Filtros por `company_id` onde aplicável
- Verificação de roles (`admin`, `gestor`, `corretor`)

### Validação de Dados
- Sanitização de parâmetros de entrada
- Validação de ranges de data
- Tratamento de valores nulos e vazios

---

## 🔄 **UPDATE: COMPONENTES DE ESTADO IMPLEMENTADOS**

### 📄 Arquivos Adicionais Criados

3. **`src/components/chart/ChartEmpty.tsx`** - Estado vazio padronizado:
   - Mensagem personalizada por tipo de gráfico
   - Ícones e sugestões contextuais
   - Variantes pré-configuradas (vgv, leads, properties, etc.)
   - Altura ajustável para diferentes containers

4. **`src/components/chart/ChartError.tsx`** - Estado de erro padronizado:
   - Tratamento de diferentes tipos de erro (network, permission, timeout)
   - Botão "Tentar novamente" com loading state
   - Detalhes técnicos expansíveis
   - Mensagens de erro amigáveis ao usuário

5. **`src/components/chart/ChartSkeleton.tsx`** - Estado de loading padronizado:
   - Skeletons específicos por tipo de gráfico (bar, line, pie, heatmap)
   - Simulação visual de eixos e legendas
   - Animações de loading suaves
   - Preserva layout durante carregamento

6. **`src/components/chart/index.ts`** - Exports centralizados com types

### 🎯 **Integração nos Gráficos**

Todos os gráficos do DashboardCharts.tsx agora utilizam:

- **Loading State**: Skeleton específico por tipo durante fetch
- **Error State**: Captura e exibição de erros com retry
- **Empty State**: Mensagem contextual quando sem dados
- **Helper Function**: `renderChartWithStates()` padroniza comportamento

#### Gráficos Atualizados:
- ✅ **VGV Principal**: ChartEmpty.vgv + ChartSkeleton.combined
- ✅ **Taxa de Disponibilidade**: ChartEmpty.occupancy + ChartSkeleton.pie  
- ✅ **Imóveis Procurados**: ChartEmpty.searchedProperties + ChartSkeleton.bar
- ✅ **Leads por Canal**: ChartEmpty.leads + ChartSkeleton.leadsChannel
- ✅ **Leads por Tempo**: ChartEmpty.temporal + ChartSkeleton.leadsTime
- ✅ **Distribuição Tipos**: ChartEmpty.properties + ChartSkeleton.propertyTypes

### 🔧 **Estados Padrão por Gráfico**

| Gráfico | Estado Vazio | Skeleton | Altura |
|---------|-------------|----------|--------|
| VGV Principal | "Nenhum contrato encontrado..." | Combined | 320px |
| Leads Canal | "Nenhum lead encontrado..." | Bar horizontal | 240px |
| Leads Tempo | "Nenhum dado no período..." | Line/Area | 240px |
| Tipos Imóveis | "Nenhum imóvel cadastrado..." | Pie | 288px |
| Taxa Ocupação | "Nenhum imóvel para análise..." | Pie | 288px |
| Funil Estágios | "Nenhum lead no funil..." | Line | 320px |
| Heatmap | "Sem dados de conversas..." | Grid 7x24 | 768px |

### ⚡ **Sistema de Loading e Erro**

```typescript
// Estado centralizado
const [isLoading, setIsLoading] = React.useState(false);
const [errors, setErrors] = React.useState<Record<string, Error | null>>({});

// Helper function aplicada a todos os gráficos
const renderChartWithStates = (chartKey, data, renderChart, emptyVariant, height) => {
  if (isLoading) return <ChartSkeleton />;
  if (errors[chartKey]) return <ChartError onRetry={handleRetry} />;
  if (!data?.length) return emptyVariant(height);
  return renderChart();
};
```

---

## ✅ **STATUS: IMPLEMENTAÇÃO CONCLUÍDA**

### 📄 Arquivos Criados

1. **`src/services/metrics.ts`** - Serviço principal com 11 funções refatoradas:
   - `getLeadsByChannel()` - Leads por canal com normalização
   - `getLeadsByPeriod()` - Leads temporais (day/week/month/year)
   - `getLeadsFunnel()` - Funil com ordenação de estágios
   - `getLeadsByBroker()` - Performance por corretor + JOIN
   - `getPropertyTypeDist()` - Tipos de imóveis normalizados
   - `getAvailabilityRate()` - Taxa de ocupação (com fallback para coluna ausente)
   - `getConvoHeatmap()` - Heatmap com fallback whatsapp_messages → imobipro_messages
   - `getMostSearchedProperties()` - Top 6 imóveis mais procurados
   - `getAvailableBrokers()` - Lista de corretores ativos
   - Helper functions: `getLastDays()`, `getCurrentMonth()`, etc.

2. **`src/services/metricsExample.ts`** - Exemplos de uso e padrões

### 🔧 **Características Técnicas**

- **✅ Tipos TypeScript** completos (`ChartPoint`, `TimeBucket`, `HeatmapData`, etc.)
- **✅ Error Handling** robusto com fallbacks
- **✅ Normalização** de dados (canais, tipos de imóveis, estágios)
- **✅ Compatibilidade** com schema real (detecta colunas ausentes)
- **✅ Performance** otimizada (índices, filtros eficientes)
- **✅ RLS** respeitado automaticamente via Supabase client

### 🎯 **Pronto para Integração**

O DashboardCharts.tsx pode agora **importar diretamente**:

```typescript
import {
  getLeadsByChannel,
  getLeadsByPeriod,
  getLeadsFunnel,
  getAvailabilityRate,
  getConvoHeatmap,
  getCurrentMonth
} from '@/services/metrics';

// Uso direto no componente:
const data = await getLeadsByChannel(getCurrentMonth());
```

---

*Documento criado em: 2025-01-22*
*Versão: 2.0 - Implementado*
*Responsável: Engenheiro Frontend/Full-stack Sênior*
