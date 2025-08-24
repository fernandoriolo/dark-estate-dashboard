# 🚀 Guia para Aplicar Migrations no Novo Banco Supabase

## 📋 Status Atual
- ✅ Novo banco configurado: `https://ibmyytoyqjoycrgutzef.supabase.co`
- ✅ Credenciais atualizadas no projeto
- ⏳ **Migrations pendentes**: 56 arquivos precisam ser aplicados

## 🎯 Objetivo
Aplicar todas as 56 migrations em ordem cronológica para recriar a estrutura completa do banco.

---

## 📝 PASSO 1: Acessar o SQL Editor

1. **Acesse o dashboard**: https://supabase.com/dashboard/project/ibmyytoyqjoycrgutzef/sql
2. **Faça login** com sua conta Supabase
3. **Abra o SQL Editor**

---

## 📂 PASSO 2: Aplicar Migrations em Ordem

### ⚠️ IMPORTANTE: Execute na ordem cronológica exata!

Copie e execute cada migration **uma por vez** no SQL Editor:

### 1. **20250614162316-ab1ed7b4-976f-4343-9a52-7aafa8a71b5a.sql**
```sql
-- Copie todo o conteúdo do arquivo e execute
```

### 2. **20250614203000_change_property_id_to_text.sql**
```sql
-- Copie todo o conteúdo do arquivo e execute
```

### 3. **20241211000001_create_dispatch_configurations.sql**
```sql
-- Copie todo o conteúdo do arquivo e execute
```

### 4. **20241211000002_dispatch_configurations_rls.sql**
```sql
-- Copie todo o conteúdo do arquivo e execute
```

### 5. Continue com todas as outras migrations...

---

## 🔄 PASSO 3: Lista Completa de Migrations (Execute nesta ordem)

1. `20250614162316-ab1ed7b4-976f-4343-9a52-7aafa8a71b5a.sql` ⭐ **PRIMEIRO**
2. `20250614203000_change_property_id_to_text.sql`
3. `20241211000001_create_dispatch_configurations.sql`
4. `20241211000002_dispatch_configurations_rls.sql`
5. `20250116120000_create_heatmap_conversas_corretores.sql`
6. `20250116130000_fix_heatmap_conversas_real_structure.sql`
7. `20250116140000_fix_heatmap_broker_own_leads.sql`
8. `20250120000001_create_contracts_system.sql`
9. `20250810090000_harden_rls_policies.sql`
10. `20250810093000_admin_global_rls.sql`
11. `20250810094500_add_performance_indexes.sql`
12. `20250810100000_company_features_and_rls.sql`
13. `20250810100500_create_list_company_users_rpc.sql`
14. `20250810102000_harden_contract_templates_storage_policies.sql`
15. `20250811110000_backfill_tenant_columns.sql`
16. `20250811124500_rls_roles_no_company.sql`
17. `20250811133000_add_disponibilidade_and_rls_adjustments.sql`
18. `20250811134500_properties_disponibilidade.sql`
19. `20250811150000_add_created_at_indexes.sql`
20. `20250811160000_create_get_current_role.sql`
21. `20250811161000_rls_roles_no_company_part2.sql`
22. `20250811162000_rls_roles_whatsapp.sql`
23. `20250811165000_add_menu_plantao_permission.sql`
24. `20250811180000_create_oncall_schedules.sql`
25. `20250811183000_alter_oncall_add_assigned_user.sql`
26. `20250811_add_menu_inquilinato.sql`
27. `20250811_alter_inquilinato_messages_add_conversation.sql`
28. `20250811_create_inquilinato_conversations.sql`
29. `20250811_create_inquilinato_messages.sql`
30. `20250812093000_add_disponibilidade_imoveisvivareal.sql`
31. `20250812110000_whatsapp_instances_gestor_assign.sql`
32. `20250812113000_adjust_whatsapp_instances_target_roles.sql`
33. `20250812191500_imobipro_messages_rls.sql`
34. `20250812_require_password_change.sql`
35. `20250812_user_crud_company_rpcs.sql`
36. `20250813130000_list_company_users_remove_company_scope.sql`
37. `20250813_revert_user_module_changes.sql`
38. `20250814090000_add_assigned_user_id_to_leads.sql`
39. `20250814093000_add_id_corretor_responsavel_to_leads.sql`
40. `20250815110000_create_audit_logs.sql`
41. `20250815123000_metricas_dashboard_ptbr.sql`
42. `20250815130000_set_views_security_invoker.sql`
43. `20250815131500_metricas_dashboard_indices_complementares.sql`
44. `20250815134500_update_vgv_definitions.sql`
45. `20250815141000_fix_vgv_secure_views.sql`
46. `20250815142000_fix_vw_segura_vgv_mensal_preserve_cols.sql`
47. `20250815143000_occupacao_breakdown_view.sql`
48. `20250816_list_company_users_add_phone.sql`
49. `20250816_sync_auth_users_user_profiles_fixed.sql`
50. `20250817000000_restrict_gestor_view_admin_users.sql`
51. `20250818200000_fix_oncall_rls_assigned_user.sql`
52. `20250818210000_create_oncall_events.sql`
53. `20250822_add_imobipro_messages_views.sql`
54. `20250822_add_user_profiles_chat_instance.sql`
55. `20250823_enable_realtime_notifications_connection_requests.sql`
56. `20250823_notifications_connection_requests_policies.sql` ⭐ **ÚLTIMO**

---

## ✅ PASSO 4: Verificar Sucesso

Após aplicar todas as migrations, execute este SQL para verificar:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar se as principais tabelas existem
SELECT 
  'companies' as tabela, count(*) as registros FROM companies
UNION ALL
SELECT 
  'user_profiles' as tabela, count(*) as registros FROM user_profiles
UNION ALL
SELECT 
  'properties' as tabela, count(*) as registros FROM properties
UNION ALL
SELECT 
  'leads' as tabela, count(*) as registros FROM leads
UNION ALL
SELECT 
  'contracts' as tabela, count(*) as registros FROM contracts;
```

---

## 🎯 PASSO 5: Testar o Dashboard

Após aplicar todas as migrations:

1. **Reinicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

2. **Acesse o dashboard**: http://localhost:8081

3. **Teste as funcionalidades**:
   - ✅ Login/Cadastro
   - ✅ Propriedades
   - ✅ Leads
   - ✅ Contratos
   - ✅ WhatsApp
   - ✅ Relatórios

---

## 🚨 Possíveis Problemas

### Se alguma migration falhar:
1. **Leia o erro** cuidadosamente
2. **Verifique dependências** (algumas migrations dependem de outras)
3. **Continue com as próximas** (algumas podem falhar por já existirem)

### Erros comuns:
- `already exists`: Normal, continue
- `permission denied`: Verifique se está logado como owner
- `syntax error`: Copie o SQL completo novamente

---

## 📞 Suporte

Se encontrar problemas:
1. **Copie o erro completo**
2. **Informe qual migration estava executando**
3. **Verifique se todas as migrations anteriores foram aplicadas**

---

## 🎉 Resultado Final

Após aplicar todas as migrations:
- ✅ **56 migrations aplicadas**
- ✅ **Todas as tabelas criadas**
- ✅ **RLS policies configuradas**
- ✅ **Índices otimizados**
- ✅ **Dashboard 100% funcional**
