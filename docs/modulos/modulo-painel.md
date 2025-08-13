# Módulo de Painel — Auditoria Técnica e Guia de Operação

## 1. Visão geral
O módulo de Painel (Dashboard) apresenta uma visão consolidada do funil e do portfólio imobiliário, com KPIs, listas e gráficos em tempo real. Ele agrega dados das tabelas `public.imoveisvivareal`, `public.leads`, `public.contracts`, `public.oncall_events` e `public.audit_logs`, além de respeitar permissões de menu via `role_permissions`.

Principais componentes/arquivos:
- `src/components/DashboardContent.tsx`: conteúdo principal do painel (KPIs, listas, gráficos, widgets)
- `src/components/DashboardHeader.tsx`: cabeçalho com busca global e ações rápidas
- `src/components/UpcomingAppointments.tsx`: widget de próximos compromissos (Agenda)
- `src/components/RecentActivitiesCard.tsx`: atividades recentes (audit trail)
- `src/components/AppSidebar.tsx`: navegação e gating por permissões
- `src/pages/Index.tsx`: roteamento/seleção de views (inclui fallback quando `menu_dashboard` indisponível)
- `src/hooks/useClients.ts`: camada de dados de leads para o card de “Origem dos Clientes”
- `src/hooks/usePermissions.ts`: carregamento e checagem de permissões por role
- `src/integrations/supabase/client.ts`: cliente Supabase (auth, headers, sessão)

Novidades recentes:
- KPIs consolidados com variação percentual mês a mês: VGV (contratos do tipo “Venda”), Total de Imóveis, Disponíveis e Total de Leads, tudo com atualização via Realtime.
- Card “Origem dos Clientes” com gráfico de pizza (Recharts) + contagem total de leads.
- Card “Propriedades Recentes” (últimos itens de `imoveisvivareal`).
- Widget “Próximos Compromissos” (fonte: `oncall_events`) com Realtime + fallback de dados quando indisponível.
- “Atividades Recentes” consumindo `audit_logs`, com filtros por role/usuário e paginação.

## 2. Fluxo de dados (frontend → Supabase)
- `DashboardContent` executa buscas paralelas:
  - Propriedades recentes: `imoveisvivareal.select('*').order('created_at', { ascending: false }).limit(5)`
  - Distribuição por tipo: `imoveisvivareal.select('tipo_imovel')` e agrega no client com normalização de rótulos
  - KPIs (Promise.all):
    - `imoveisvivareal.select('id', { head: true, count: 'exact' })`
    - `imoveisvivareal.select('id', { head: true, count: 'exact' }).eq('disponibilidade', 'disponivel')`
    - `leads.select('id', { head: true, count: 'exact' })`
    - `contracts.select('valor, data_assinatura, tipo').eq('tipo', 'Venda')` com janela do mês corrente
    - Linhas “baseline” do mês anterior para variação percentual (contagens até o último dia do mês passado + soma VGV mês anterior)
  - Realtime: canal único assinando `imoveisvivareal`, `leads` e `contracts` (qualquer evento) → refetch dos blocos acima.
- `UpcomingAppointments`:
  - `oncall_events.select('*')` com janela [agora, +7 dias], ordenação crescente e `limit(5)`
  - Realtime da tabela `oncall_events` + refresh periódico (5 min) e fallback mock em caso de erro
- `RecentActivitiesCard`:
  - `audit_logs.select('*').order('created_at', { descending: true }).range(page*pageSize, ...)`
  - Filtros (role → carrega `user_profiles` quando admin/gestor; usuário → aplica `.eq('actor_id', userId)`) 
  - Realtime em `audit_logs` → reseta página e recarrega
- `useClients`:
  - `leads.select('*').order('created_at', { descending: true })` para alimentar “Origem dos Clientes”
- `usePermissions`:
  - Carrega `role_permissions` por `profile.role` e materializa um mapa `permission_key → boolean` para gating de menus e fallback de view no `Index.tsx`.

Observações:
- As contagens usam `head: true` com `count: 'exact'` (sem payload), reduzindo IO.
- O somatório do VGV acontece no client (soma de `valor`), filtrado por tipo “Venda” e intervalo de datas do mês corrente.
- A normalização de `tipo_imovel` é feita no client para agrupar categorias similares (ex.: “Apartamento/Condomínio”, “Casa”, “Terreno/Lote”...).

## 3. Banco de Dados e RLS
Tabelas tocadas no módulo:
- `public.imoveisvivareal`: `id`, `tipo_imovel`, `cidade`, `bairro`, `preco`, `disponibilidade`, `created_at`, demais campos do inventário
- `public.leads`: `id`, `source`, `created_at`, demais metadados de lead
- `public.contracts`: `id`, `valor`, `tipo`, `data_assinatura`
- `public.oncall_events`: `id`, `starts_at`, `client_name`, `title`, `address`, `type`, `status`
- `public.audit_logs`: `id`, `actor_id`, `action`, `resource`, `resource_id`, `meta`, `created_at`
- `public.role_permissions` e `public.user_profiles` (auxiliares para gating e filtros)

Índices recomendados (performance):
- `imoveisvivareal(created_at DESC)`, `imoveisvivareal(disponibilidade)`, `imoveisvivareal(tipo_imovel)`, `imoveisvivareal(cidade)`, `imoveisvivareal(bairro)`
- `leads(created_at DESC)`, `leads(source)`
- `contracts(data_assinatura, tipo)` para janelas temporais por tipo
- `oncall_events(starts_at ASC)`
- `audit_logs(created_at DESC)`, `audit_logs(actor_id)`

RLS (diretrizes):
- RLS deve estar ativo e restrito por `company_id`/`auth.uid()` conforme o domínio, seguindo as regras globais do projeto.
- `imoveisvivareal`: SELECT por escopo de empresa; UPDATE restrito (ideal: apenas disponibilidade para corretores; demais campos para gestor/admin); DELETE restrito.
- `leads`: SELECT/INSERT por empresa; UPDATE/DELETE conforme role; gestores/admins veem todos da empresa.
- `contracts`: SELECT por empresa; apenas gestores/admins podem listar/ler VGV completo.
- `oncall_events`: SELECT por empresa e/ou pelo `user_id` do corretor responsável, quando aplicável.
- `audit_logs`: leitura recomendada apenas para gestores/admins; corretores somente suas próprias ações.

Nota: As policies devem ler claims JWT (`user_id`, `company_id`, `role`) via `current_setting('request.jwt.claims', true)::json`.

## 4. UI — como funciona
- Cabeçalho (`DashboardHeader`): busca global (placeholder), ícones de notificações e configurações; não interfere nos dados hoje.
- KPIs (grid 4 colunas):
  - VGV (Venda) do mês corrente (formatação compacta: k/M/B) e variação vs mês anterior.
  - Total de Imóveis, Disponíveis e Total de Leads; cada um com ícone e variação percentual.
- Propriedades Recentes: lista dos últimos 5 imóveis com tipo, localização (cidade/bairro) e preço (exibição simplificada `k`).
- Origem dos Clientes: contagem por `leads.source` + total e gráfico de pizza (Recharts) responsivo.
- Próximos Compromissos: janela de 7 dias (até 5 itens), indicação de urgência (< 2h), status com cor/ícone, botão “Ver todos” que navega para Agenda.
- Distribuição por Tipo: grid com ícone-emoji por categoria normalizada e contagem por rótulo.
- Atividades Recentes: lista temporal com filtros (role/usuário) para admins/gestores e paginação interna.
- Sidebar (`AppSidebar`): menus filtrados por `usePermissions`; a view padrão é “dashboard”, mas há fallback para a primeira view permitida quando `menu_dashboard` é negado.

## 5. Segurança e boas práticas
- Supabase Client no frontend usa apenas a chave `anon` e sessão persistida; nenhuma `service_role` no cliente.
- Realtime depende de RLS: certifique-se de que as policies permitem eventos de leitura apenas ao escopo correto (empresa/usuário).
- “Atividades Recentes” (`audit_logs`) deve ser estritamente controlado: configure policies para evitar vazamento de informações sensíveis (apenas admins/gestores, ou o próprio autor para corretores).
- Evite heavy payloads: o uso de `head: true` e `count: 'exact'` já reduz tráfego, mantenha.
- Sanitização/formatos: padronize moeda (BRL) e datas (pt-BR). Campos de origem (leads.source) devem ter conjunto controlado/moderado para evitar rótulos ruidosos no gráfico.

## 6. Possíveis melhorias (técnicas e UX)
- KPI detalhável: tornar cada card clicável para abrir a lista correspondente com filtros preaplicados (ex.: clicar em “Disponíveis” → lista de imóveis disponíveis).
- Persistência de estado: refletir seleções (ex.: mês de referência) na URL para compartilhamento/retomada de contexto.
- Acessibilidade do gráfico: adicionar descrições/labels acessíveis e cores com melhor contraste no Recharts; opção de tabela alternativa.
- Performance: considerar materializar contagens em views/funcs no Postgres quando a base crescer; índices compostos sugeridos acima.
- Normalização de `tipo_imovel`: mover o mapeamento para o banco (enum/tabela de referência) para eliminar divergências de rótulos.
- Agenda: permitir filtro por corretor/empresa no widget; deep-link para a Agenda com âncora do dia.
- Observabilidade: instrumentar Sentry para erros de busca e Realtime; adicionar métricas de latência por card.
- Testes: criar smoke tests para KPIs, Realtime e renderização do gráfico; testes RLS por role nas tabelas tocadas.

## 7. Guia rápido para operação (para leigos)
1) Acesse “Painel” no menu.
2) Observe os 4 KPIs para um resumo rápido do mês (VGV, Total de Imóveis, Disponíveis, Leads).
3) Use “Propriedades Recentes” para ver os últimos imóveis adicionados.
4) Em “Origem dos Clientes”, confira de onde estão vindo os leads e o total geral.
5) Em “Próximos Compromissos”, veja os próximos 5 eventos; clique em “Ver todos” para abrir a Agenda completa.
6) Em “Distribuição por Tipo”, confira quais categorias dominam o portfólio.
7) Em “Atividades Recentes”, gestores/admins podem filtrar por role/usuário para auditoria.

## 8. Referências de código
- Painel: `src/components/DashboardContent.tsx`
- Cabeçalho: `src/components/DashboardHeader.tsx`
- Próximos Compromissos: `src/components/UpcomingAppointments.tsx`
- Atividades Recentes: `src/components/RecentActivitiesCard.tsx`
- Sidebar (menus/permissões): `src/components/AppSidebar.tsx`
- Roteamento/base da aplicação: `src/pages/Index.tsx`, `src/App.tsx`
- Leads (dados): `src/hooks/useClients.ts`
- Permissões: `src/hooks/usePermissions.ts`
- Cliente Supabase: `src/integrations/supabase/client.ts`

---

Este documento é vivo. Ao evoluirmos KPIs, policies ou UX, atualizar esta página e o `@docs/progress_log.md`.


