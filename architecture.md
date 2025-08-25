# Dark Estate Dashboard - Arquitetura e Evolução

## Visão Geral
Sistema de gestão imobiliária integrado com Supabase, React/Vite, e múltiplas integrações para automação de vendas e gestão de leads.

## Histórico SECURE-VIBE

### 2025-01-28 - Correção do Card VGV e Imóveis (Módulo Painel)

**Problema identificado:** 
- Filtro "TODO" desnecessário no card VGV e Imóveis
- Filtro "ANUAL" com período incorreto (limitado a 5 anos anteriores)

**Solução implementada:**
1. **Remoção do filtro "TODO"** do componente `DashboardCharts.tsx`
2. **Correção do filtro "ANUAL"** para mostrar período expandido:
   - 7 anos antes + ano atual + 2 anos posteriores
   - Total de 10 anos de visualização
   - Exemplo: 2025 atual → exibe 2018 a 2027

**Arquivos modificados:**
- `src/components/DashboardCharts.tsx`: Removido ToggleGroupItem "todo"
- `src/services/dashboardAdapter.ts`: 
  - Atualizado tipo `VgvPeriod` removendo 'todo'
  - Corrigida função `getVgvDateRange` para implementar nova lógica anual
  - Correção de erros de linting (case declarations em blocos)

**Detalhes técnicos:**
- **Período anual anterior**: 5 anos anteriores ao atual
- **Período anual atual**: 7 anos antes + ano atual + 2 anos posteriores
- **Cálculo de datas**: 
  - Data inicial: 1º de janeiro do ano (atual - 7)
  - Data final: 31 de dezembro do ano (atual + 2)
- **Granularidade**: mantida como 'year' para visualização anual

**Rationale:**
- O filtro "TODO" era redundante e confundia a UX
- O período anual expandido permite melhor visualização de tendências históricas e projeções futuras
- A granularidade de 10 anos facilita identificação de deformações no gráfico
- Exemplo prático: Em 2025, mostra dados de 2018 a 2027 (total de 10 anos)

**Impacto:**
- Melhoria na experiência do usuário com filtros mais intuitivos
- Visualização ampliada de dados para análise de tendências
- Código mais limpo e manutenível
- Correção de problemas de linting que impediam builds limpos

---

### 2025-01-28 - Correção dos Dados VGV e Imóveis no Dashboard

**Problema identificado:**
- Gráfico VGV e Imóveis mostrando dados simulados baseados em leads
- Card VGV no cabeçalho exibindo R$0
- Contagem de imóveis não refletindo dados reais da tabela `imoveisvivareal`

**Análise realizada:**
- Tabela `imoveisvivareal` contém 124 imóveis com VGV total de R$ 198.267.137,00
- Sistema estava usando dados simulados em vez dos dados reais
- Função `fetchVgvByPeriod` buscava dados de leads em vez de imóveis

**Solução implementada:**
1. **Correção da função `fetchVgvByPeriod`:**
   - Substituída consulta de leads por consulta real à tabela `imoveisvivareal`
   - Implementado agrupamento correto por período (ano/mês/semana/dia)
   - Adicionada função `fillMissingMonths` para preencher períodos sem dados

2. **Correção do card VGV no cabeçalho:**
   - Substituída simulação baseada em leads por consulta real
   - Implementado cálculo correto: soma da coluna `preco` da tabela `imoveisvivareal`
   - Corrigido cálculo de VGV anterior para comparação

3. **Logs de debug adicionados:**
   - Logs detalhados na função `fetchVgvByPeriod` para monitoramento
   - Logs no componente `DashboardCharts` para verificar fluxo de dados

**Arquivos modificados:**
- `src/services/dashboardAdapter.ts`: Nova lógica de busca de dados reais
- `src/components/DashboardContent.tsx`: Correção do cálculo de VGV no cabeçalho

**Dados verificados:**
- **VGV Total Real**: R$ 198.267.137,00 (124 imóveis)
- **Período dos dados**: Agosto 2025
- **Query de teste**: Confirmada retornando dados corretos

**Próximos passos:**
- Monitorar logs para verificar se o gráfico renderiza corretamente
- Remover logs de debug após confirmação do funcionamento
- Considerar otimizações de performance se necessário

---

### 2025-01-28 - Correção Completa dos Filtros do Gráfico VGV

**Problema identificado:**
- Apenas o filtro "MENSAL" funcionava corretamente
- Filtros "ANUAL", "SEMANAL" e "DIÁRIO" não mostravam linhas no gráfico

**Análise da causa:**
- Função `fillMissingMonths` só funcionava para granularidade 'month'
- Formatação de labels inconsistente entre diferentes períodos
- Cálculo de semanas não padronizado

**Solução implementada:**
1. **Função `fillMissingPeriods` genérica:**
   - Substituiu `fillMissingMonths` para funcionar com todas as granularidades
   - Suporte completo para year/month/week/day
   - Preenchimento automático de períodos vazios

2. **Padronização do cálculo de semanas:**
   - Uso de lógica consistente entre busca e preenchimento
   - Formato: `2025-W8-18` (ano-semana-dia)

3. **Formatação inteligente de labels:**
   - **Anual**: "2025" → "2025"
   - **Mensal**: "2025-08" → "ago/25" 
   - **Semanal**: "2025-W8-18" → "Sem 8/25"
   - **Diário**: "2025-08-24" → "24/08"

4. **Logs detalhados adicionados:**
   - Rastreamento completo do fluxo de dados por filtro
   - Verificação de formatação de labels

**Arquivos modificados:**
- `src/services/dashboardAdapter.ts`: Nova função genérica de preenchimento
- `src/components/DashboardCharts.tsx`: Formatação inteligente de labels

**Testes realizados:**
- **ANUAL**: ✅ 124 imóveis em 2025 com VGV R$ 198.267.137,00
- **MENSAL**: ✅ 124 imóveis em ago/2025 
- **SEMANAL**: ✅ Dados agrupados por semana
- **DIÁRIO**: ✅ 124 imóveis em 24/08/2025

**Resultado:**
- ✅ Todos os 4 filtros agora funcionam corretamente
- ✅ Gráfico exibe dados reais da tabela `imoveisvivareal`
- ✅ Labels formatados adequadamente para cada período
- ✅ Build sem erros

---

### 2025-01-28 - Atualização da Disponibilidade dos Imóveis

**Solicitação:** Definir todos os imóveis como 'disponivel' na coluna `disponibilidade`.

**Estado anterior:**
- 124 imóveis com `disponibilidade = NULL`
- Card "Disponíveis" no dashboard mostrando 0 imóveis

**Ação executada:**
```sql
UPDATE imoveisvivareal 
SET disponibilidade = 'disponivel'
WHERE disponibilidade IS NULL OR disponibilidade != 'disponivel';
```

**Estado atual:**
- ✅ 124 imóveis com `disponibilidade = 'disponivel'`
- ✅ Total de imóveis: 124
- ✅ Imóveis disponíveis: 124
- ✅ Imóveis indisponíveis: 0

**Impacto no dashboard:**
- Card "Total de Imóveis": 124 (inalterado)
- Card "Disponíveis": 124 (antes era 0)
- Taxa de disponibilidade: 100%

---

### 2025-01-28 - Correção do Modal de Disponibilidade + Adição de Coluna

**Complemento:** Adicionada coluna `disponibilidade_observacao` na tabela `imoveisvivareal`:
```sql
ALTER TABLE public.imoveisvivareal 
ADD COLUMN disponibilidade_observacao text;
```

### 2025-01-28 - Correção do Modal de Disponibilidade no Módulo Propriedades

**Problema identificado:** As ações de CRUD no modal "Disponibilidade" dos cards de imóveis não estavam funcionando.

**Causa raiz:** O componente `PropertyList.tsx` não estava destruturando corretamente as funções `createImovel`, `updateImovel`, e `deleteImovel` do hook `useImoveisVivaReal`.

**Correções implementadas:**

1. **Adicionada destruturação das funções CRUD:**
```typescript
const {
  // ... outras propriedades ...
  createImovel,
  updateImovel,
  deleteImovel,
} = useImoveisVivaReal();
```

2. **Refatorado o modal de disponibilidade:**
   - Substituída chamada direta ao Supabase pelo uso da função `updateImovel` do hook
   - Mantida compatibilidade com propriedades legadas (tabela `properties`)
   - Validação de observação obrigatória para status "indisponivel" e "reforma"

3. **Removida declaração duplicada do hook `useImoveisVivaReal`**

4. **Corrigidas referências de `refetchImoveis` para `refetchImoveisList`**

**Funcionalidades do modal agora operacionais:**
- ✅ Seleção de status: "disponivel", "indisponivel", "reforma"
- ✅ Campo de observação obrigatório para status não-disponíveis
- ✅ Atualização em tempo real da lista de imóveis
- ✅ Log de auditoria automático através do hook
- ✅ Validação de regras de negócio
- ✅ Feedback visual com toast messages

**Teste realizado:**
- ✅ Build sem erros (`pnpm build`)
- ✅ Linter sem problemas
- ✅ Integração com tabela `imoveisvivareal` funcional

---

### 2025-01-28 - Correção de Acesso Admin e Dashboard de Leads

**Problemas identificados:**

1. **Usuário admin não visualiza leads:** O admin Tiago França tinha `company_id = null` e as políticas RLS bloqueavam acesso
2. **Card "Total de Leads":** Verificado - já funcionando corretamente (busca da tabela `leads`)
3. **Gráficos do card "Funil e Corretores":** Verificados - já funcionando corretamente

**Soluções implementadas:**

#### 1. Correção do Acesso Admin aos Leads

**Problema:** Usuário admin com `company_id = null` não conseguia acessar leads devido às políticas RLS restritivas.

**Solução:**
- Associado usuário admin à empresa existente:
```sql
UPDATE user_profiles 
SET company_id = 'd8387240-f150-4cf4-ae21-28e1f95f453c'
WHERE id = '180f41f9-29f9-43a4-aa00-e282cce1c176';
```

- Criadas novas políticas RLS que permitem acesso global para admins:

```sql
-- Policy SELECT: Admin vê tudo, gestor vê sua empresa, corretor vê seus leads
CREATE POLICY "leads_select_admin_global" ON public.leads
FOR SELECT
USING (
  CASE
    WHEN (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' THEN true
    WHEN (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'gestor' THEN (company_id = get_user_company_id())
    ELSE (company_id = get_user_company_id() AND id_corretor_responsavel = auth.uid())
  END
);
```

#### 2. Dashboard de Leads - Status

**Card "Total de Leads":**
- ✅ **Já funcionando corretamente** - busca da tabela `leads` com `COUNT(*)`
- Localização: `src/components/DashboardContent.tsx` linha 118-120

**Gráfico "Funil de Estágios":**
- ✅ **Já funcionando corretamente** - busca coluna `stage` da tabela `leads`
- Localização: `src/services/metrics.ts` função `getLeadsFunnel()`
- Ordenação por `STAGE_ORDER` predefinida

**Gráfico "Corretores por Leads":**
- ✅ **Já funcionando corretamente** - agrupa leads por `id_corretor_responsavel`
- Localização: `src/services/metrics.ts` função `getLeadsByBroker()`
- Join com `user_profiles` para nomes dos corretores

**Resultado:**
- ✅ Admin agora acessa todos os leads do sistema
- ✅ Políticas RLS seguem hierarquia: Admin (global) > Gestor (empresa) > Corretor (próprios leads)
- ✅ Dashboard de leads totalmente funcional
- ✅ Gráficos de funil e corretores operacionais

**Dados verificados:**
- 61 leads na empresa `N8N Labz Imobiliária`
- Admin agora vinculado à empresa correta
- Políticas RLS aplicadas e testadas

---

*Este documento será atualizado conforme novas implementações e decisões arquiteturais.*
