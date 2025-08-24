# 🔧 Instruções para Corrigir o Dashboard

## 📋 **Resumo dos Problemas Encontrados**

1. **Tabelas faltantes:** `contracts` e `contract_templates` não existem no banco
2. **Colunas faltantes:** Várias colunas definidas no código não existem no banco
3. **Token MCP incorreto:** Usando anon key ao invés de Personal Access Token

## 🚀 **PASSO 1: Corrigir Token MCP**

### Obter Personal Access Token
1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em "Generate new token"
3. Nome: "Cursor MCP"
4. Copie o token (será algo como `sbp_...`)

### Aplicar o Token
1. Abra o arquivo `.cursor/mcp.json`
2. Substitua o valor atual por seu Personal Access Token
3. Salve o arquivo
4. Reinicie o Cursor

## 🏗️ **PASSO 2: Aplicar Migração no Banco**

### Opção A: Via Dashboard Supabase (Recomendado)
1. Acesse: https://supabase.com/dashboard/project/ibmyytoyqjoycrgutzef/sql
2. Copie todo o conteúdo do arquivo `supabase/migrations/20250120000001_create_contracts_system.sql`
3. Cole no editor SQL
4. Clique em "Run" para executar

### Opção B: Via Script Node.js
1. Obtenha sua Service Role Key em: https://supabase.com/dashboard/project/ibmyytoyqjoycrgutzef/settings/api
2. Edite o arquivo `apply-migration.js` e substitua `SUA_SERVICE_ROLE_KEY_AQUI`
3. Execute: `node apply-migration.js`

## 🧪 **PASSO 3: Testar o Sistema**

Após aplicar a migração, teste:

```bash
# Limpar cache e reiniciar
rm -rf node_modules/.vite
npm run dev
```

### Funcionalidades que devem funcionar:
- ✅ Propriedades (já funcionava)
- ✅ Leads e Kanban (já funcionava)
- ✅ **Contratos** (agora deve funcionar)
- ✅ **Templates de Contrato** (agora deve funcionar)

## 📊 **Tabelas Criadas**

### `contract_templates`
- Armazena modelos de contratos (.docx, .pdf, etc.)
- Campos: name, file_path, template_type, etc.

### `contracts`
- Armazena contratos gerados
- Campos: client info, property info, valores, datas, etc.

### Colunas Adicionadas
- `properties`: property_purpose, proprietario_* fields
- `leads`: stage, interest, notes, cpf, endereco, etc.

## 🔍 **Verificação**

Com o MCP funcionando, você pode testar:
```
"Liste todas as tabelas do meu banco"
"Mostre os dados da tabela contracts"
"Gere types TypeScript atualizados"
```

## ⚠️ **Possíveis Problemas**

### Se ainda houver erros:
1. **Cache do Vite:** Delete `node_modules/.vite`
2. **Tipos desatualizados:** Regenere os types do Supabase
3. **Permissões:** Verifique as RLS policies

### Para regenerar types:
```bash
npx supabase gen types typescript --project-id ibmyytoyqjoycrgutzef > src/integrations/supabase/types.ts
```

## 🎯 **Resultado Final**

Após seguir todos os passos:
- ✅ MCP do Supabase funcionando
- ✅ Todas as tabelas existindo no banco
- ✅ Sistema de contratos funcionando
- ✅ Dashboard 100% funcional 