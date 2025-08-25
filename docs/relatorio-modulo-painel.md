# RELATÓRIO COMPLETO - MÓDULO PAINEL (DASHBOARD)

## 📋 RESUMO EXECUTIVO

O módulo PAINEL é o componente central do sistema ImobiPRO, apresentando uma visão consolidada do funil de vendas e portfólio imobiliário através de KPIs, gráficos interativos e widgets em tempo real. O módulo integra dados de múltiplas tabelas do banco de dados e oferece funcionalidades avançadas de análise e visualização.

---

## 🏗️ ARQUITETURA E ESTRUTURA DE ARQUIVOS

### Componentes Principais

#### 1. **DashboardContent.tsx** - Componente Principal
- **Localização**: `src/components/DashboardContent.tsx`
- **Responsabilidade**: Container principal que orquestra todos os elementos do painel
- **Estrutura**:
  - KPIs (Key Performance Indicators)
  - Seção de gráficos (`DashboardCharts`)
  - Propriedades recentes
  - Próximos compromissos
  - Atividades recentes

#### 2. **DashboardCharts.tsx** - Conjunto de Gráficos
- **Localização**: `src/components/DashboardCharts.tsx`
- **Responsabilidade**: Renderização de todos os gráficos interativos
- **Tecnologia**: MUI X-Charts (Material-UI Charts)
- **Gráficos incluídos**:
  - VGV e Imóveis (com filtros de período)
  - Taxa de Disponibilidade / Imóveis mais Procurados
  - Entrada de Leads (Por Canal + Por Tempo)
  - Distribuição por Tipo
  - Funis e Corretores
  - Heatmap de Conversas

#### 3. **UpcomingAppointments.tsx** - Widget de Compromissos
- **Localização**: `src/components/UpcomingAppointments.tsx`
- **Responsabilidade**: Exibir próximos compromissos da agenda
- **Fonte de dados**: Integração com n8n via `services/agenda/events.ts`

#### 4. **RecentActivitiesCard.tsx** - Atividades Recentes
- **Localização**: `src/components/RecentActivitiesCard.tsx`
- **Responsabilidade**: Exibir audit trail das atividades do sistema
- **Fonte de dados**: Tabela `audit_logs`

### Serviços e Utilitários

#### 1. **metrics.ts** - Serviço de Métricas
- **Localização**: `src/services/metrics.ts`
- **Responsabilidade**: Funções para buscar dados dos gráficos
- **Funções principais**:
  - `fetchVgvByPeriod()` - Dados de VGV por período
  - `fetchLeadsPorCanalTop8()` - Leads por canal de origem
  - `fetchDistribuicaoPorTipo()` - Distribuição por tipo de imóvel
  - `fetchFunilLeads()` - Funil de estágios dos leads
  - `fetchLeadsPorCorretor()` - Leads por corretor
  - `fetchHeatmapConversas()` - Heatmap de conversas WhatsApp
  - `fetchTaxaOcupacao()` - Taxa de ocupação dos imóveis

#### 2. **formatters.ts** - Formatadores
- **Localização**: `src/lib/charts/formatters.ts`
- **Responsabilidade**: Formatação de valores monetários, datas e percentuais
- **Funções**:
  - `formatCurrencyCompact()` - Formatação compacta de moeda (R$ 1.2M)
  - `monthLabel()` - Labels de meses em português
  - `formatPercent()` - Formatação de percentuais

#### 3. **palette.ts** - Paleta de Cores
- **Localização**: `src/lib/charts/palette.ts`
- **Responsabilidade**: Definição de cores para gráficos
- **Paletas**:
  - `chartPalette` - Cores principais do tema dark
  - `pieChartColors` - 10 cores diferenciadas para gráficos de pizza
  - `availabilityColors` - Cores para status de disponibilidade

---

## 📊 ANÁLISE DETALHADA DOS GRÁFICOS

### 1. **GRÁFICO VGV E IMÓVEIS**

#### **Tabelas Relacionadas**:
- `vw_segura_metricas_vgv_mensal` - View com dados de VGV mensal
- `vw_segura_metricas_vgv_atual` - View com VGV atual
- `contracts` - Tabela base de contratos

#### **Cálculos**:
```sql
-- VGV (Valor Geral de Vendas)
-- Soma dos valores dos contratos do tipo 'Venda' por período
SELECT 
  DATE_TRUNC('month', created_at) as mes,
  SUM(valor_total) as soma_vgv,
  COUNT(*) as total_contratos
FROM contracts 
WHERE tipo = 'Venda' 
GROUP BY DATE_TRUNC('month', created_at)
```

#### **Funcionalidades**:
- **Filtros de período**: Todo, Anual, Mensal, Semanal, Diário
- **Tipos de gráfico**: Combo (área + barra), Área, Linha, Barra
- **Dual axis**: VGV (eixo Y principal) + Quantidade de imóveis (eixo Y secundário)
- **Gradientes SVG**: Efeitos visuais profissionais

#### **Lógica de Processamento**:
```typescript
// Processamento de períodos
const byPeriod = new Map<string, { vgv: number; qtd: number }>();

// Inicializar períodos com dados zerados
for (let i = 0; i < periods; i++) {
  const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
  byPeriod.set(dateFormat(d), { vgv: 0, qtd: 0 });
}

// Processar dados reais
data.forEach((r: any) => {
  const d = new Date(r.mes);
  const k = dateFormat(d);
  const cur = byPeriod.get(k);
  if (cur) {
    cur.vgv += Number(r.soma_vgv || 0);
    cur.qtd += Number(r.total_contratos || 0);
  }
});
```

### 2. **GRÁFICO TAXA DE DISPONIBILIDADE**

#### **Tabelas Relacionadas**:
- `vw_segura_metricas_ocupacao_disponibilidade` - View com dados de ocupação
- `imoveisvivareal` - Tabela base de imóveis

#### **Cálculos**:
```sql
-- Taxa de ocupação
-- (Total - Disponíveis) / Total * 100
SELECT 
  disponibilidade,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM imoveisvivareal 
GROUP BY disponibilidade
```

#### **Funcionalidades**:
- **Gráfico de pizza** com cores diferenciadas
- **Legenda com números**: "Disponível (45)"
- **Configuração**: `innerRadius: 60`, `outerRadius: 100`
- **Alternância**: Taxa de disponibilidade ↔ Imóveis mais procurados

#### **Lógica de Cálculo**:
```typescript
const ocupacao = totalCount > 0 
  ? ((Number(totalCount) - Number(disponiveisCount)) / Number(totalCount)) * 100 
  : 0;
```

### 3. **GRÁFICO ENTRADA DE LEADS**

#### **Subgráfico A: Por Canal**

#### **Tabelas Relacionadas**:
- `vw_chart_leads_por_canal` - View com leads por canal
- `leads` - Tabela base de leads

#### **Cálculos**:
```sql
-- Leads por canal de origem
SELECT 
  CASE 
    WHEN source = 'facebook' THEN 'Facebook'
    WHEN source = 'google' THEN 'Google'
    WHEN source = 'whatsapp' THEN 'WhatsApp'
    ELSE source 
  END as canal_bucket,
  COUNT(*) as total
FROM leads 
GROUP BY canal_bucket
ORDER BY total DESC
```

#### **Funcionalidades**:
- **Barras horizontais** com cores diferenciadas
- **Labels completos** no eixo Y (sem abreviação)
- **Margem esquerda**: 120px para acomodar labels longos

#### **Subgráfico B: Por Tempo**

#### **Tabelas Relacionadas**:
- `vw_chart_leads_temporal` - View com leads por período
- `leads` - Tabela base

#### **Cálculos**:
```sql
-- Leads por período temporal
SELECT 
  DATE_TRUNC('month', created_at) as mes_key,
  COUNT(*) as total_leads
FROM leads 
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes_key
```

#### **Funcionalidades**:
- **Gráfico de área com linha** mostrando tendência temporal
- **Filtros de tempo**: Total, Ano, Mês, Semanas, Dias
- **Fallback**: 6 meses com dados zerados quando não há dados

### 4. **GRÁFICO DISTRIBUIÇÃO POR TIPO**

#### **Tabelas Relacionadas**:
- `vw_chart_distribuicao_tipo_imovel` - View com distribuição por tipo
- `imoveisvivareal` - Tabela base

#### **Cálculos**:
```sql
-- Distribuição por tipo de imóvel
SELECT 
  tipo_imovel,
  COUNT(*) as total
FROM imoveisvivareal 
GROUP BY tipo_imovel
ORDER BY total DESC
```

#### **Normalização de Tipos**:
```typescript
function normalizePropertyType(labelRaw: string): string {
  const l = (labelRaw || '').toLowerCase();
  if (l.includes('apart') || l.includes('condo')) return 'Apartamento/Condomínio';
  if (l.includes('cobertura')) return 'Cobertura';
  if (l.includes('home') || l.includes('casa')) return 'Casa';
  if (l.includes('landlot') || l.includes('terreno')) return 'Terreno/Lote';
  // ... mais mapeamentos
  return 'Outros';
}
```

#### **Funcionalidades**:
- **Gráfico de pizza** com 10 cores contrastantes
- **Legenda com números**: "Apartamento (48)"
- **Espaçamento entre fatias**: `paddingAngle: 3`

### 5. **GRÁFICO FUNIS E CORRETORES**

#### **Subgráfico A: Funil de Estágios**

#### **Tabelas Relacionadas**:
- `vw_chart_funil_leads` - View com funil de leads
- `leads` - Tabela base

#### **Cálculos**:
```sql
-- Funil de estágios dos leads
SELECT 
  stage as estagio,
  COUNT(*) as total
FROM leads 
GROUP BY stage
ORDER BY 
  CASE stage
    WHEN 'Novo Lead' THEN 1
    WHEN 'Visita Agendada' THEN 2
    WHEN 'Em Negociação' THEN 3
    WHEN 'Fechamento' THEN 4
    ELSE 5
  END
```

#### **Funcionalidades**:
- **Curva vertical** com área (LinePlot + AreaPlot)
- **Curva suave**: `curve: 'catmullRom'`
- **Gradiente na área** para efeito visual
- **Altura**: 160px para o gráfico

#### **Subgráfico B: Corretores por Leads**

#### **Tabelas Relacionadas**:
- `vw_chart_leads_por_corretor` - View com leads por corretor
- `vw_chart_leads_corretor_estagio` - View com breakdown por estágio
- `leads` - Tabela base

#### **Cálculos**:
```sql
-- Leads por corretor
SELECT 
  up.full_name as corretor_nome,
  COUNT(l.id) as total_leads
FROM leads l
LEFT JOIN user_profiles up ON l.id_corretor_responsavel = up.id
GROUP BY up.full_name
ORDER BY total_leads DESC
```

#### **Lógica de Agrupamento**:
```typescript
// Modo agrupado: agrupar corretores com mesma quantidade de leads
const groupedData = new Map<number, string[]>();

brokers.forEach(broker => {
  const leadsCount = broker.value;
  if (!groupedData.has(leadsCount)) {
    groupedData.set(leadsCount, []);
  }
  groupedData.get(leadsCount)!.push(broker.name);
});

// Modo comparativo: mostrar corretores selecionados individualmente
return brokers
  .filter(broker => selectedBrokers.has(broker.name))
  .map(broker => ({
    name: broker.name.length > 12 ? broker.name.substring(0, 12) + '...' : broker.name,
    value: broker.value
  }));
```

#### **Funcionalidades**:
- **Dois modos**: Agrupado (padrão) vs Comparativo (seleção)
- **Painel lateral** para seleção de corretores
- **Leads não atribuídos** em vermelho
- **Tooltips isolados** para cada barra

### 6. **HEATMAP DE CONVERSAS**

#### **Tabelas Relacionadas**:
- `vw_metricas_heatmap_conversas_corretores` - View com conversas por hora/dia
- `whatsapp_messages` - Tabela base de mensagens
- `whatsapp_instances` - Instâncias WhatsApp
- `user_profiles` - Perfis dos corretores

#### **Cálculos**:
```sql
-- Conversas por hora e dia da semana
SELECT 
  EXTRACT(DOW FROM timestamp) as dia_semana,
  EXTRACT(HOUR FROM timestamp) as hora,
  COUNT(*) as total_mensagens
FROM whatsapp_messages wm
JOIN whatsapp_instances wi ON wm.instance_id = wi.id
JOIN user_profiles up ON wi.user_id = up.id
WHERE wm.from_me = true 
  AND up.role = 'corretor'
GROUP BY 
  EXTRACT(DOW FROM timestamp),
  EXTRACT(HOUR FROM timestamp)
```

#### **Funcionalidades**:
- **Matriz 7x24**: 7 dias × 24 horas
- **Filtro por corretor**: Dropdown para filtrar por corretor específico
- **Esquema de cores**: Cinza (vazio) → Azul → Verde → Laranja → Vermelho
- **Tooltips informativos**: "Segunda às 14h: 5 conversa(s)"
- **Interatividade**: Hover com scale e shadow effects

#### **Lógica de Cores**:
```typescript
let bgColor;
if (value === 0) {
  bgColor = 'rgba(55, 65, 81, 0.3)'; // gray-700 para vazio
} else {
  if (intensity <= 0.2) {
    bgColor = `rgba(59, 130, 246, ${Math.max(0.4, intensity * 2)})`; // Azul
  } else if (intensity <= 0.4) {
    bgColor = `rgba(6, 182, 212, ${Math.max(0.5, intensity * 1.5)})`; // Ciano
  } else if (intensity <= 0.6) {
    bgColor = `rgba(34, 197, 94, ${Math.max(0.6, intensity * 1.2)})`; // Verde
  } else if (intensity <= 0.8) {
    bgColor = `rgba(251, 146, 60, ${Math.max(0.7, intensity)})`; // Laranja
  } else {
    bgColor = `rgba(239, 68, 68, ${Math.max(0.8, intensity)})`; // Vermelho
  }
}
```

---

## 📈 KPIs (KEY PERFORMANCE INDICATORS)

### **Estrutura dos KPIs**

#### **Localização**: `DashboardContent.tsx` - Linhas 25-35

#### **KPIs Implementados**:

1. **VGV (Valor Geral de Vendas)**
   - **Fonte**: `vw_segura_metricas_vgv_atual`
   - **Cálculo**: Soma dos valores dos contratos do tipo 'Venda'
   - **Formatação**: `formatCurrencyCompact()` (R$ 1.2M)

2. **Total de Imóveis**
   - **Fonte**: `imoveisvivareal`
   - **Cálculo**: `COUNT(*)` de todos os imóveis
   - **Formatação**: Número inteiro

3. **Disponíveis**
   - **Fonte**: `imoveisvivareal`
   - **Cálculo**: `COUNT(*) WHERE disponibilidade = 'disponivel'`
   - **Formatação**: Número inteiro

4. **Total de Leads**
   - **Fonte**: `leads`
   - **Cálculo**: `COUNT(*)` de todos os leads
   - **Formatação**: Número inteiro

#### **Cálculo de Variação Percentual**:

```typescript
const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) {
    if (current > 0) return { change: "+100%", type: "positive" };
    return { change: "0%", type: "neutral" };
  }
  
  const percentChange = ((current - previous) / previous) * 100;
  const formattedChange = Math.abs(percentChange).toFixed(1);
  
  if (percentChange > 0) {
    return { change: `+${formattedChange}%`, type: "positive" };
  } else if (percentChange < 0) {
    return { change: `-${formattedChange}%`, type: "negative" };
  }
  return { change: "0%", type: "neutral" };
};
```

#### **Comparação Temporal**:
- **Período atual**: Mês corrente
- **Período anterior**: Mês anterior
- **Baseline**: Dados até o final do mês anterior

---

## 🔄 REALTIME E ATUALIZAÇÕES

### **Implementação Realtime**

#### **DashboardContent.tsx**:
```typescript
const channel = supabase
  .channel(`dashboard_kpis_${Date.now()}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'imoveisvivareal' }, () => { 
    fetchImoveis(); 
    fetchKpis(); 
    fetchTypeDistribution(); 
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => { 
    fetchKpis(); 
    fetchLeadStages(); 
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => { 
    fetchKpis(); 
  })
  .subscribe();
```

#### **DashboardCharts.tsx**:
```typescript
const channel = supabase
  .channel(`dashboard_charts_${Date.now()}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, refetchAll)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, refetchAll)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'imoveisvivareal' }, refetchAll)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, refetchAll)
  .subscribe();
```

### **Frequência de Atualização**:
- **Realtime**: Imediato via Supabase Realtime
- **UpcomingAppointments**: A cada 5 minutos
- **Fallback**: Dados mock quando APIs externas falham

---

## 🎨 LAYOUT E DESIGN

### **Estrutura de Grid**

#### **Layout Responsivo**:
```typescript
// Grid principal
<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

// VGV e Imóveis (8 colunas)
<Card className="xl:col-span-8">

// Taxa de Disponibilidade (4 colunas)
<Card className="xl:col-span-4">

// Entrada de Leads (8 colunas)
<Card className="xl:col-span-8">

// Distribuição por Tipo (4 colunas)
<Card className="xl:col-span-4">

// Funis e Corretores (6 colunas)
<Card className="xl:col-span-6">

// Heatmap (6 colunas)
<Card className="xl:col-span-6">
```

### **Tema Visual**

#### **Cores Principais**:
- **Background**: `bg-gray-950` (slate-950)
- **Cards**: `bg-gray-800/50` com `border-gray-700/50`
- **Backdrop**: `backdrop-blur-sm` para efeito de vidro
- **Texto**: `text-white` para títulos, `text-gray-400` para subtítulos

#### **Paleta de Gráficos**:
```typescript
export const chartPalette = {
  primary: '#60a5fa',      // blue-400
  primaryAlt: '#3b82f6',   // blue-500
  secondary: '#a855f7',    // purple-500
  accent: '#34d399',       // emerald-400
  textPrimary: '#f1f5f9',  // slate-100
  textSecondary: '#94a3b8', // slate-400
};
```

### **Componentes UI**:
- **Cards**: shadcn/ui Card com tema dark customizado
- **Buttons**: shadcn/ui Button com variantes
- **Select**: shadcn/ui Select para filtros
- **ToggleGroup**: shadcn/ui ToggleGroup para controles

---

## 🔗 INTEGRAÇÕES E DEPENDÊNCIAS

### **Integrações Externas**

#### **1. n8n (Agenda)**:
- **Componente**: `UpcomingAppointments.tsx`
- **Serviço**: `services/agenda/events.ts`
- **Função**: `fetchUpcomingFromAgenda()`
- **Fallback**: Dados mock quando n8n indisponível

#### **2. WhatsApp (Heatmap)**:
- **Tabelas**: `whatsapp_messages`, `whatsapp_instances`
- **Relacionamento**: `messages → instances → user_profiles`
- **Filtro**: Apenas mensagens enviadas (`from_me = true`)

### **Dependências Internas**

#### **1. Hooks**:
- `useClients()` - Dados de leads para gráfico de origem
- `useUserProfile()` - Perfil do usuário para permissões
- `usePermissions()` - Verificação de permissões

#### **2. Contextos**:
- `PreviewProvider` - Contexto de preview
- `SidebarProvider` - Contexto da sidebar

#### **3. Utilitários**:
- `supabase/client.ts` - Cliente Supabase
- `lib/audit/logger.ts` - Sistema de logs de auditoria

---

## 📊 VIEWS DO BANCO DE DADOS

### **Views Utilizadas**

#### **1. vw_segura_metricas_vgv_mensal**
```sql
-- VGV mensal com segurança RLS
SELECT 
  DATE_TRUNC('month', c.created_at) as mes,
  SUM(c.valor_total) as soma_vgv,
  COUNT(*) as total_contratos
FROM contracts c
WHERE c.tipo = 'Venda'
  AND c.is_active = true
GROUP BY DATE_TRUNC('month', c.created_at)
ORDER BY mes;
```

#### **2. vw_segura_metricas_vgv_atual**
```sql
-- VGV atual (estoque disponível)
SELECT 
  SUM(c.valor_total) as soma_vgv
FROM contracts c
WHERE c.tipo = 'Venda'
  AND c.is_active = true
  AND c.status = 'Ativo';
```

#### **3. vw_chart_leads_por_canal**
```sql
-- Leads por canal de origem
SELECT 
  COALESCE(
    CASE 
      WHEN l.source = 'facebook' THEN 'Facebook'
      WHEN l.source = 'google' THEN 'Google'
      WHEN l.source = 'whatsapp' THEN 'WhatsApp'
      ELSE l.source 
    END, 'Não informado'
  ) as canal_bucket,
  COUNT(*) as total
FROM leads l
GROUP BY canal_bucket
ORDER BY total DESC;
```

#### **4. vw_chart_distribuicao_tipo_imovel**
```sql
-- Distribuição por tipo de imóvel
SELECT 
  COALESCE(tipo_imovel, 'Não informado') as tipo_imovel,
  COUNT(*) as total
FROM imoveisvivareal
GROUP BY tipo_imovel
ORDER BY total DESC;
```

#### **5. vw_chart_funil_leads**
```sql
-- Funil de estágios dos leads
SELECT 
  COALESCE(stage, 'Não informado') as estagio,
  COUNT(*) as total
FROM leads
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

#### **6. vw_chart_leads_por_corretor**
```sql
-- Leads por corretor
SELECT 
  COALESCE(up.full_name, up.email, 'Sem corretor') as corretor_nome,
  COUNT(l.id) as total_leads
FROM leads l
LEFT JOIN user_profiles up ON l.id_corretor_responsavel = up.id
GROUP BY up.full_name, up.email
ORDER BY total_leads DESC;
```

#### **7. vw_metricas_heatmap_conversas_corretores**
```sql
-- Heatmap de conversas dos corretores
SELECT 
  wi.user_id,
  EXTRACT(DOW FROM wm.timestamp) as dia_semana,
  EXTRACT(HOUR FROM wm.timestamp) as hora,
  COUNT(*) as total_mensagens
FROM whatsapp_messages wm
JOIN whatsapp_instances wi ON wm.instance_id = wi.id
WHERE wm.from_me = true
GROUP BY wi.user_id, dia_semana, hora;
```

---

## 🔒 SEGURANÇA E PERMISSÕES

### **Row Level Security (RLS)**

#### **Políticas Aplicadas**:
- **user_profiles**: Usuários veem apenas seu próprio perfil
- **leads**: Corretores veem seus leads, gestores veem da empresa
- **contracts**: Corretores veem seus contratos, gestores veem da empresa
- **imoveisvivareal**: Corretores veem seus imóveis, gestores veem da empresa
- **whatsapp_messages**: Corretores veem suas mensagens, gestores veem da empresa

#### **Views Seguras**:
- Prefixo `vw_segura_` indica views com RLS aplicado
- Views base (`vw_chart_*`) usadas apenas em desenvolvimento
- Migração para views seguras em produção

### **Controle de Acesso por Role**

#### **Admin**:
- Acesso total a todos os dados
- Pode ver atividades de todos os usuários
- Pode filtrar por qualquer corretor

#### **Gestor**:
- Acesso aos dados da sua empresa
- Pode ver atividades dos corretores da empresa
- Pode filtrar por corretores da empresa

#### **Corretor**:
- Acesso apenas aos seus próprios dados
- Não pode ver atividades de outros usuários
- Não pode filtrar por outros corretores

---

## 🚀 PERFORMANCE E OTIMIZAÇÃO

### **Estratégias de Performance**

#### **1. Lazy Loading**:
```typescript
// Code splitting por componente
const DashboardContent = createLazyComponent(
  () => import("@/components/DashboardContent").then(m => ({ default: m.DashboardContent })),
  "DashboardContent"
);
```

#### **2. Memoização**:
```typescript
// Memoização de dados processados
const brokersChartData = React.useMemo(() => {
  // Processamento complexo de dados
}, [brokers, selectedBrokers, unassignedLeads]);
```

#### **3. Debouncing**:
- Filtros de período com debounce
- Busca de dados com cache

#### **4. Índices de Performance**:
```sql
-- Índices criados para otimização
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);
CREATE INDEX idx_imoveisvivareal_created_at ON imoveisvivareal(created_at);
CREATE INDEX idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
```

### **Otimizações de Consulta**

#### **1. Views Materializadas**:
- Views complexas podem ser materializadas
- Atualização periódica via triggers

#### **2. Paginação**:
- Atividades recentes com paginação
- Limite de registros por consulta

#### **3. Agregação no Banco**:
- Cálculos complexos feitos no PostgreSQL
- Redução de processamento no frontend

---

## 🐛 TRATAMENTO DE ERROS

### **Estratégias de Fallback**

#### **1. Dados Mock**:
```typescript
// Fallback para compromissos
setEvents([
  {
    id: '1',
    date: new Date(Date.now() + 2 * 60 * 60 * 1000),
    client: "João Silva",
    property: "Apartamento Centro",
    // ... dados mock
  }
]);
```

#### **2. Estados de Loading**:
```typescript
if (loadingImoveis || loadingKpis) {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="text-lg text-gray-400">Carregando dados...</div>
      </div>
    </div>
  );
}
```

#### **3. Tratamento de Erros**:
```typescript
try {
  const data = await fetchVgvByPeriod(vgvPeriod);
  setVgv(data);
} catch (error) {
  console.error('Erro ao carregar VGV:', error);
  setVgv([]); // Dados vazios em caso de erro
}
```

### **Logs de Debug**:
```typescript
// Logs em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('Debug: dados do funil:', funil.map(f => f.name).join(', '));
}
```

---

## 📱 RESPONSIVIDADE

### **Breakpoints Implementados**

#### **Mobile (< 768px)**:
- Grid: `grid-cols-1` (uma coluna)
- KPIs: Stack vertical
- Gráficos: Altura reduzida
- Filtros: Dropdowns empilhados

#### **Tablet (768px - 1280px)**:
- Grid: `md:grid-cols-2 lg:grid-cols-4` (KPIs)
- Gráficos: Layout adaptativo
- Painel lateral: Oculto em telas pequenas

#### **Desktop (> 1280px)**:
- Grid: `xl:grid-cols-12` (12 colunas)
- Layout completo com todas as funcionalidades
- Painel lateral sempre visível

### **Adaptações Específicas**

#### **Gráficos**:
```typescript
// Altura responsiva
height={showBrokerSelection ? 280 : 320}

// Margens adaptativas
margin={{
  left: showBrokerSelection ? 60 : 80,
  right: 30,
  top: 30,
  bottom: 60
}}
```

#### **Textos**:
```typescript
// Truncamento responsivo
<span className="hidden sm:inline">{event.status}</span>

// Labels adaptativos
{broker.name.length > 12 ? broker.name.substring(0, 12) + '...' : broker.name}
```

---

## 🔮 ROADMAP E MELHORIAS FUTURAS

### **Melhorias Planejadas**

#### **1. Performance**:
- Implementar cache Redis para dados frequentes
- Otimizar queries com índices compostos
- Implementar virtualização para listas grandes

#### **2. Funcionalidades**:
- Exportação de relatórios em PDF/Excel
- Gráficos interativos com drill-down
- Filtros avançados por período customizado
- Comparação entre períodos

#### **3. UX/UI**:
- Animações mais suaves
- Modo escuro/claro
- Personalização de dashboard
- Widgets arrastáveis

#### **4. Integrações**:
- Mais fontes de dados (CRM, Google Analytics)
- Webhooks para atualizações em tempo real
- API pública para integrações externas

### **Técnicas**:
- Implementar Service Workers para cache offline
- Otimizar bundle size com tree shaking
- Implementar testes automatizados
- Monitoramento de performance com APM

---

## 📋 CONCLUSÃO

O módulo PAINEL representa uma solução completa e sofisticada para visualização de dados imobiliários, combinando:

- **Arquitetura robusta** com separação clara de responsabilidades
- **Gráficos interativos** com múltiplas opções de visualização
- **Dados em tempo real** via Supabase Realtime
- **Segurança** com RLS e controle de acesso por role
- **Performance otimizada** com memoização e lazy loading
- **Responsividade** para todos os dispositivos
- **Tratamento de erros** robusto com fallbacks

O módulo serve como centro de comando para gestores e corretores, fornecendo insights valiosos sobre o funil de vendas, performance de equipe e status do portfólio imobiliário.
