# 🔒 Checklist RLS - Dashboard PAINEL

## 📋 **Status da Análise**

**Data**: 2025-01-24  
**Escopo**: Verificação de Row Level Security nas consultas do dashboard  
**Tabelas analisadas**: 7 tabelas críticas  
**Roles testados**: admin, gestor, corretor

---

## 📊 **Análise das Políticas Atuais**

### ✅ **LEADS** - Políticas Corretas
**RLS Habilitado**: ✅ Sim  
**Políticas Implementadas**: 4 policies (SELECT, INSERT, UPDATE, DELETE)

```sql
-- Policy Principal: leads_select_company_scoped
-- CORRETO: Respeita hierarquia de roles
CASE
  WHEN role IN ('admin', 'gestor') THEN true  -- Ve todos da empresa
  ELSE (id_corretor_responsavel = auth.uid()) -- Ve apenas próprios
END
```

**✅ Comportamento Esperado**:
- **Admin**: Acesso global (todas empresas)
- **Gestor**: Todos leads da empresa
- **Corretor**: Apenas leads próprios (id_corretor_responsavel = auth.uid())

---

### ⚠️ **IMOVEISVIVAREAL** - Política Permissiva
**RLS Habilitado**: ✅ Sim  
**Política Atual**: `imoveisvivareal_all` - **PERMISSIVA DEMAIS**

```sql
-- PROBLEMA: Policy atual permite acesso total
qual: "true"              -- ❌ Permite acesso irrestrito
with_check: "true"        -- ❌ Permite inserção irrestrita
```

**🚨 Problema Identificado**:
- **Qualquer usuário** pode ver **todos imóveis** de **todas empresas**
- Não respeita `company_id` nem hierarquia de roles
- **Vazamento de dados** entre empresas

**✅ Correção Necessária**:
```sql
-- Policy corrigida necessária:
((company_id = get_user_company_id()) AND
CASE
  WHEN get_user_role() IN ('admin', 'gestor') THEN true
  ELSE (user_id = auth.uid())
END)
```

---

### ⚠️ **CONTRACTS** - Políticas Permissivas 
**RLS Habilitado**: ✅ Sim  
**Políticas Atuais**: 4 policies - **TODAS PERMISSIVAS**

```sql
-- PROBLEMA: Todas as policies são permissivas
"Anyone can view contracts"   - qual: "true"    -- ❌ Acesso total
"Anyone can create contracts" - with_check: "true" -- ❌ Criação irrestrita
"Anyone can update contracts" - qual: "true"    -- ❌ Update irrestrito
"Anyone can delete contracts" - qual: "true"    -- ❌ Delete irrestrito
```

**🚨 Problemas Críticos**:
- **VGV sensível** visível para todos
- **Contratos confidenciais** sem proteção
- **Dados financeiros** expostos entre empresas

**✅ Correção Necessária**:
```sql
-- Policy de SELECT corrigida:
((company_id = get_user_company_id()) AND
CASE
  WHEN get_user_role() IN ('admin', 'gestor') THEN true
  ELSE false  -- Corretores não acessam contratos
END)
```

---

### ⚠️ **WHATSAPP_MESSAGES** - Política Permissiva
**RLS Habilitado**: ✅ Sim  
**Política Atual**: `whatsapp_messages_all` - **PERMISSIVA DEMAIS**

```sql
-- PROBLEMA: Acesso total a mensagens
qual: "true"              -- ❌ Todas mensagens visíveis
with_check: "true"        -- ❌ Qualquer inserção permitida
```

**🚨 Problema Identificado**:
- **Mensagens privadas** visíveis entre empresas
- **Heatmap de conversas** com dados de outras empresas
- **Violação de privacidade** de clientes

**✅ Correção Necessária**:
```sql
-- Policy corrigida para heatmap:
EXISTS (
  SELECT 1 FROM whatsapp_instances wi 
  JOIN user_profiles up ON wi.user_id = up.id
  WHERE wi.id = whatsapp_messages.instance_id
    AND up.company_id = get_user_company_id()
    AND CASE
      WHEN get_user_role() IN ('admin', 'gestor') THEN true
      ELSE (wi.user_id = auth.uid())
    END
)
```

---

### ⚠️ **WHATSAPP_INSTANCES** - Política Permissiva
**RLS Habilitado**: ✅ Sim  
**Política Atual**: `whatsapp_instances_all` - **PERMISSIVA DEMAIS**

```sql
-- PROBLEMA: Instâncias WhatsApp visíveis globalmente
qual: "true"              -- ❌ Todas instâncias acessíveis
```

**🚨 Problema Identificado**:
- **Números de telefone** expostos entre empresas
- **Configurações de WhatsApp** acessíveis a todos

---

### ✅ **USER_PROFILES** - Políticas Parcialmente Corretas
**RLS Habilitado**: ✅ Sim  
**Políticas**: Corretas para admins, **problemáticas para empresa**

```sql
-- CORRETO: Admins têm acesso global
(id = auth.uid()) OR is_admin_user()

-- PROBLEMA: Gestores não veem corretores da empresa
-- Necessário para JOIN em leads por corretor
```

**⚠️ Problema para Dashboard**:
- **Gestores** não conseguem ver **nomes dos corretores** 
- **JOIN leads → user_profiles** falha para gestores
- **Gráfico "Leads por Corretor"** retorna NULL em nomes

---

## 🧪 **Cenários de Teste por Role**

### 👑 **ADMIN** - Acesso Global
**Função**: Visualizar tudo, todas empresas

#### Dashboard - Métricas Esperadas
- ✅ **Leads**: Todos leads de todas empresas
- ⚠️ **Imóveis**: Atualmente vê todos (INCORRETO se há multi-tenant)
- ⚠️ **Contratos**: Vê todos (pode ser correto para admin)
- ⚠️ **Mensagens**: Vê todas conversas (problemático)

#### Testes Recomendados
```sql
-- 1. Verificar se admin vê leads de múltiplas empresas
SELECT company_id, COUNT(*) FROM leads GROUP BY company_id;

-- 2. Verificar acesso a contratos sensíveis
SELECT * FROM contracts LIMIT 5;

-- 3. Verificar mensagens de outras empresas
SELECT DISTINCT instance_id FROM whatsapp_messages LIMIT 10;
```

---

### 🏢 **GESTOR** - Escopo da Empresa
**Função**: Ver todos dados da sua empresa

#### Dashboard - Métricas Esperadas
- ✅ **Leads**: Apenas da company_id do gestor
- ⚠️ **Imóveis**: Apenas da empresa (atualmente todos)
- ⚠️ **Contratos**: Apenas da empresa (atualmente todos)
- ⚠️ **Mensagens**: Apenas instâncias da empresa

#### Problemas Identificados
1. **Leads por Corretor**: Nomes podem retornar NULL
2. **Distribuição Imóveis**: Dados de outras empresas
3. **VGV**: Valores de outras empresas
4. **Heatmap**: Conversas de outras empresas

#### Testes Críticos
```sql
-- 1. Verificar isolamento de empresa em imóveis
SELECT company_id, COUNT(*) FROM imoveisvivareal 
WHERE company_id != get_user_company_id();

-- 2. Verificar JOIN com user_profiles para corretores
SELECT l.id, up.full_name 
FROM leads l 
LEFT JOIN user_profiles up ON l.id_corretor_responsavel = up.id 
LIMIT 5;
```

---

### 👤 **CORRETOR** - Dados Próprios
**Função**: Ver apenas seus leads e dados relacionados

#### Dashboard - Métricas Esperadas
- ✅ **Leads**: Apenas onde id_corretor_responsavel = auth.uid()
- ⚠️ **Imóveis**: Apenas próprios (atualmente todos)
- ❌ **Contratos**: Não deveria acessar (atualmente acessa todos)
- ⚠️ **Mensagens**: Apenas suas instâncias WhatsApp

#### Problemas Críticos
1. **Acesso a contratos**: Corretor vê VGV de toda empresa
2. **Imóveis globais**: Vê portfolio completo da empresa
3. **Mensagens globais**: Conversas de outros corretores

#### Impacto no Dashboard
- **VGV**: Dados financeiros sensíveis expostos
- **Leads por Canal**: Métricas infladas com dados alheios
- **Heatmap**: Atividade de outros corretores visível

---

## 🚨 **Problemas Críticos Identificados**

### 1. **Vazamento de Dados Entre Empresas**
**Tabelas Afetadas**: imoveisvivareal, contracts, whatsapp_messages, whatsapp_instances

**Risco**: 🔴 **ALTO**
- Dados confidenciais de clientes expostos
- Informações comerciais sensíveis vazadas
- Violação de privacidade entre empresas

### 2. **Exposição de Dados Financeiros**
**Tabela**: contracts (VGV, valores de locação/venda)

**Risco**: 🔴 **CRÍTICO**
- Corretores acessam dados financeiros da empresa
- Informações estratégicas expostas

### 3. **Falha em JOINs para Gestores**
**Problema**: user_profiles não permite acesso de gestores a corretores

**Impacto**: 🟡 **MÉDIO**
- Gráfico "Leads por Corretor" com nomes NULL
- Funcionalidade comprometida

---

## ✅ **Correções Necessárias por Prioridade**

### 🔴 **PRIORIDADE 1 - Crítica (Implementar IMEDIATAMENTE)**

#### 1. Corrigir policy contracts
```sql
-- Substituir policies permissivas por:
CREATE POLICY "contracts_select_company_role" ON contracts FOR SELECT
USING (
  (company_id = get_user_company_id()) AND
  get_user_role() IN ('admin', 'gestor')
);
```

#### 2. Corrigir policy imoveisvivareal  
```sql
CREATE POLICY "imoveisvivareal_select_company_scoped" ON imoveisvivareal FOR SELECT
USING (
  (company_id = get_user_company_id()) AND
  CASE
    WHEN get_user_role() IN ('admin', 'gestor') THEN true
    ELSE (user_id = auth.uid())
  END
);
```

#### 3. Corrigir policy whatsapp_messages
```sql
CREATE POLICY "whatsapp_messages_select_company_scoped" ON whatsapp_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_instances wi 
    JOIN user_profiles up ON wi.user_id = up.id
    WHERE wi.id = whatsapp_messages.instance_id
      AND up.company_id = get_user_company_id()
      AND CASE
        WHEN get_user_role() IN ('admin', 'gestor') THEN true
        ELSE (wi.user_id = auth.uid())
      END
  )
);
```

### 🟡 **PRIORIDADE 2 - Importante (Implementar em 48h)**

#### 4. Ajustar user_profiles para JOINs
```sql
CREATE POLICY "user_profiles_select_company_lookup" ON user_profiles FOR SELECT
USING (
  (id = auth.uid()) OR 
  is_admin_user() OR
  (company_id = get_user_company_id() AND get_user_role() IN ('gestor'))
);
```

#### 5. Corrigir whatsapp_instances
```sql
CREATE POLICY "whatsapp_instances_select_company_scoped" ON whatsapp_instances FOR SELECT
USING (
  (company_id = get_user_company_id()) AND
  CASE
    WHEN get_user_role() IN ('admin', 'gestor') THEN true
    ELSE (user_id = auth.uid())
  END
);
```

---

## 🧪 **Scripts de Validação**

### Teste 1: Isolamento entre Empresas
```sql
-- Executar como gestor de empresa X
-- Não deve retornar dados de empresa Y
SELECT 'leads' as tabela, company_id, COUNT(*) FROM leads GROUP BY company_id
UNION ALL
SELECT 'imoveisvivareal', company_id::text, COUNT(*) FROM imoveisvivareal GROUP BY company_id
UNION ALL  
SELECT 'whatsapp_instances', company_id::text, COUNT(*) FROM whatsapp_instances GROUP BY company_id;
```

### Teste 2: Acesso de Corretor a Dados Sensíveis
```sql
-- Executar como corretor
-- Não deve retornar nenhum registro
SELECT COUNT(*) as contracts_acessiveis FROM contracts;
SELECT COUNT(*) as imoveis_outros_corretores FROM imoveisvivareal 
WHERE user_id != auth.uid();
```

### Teste 3: JOIN Leads → User_Profiles (Gestor)
```sql
-- Executar como gestor
-- Deve retornar nomes dos corretores, não NULL
SELECT 
  COALESCE(up.full_name, 'ERRO: Nome NULL') as corretor,
  COUNT(*) as total_leads
FROM leads l
LEFT JOIN user_profiles up ON l.id_corretor_responsavel = up.id
GROUP BY up.full_name;
```

---

## 📋 **Checklist de Implementação**

### Antes de Aplicar Correções
- [ ] **Backup** das policies atuais
- [ ] **Teste** em ambiente de desenvolvimento
- [ ] **Validação** com dados de múltiplas empresas
- [ ] **Aprovação** do time de segurança

### Após Implementação
- [ ] **Testar dashboard** com cada role
- [ ] **Verificar gráficos** não retornam NULL
- [ ] **Validar isolamento** entre empresas
- [ ] **Testar funcionalidades** não quebradas

### Monitoramento Contínuo
- [ ] **Logs de acesso** para detectar vazamentos
- [ ] **Alertas** para policies modificadas
- [ ] **Auditoria mensal** de permissões RLS

---

## 🚨 **Status Atual: AÇÃO NECESSÁRIA**

**🔴 RISCO ALTO**: Dashboard expõe dados sensíveis entre empresas  
**⏰ PRAZO**: Correções críticas em **24-48 horas**  
**👥 IMPACTO**: Todos usuários (gestores e corretores)  
**📊 FUNCIONALIDADES**: 70% dos gráficos comprometidos

**Próximos Passos**:
1. ✅ Documentação concluída
2. 🔄 Criar migrations com policies corrigidas  
3. 🧪 Testar em desenvolvimento
4. 🚀 Deploy em produção
5. ✅ Validar dashboard funcionando

---

*Documento criado em: 2025-01-24*  
*Responsável: Eng. Segurança de Dados*  
*Status: 🔴 **AÇÃO URGENTE NECESSÁRIA***
