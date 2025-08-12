# Módulo de Propriedades — Auditoria Técnica e Guia de Operação

## 1. Visão geral
O módulo de Propriedades concentra a listagem, filtros, ordenação, paginação, visualização e edição básica de imóveis (com suporte a itens do import VivaReal). Ele consome dados da tabela `public.imoveisvivareal` (e exibe adaptado no UI legacy de `properties`).

Principais componentes/arquivos:
- `src/components/PropertyList.tsx`: tela principal (busca, filtros, ordenação, paginação, cards).
- `src/hooks/useImoveisVivaReal.ts`: camada de dados (query Supabase com filtros, paginação e ordenação; sugestões para autocomplete).
- `src/components/PropertyImageGallery.tsx`: modal de galeria de imagens do imóvel.
- `src/integrations/supabase/client.ts`: instância do cliente Supabase (Auth + headers).

## 2. Fluxo de dados (frontend → Supabase)
- O hook `useImoveisVivaReal` expõe:
  - Estados: `page`, `pageSize`, `orderBy`, `filters`, `total`, `imoveis`, `loading`, `error`.
  - Ações: `setPage`, `setPageSize`, `setOrderBy`, `setFilters`, `refetch`.
  - CRUD básico: `createImovel`, `updateImovel`, `deleteImovel`.
- Internamente, o hook monta uma consulta Supabase com:
  - `select('*', { count: 'exact' })` para obter `total`.
  - Filtros com `ilike`, `in`, `gte`, `lte` conforme cada campo (ex.: `preco`, `tamanho_m2`, `quartos`, `cidade`, `bairro`, etc.).
  - Ordenação por `created_at`, `preco` ou `tamanho_m2`.
  - Paginação com `range(from, to)`, calculado via `page` e `pageSize`.
- Há utilitários para sugestões (autocomplete):
  - `suggestCities(q)`, `suggestNeighborhoods(city,q)`, `suggestAddresses(q)`, `suggestSearch(q)`.
  - As consultas retornam listas deduplicadas, limitadas, para uso no UI.

## 3. Banco de Dados e RLS
Tabela principal: `public.imoveisvivareal` (campos: `listing_id`, `imagens[]`, `tipo_categoria`, `tipo_imovel`, `descricao`, `preco`, `tamanho_m2`, `quartos`, `banheiros`, `suite`, `garagem`, `andar`, `ano_construcao`, `cidade`, `bairro`, `endereco`, `cep`, `user_id`, `company_id (legado)`, timestamps, `disponibilidade`, `disponibilidade_observacao`).

- Índices presentes (performance): `created_at DESC`, `cidade`, `bairro`, `preco`, `tamanho_m2`, `quartos`, `banheiros`, `tipo_imovel`, `tipo_categoria`.
- RLS (resumo atual):
  - SELECT: autenticados; reforços por role podem existir dependendo das migrations ativas.
  - INSERT: autenticados (corretor pode inserir).
  - UPDATE/DELETE: liberado para autenticados, com triggers limitando para não-admin/gestor apenas campos de disponibilidade (ver migrações de `enforce_imoveis_limited_update`).
  - Política específica exige observação quando disponibilidade muda para `indisponivel`/`reforma`.

Observação importante: O projeto passa por transição de modelo multi-tenant para role-based. Em produção, recomenda-se validar as policies para garantir que corretores só visualizem/editem o apropriado.

## 4. UI — como funciona
- Barra de busca
  - Debounce ~350ms; integra com o hook e oferece sugestões (endereços, cidades, bairros, ids) para clique rápido.
- Filtros (expansíveis no mesmo card)
  - Campos: Id do imóvel, Categoria, Imóvel, Faixas (Preço/Área/Quartos/Banheiros/Suítes/Garagens/Andar/Ano), Localização (Cidade, Bairro dependente da cidade, Endereço), CEP, Modalidade.
  - “Aplicar Filtros” força refetch; “Limpar” reseta mantendo a busca.
- Ordenação
  - Três botões: Data, Valor, Área m² (cada clique alterna asc/desc e evidencia o campo ativo).
- Paginação
  - Seletor “Imóveis por Página” (12/24/50/100) e paginação com setas ‹ › e números.
- Cards de imóveis
  - Preço em BRL com `Intl.NumberFormat('pt-BR', { currency: 'BRL' })`.
  - Ações: Ver (detalhes), Editar (em modo VivaReal abre editor), Disponibilidade, Excluir.
  - Botões responsivos; sem corte em telas menores.
- Galeria de imagens (modal)
  - Imagem principal contida (`object-contain`), viewer com altura fixa (`h-[60vh]`) e thumbs roláveis horizontalmente dentro do modal.

## 5. Segurança e boas práticas
- Autenticação pelo Supabase (persistência de sessão habilitada).
- Apenas o client “anon/public” no frontend; service role não é utilizado no cliente.
- RLS ativo na tabela. Em ambientes críticos, endurecer:
  - SELECT limitado por empresa/role, se exigido pelo negócio.
  - UPDATE para corretores apenas em campos de disponibilidade (já existe trigger).
- Sanitização: Inputs numéricos validados por tipo; `ilike` com termo sanitizado por trim.

## 6. Possíveis melhorias (técnicas e UX)
- Persistir filtros na URL (deep-link) para compartilhamento/retomada de contexto.
- Substituir inputs de faixa por sliders (ex.: preço/área) para melhor UX.
- Chips de filtros ativos acima da grade para remoção rápida.
- Pré-carregar listas de cidades/bairros mais frequentes para reduzir latência das sugestões.
- Paginação mobile compacta (ex.: “3/12” com select de página).
- Testes e2e para filtros/ordenação/paginação e smoke test do modal.
- Observabilidade: logs de busca/filtro anônimos para entender comportamento do usuário.
- Segurança: revisar e consolidar policies RLS (principalmente em produção) garantindo mínimo privilégio por role.

## 7. Guia rápido para operação (para leigos)
1) Acesse Propriedades no menu.
2) Use a barra de pesquisa para escrever parte do endereço, cidade, bairro ou código do imóvel. Clique em uma sugestão para aplicar.
3) Clique em “Filtros” para abrir campos avançados; preencha o que precisar e clique em “Aplicar Filtros”.
4) Para ordenar, use os botões “Data”, “Valor” ou “Área m²”. A setinha indica se está do menor→maior (↓) ou maior→menor (↑).
5) Ajuste “Imóveis por Página” para ver mais/menos itens; use as setas/números para trocar de página.
6) Em cada card, use “Ver” para detalhes, “Disponibilidade” para marcar disponível/indisponível/reforma e (se permitido) “Editar/Excluir”.
7) Clique na foto do card para abrir a galeria. Use as setas do modal ou clique nas miniaturas para navegar.

## 8. Referências de código
- Listagem e UI: `src/components/PropertyList.tsx`
- Dados e filtros: `src/hooks/useImoveisVivaReal.ts`
- Galeria: `src/components/PropertyImageGallery.tsx`
- Cliente Supabase: `src/integrations/supabase/client.ts`

---

Este documento é vivo. Ao evoluirmos filtros, policies ou UX, atualizar esta página e o `@docs/progress_log.md`.
