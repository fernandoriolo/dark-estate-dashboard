# Plano de Evolução: Rotas Reais, Code Splitting, Virtualização e Estabilidade

Este documento estabelece um plano sequencial para transformar o dashboard em um SPA mais rápido, dinâmico e estável. Abrange: migração para rotas reais (React Router), code splitting (lazy + manualChunks no Vite), virtualização de listas e hardening de realtime/foco, com entregáveis por fases e critérios de sucesso.

## 1) Migração para Rotas Reais (React Router v6)

- Mapear views atuais e paths canônicos:
  - dashboard → /dashboard
  - properties → /properties
  - contracts → /contracts
  - agenda → /agenda
  - plantao → /plantao
  - reports → /reports
  - clients → /clients
  - clients-crm → /clients-crm
  - connections → /connections
  - users → /users
  - permissions → /permissions
  - inquilinato → /inquilinato
  - disparador → /disparador
  - chats → /chats
  - profile → /profile
- Compatibilidade: aceitar `?view=` (via `PersistRoute` legacy) e redirecionar para a rota equivalente.
- Estruturar router com layout pai (Sidebar + Header) e rotas filhas no `<Outlet/>`.
- Persistir última rota em `localStorage` e restaurar em mount (sem resets no foco/minimizar).
- Redirecionamento padrão guiado por permissão (ex.: se não pode /dashboard, derivar próxima rota permitida).

Entregáveis:
- `src/App.tsx`: `<Routes>` com rota pai protegida por sessão e filhas mapeadas.
- `src/pages/Index.tsx`: simplificado para layout/base, sem state interno de view.
- `AppSidebar`: navegar com `navigate('/path')` ao invés de `app:navigate`.

Riscos/Mitigação:
- Links quebrados: adicionar um `<Route path="*" element={<NotFound/>}/>` e fallback para última rota válida.
- Deep-link: garantir SPA fallback no Hostinger (.htaccess).

## 2) Code Splitting e Prefetch

- Aplicar `React.lazy` + `Suspense` em todos os módulos de página.
- Prefetch em hover/foco dos itens de menu (chamar `import()` no onMouseEnter/onFocus para melhorar a latência percebida).
- Vite manualChunks (rollup): separar libs pesadas e domínios:
  - vendor-pdf: `jspdf`, `react-pdf`, `pdfjs-dist`
  - vendor-canvas: `html2canvas`
  - domain-contracts: ContractsView + utilitário `contractProcessor`
  - domain-agenda: AgendaView e dependências pesadas

Entregáveis:
- `vite.config.ts`: `build.rollupOptions.output.manualChunks` organizado.
- Verificação de build: reduzir JS inicial < 300kb gzip.

## 3) Virtualização de Listas

- Adotar `@tanstack/react-virtual` (leve, mantida) em:
  - `PropertyList` (grid/list com muitos itens)
  - `ClientsView` (se renderiza listas longas)
  - Opcional: mensagens no `ChatsView` se o volume for muito grande
- Otimizações auxiliares:
  - Imagens com `loading="lazy"` e placeholder
  - `memo`/`useMemo` em itens da lista
  - Paginação/infinite scroll quando aplicável

Entregáveis:
- `PropertyList` com virtualização e medição de FPS (Performance panel do DevTools).

## 4) Realtime, Foco e Polling

- Garantir unsubscribe dos canais Supabase em unmount e troca de rota (já aplicado em vários pontos; revisar onde houver listeners globais).
- Evitar refetch em foco (se adotar React Query: `refetchOnWindowFocus: false`, `networkMode: online` apenas onde necessário).
- Pausar polling de endpoints externos quando `document.hidden` (reduz rede em background) e retomar com debounce ao voltar.

Entregáveis:
- Hooks que fazem polling externos: condicionar com `document.hidden`.

## 5) SPA Fallback (Hostinger)

- `.htaccess` com fallback para `index.html` (SPA) e cache de assets (com `immutable` quando possível).
- Confirmar CORS e headers seguros.

Snippet sugerido:
```
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 6) Fases e Critérios de Aceite

- Fase 1 (Rotas Reais):
  - [x] Navegação por URL direta para qualquer módulo funciona (deep-link ok)
  - [x] Minimizar/restaurar aba não altera rota
  - [x] Última rota é restaurada após reload/HMR

- Fase 2 (Code Splitting):
  - [x] Build com chunks separados para vendors pesados
  - [x] JS inicial < 300kb gzip
  - [x] Prefetch do menu funcionando (queda de latência perceptível na 1ª navegação)

- Fase 3 (Virtualização):
  - [x] Scroll fluido em listas grandes (sem queda de FPS)
  - [ ] Verificado no DevTools (Performance)

- Fase 4 (Realtime/Polling):
  - [ ] Nenhum vazamento de canal
  - [ ] Nenhum burst de rede ao focar a aba desnecessariamente

- Fase 5 (Deploy):
  - [ ] Fallback SPA operando no Hostinger
  - [ ] Build e deploy OK no CI/CD

## 7) Métricas e Observabilidade

- Medir TTI e peso de JS após Fase 2 (Relatório no PR)
- Medir FPS/Responsividade nas listas após Fase 3
- Logar erros de navegação e realtime (Sentry recomendado)

## 8) Próximos Passos Detalhados (Lazy “on demand” e otimizações)

1. Imports dinâmicos para libs pesadas apenas no momento de uso:
   - Export/print: `jspdf` e `html2canvas` dentro do handler.
   - Preview PDF: `react-pdf` carregado só ao abrir o preview.
2. Remover import estático de `contractProcessor`:
   - Em todos os pontos, trocar por `await import('@/utils/contractProcessor')`.
3. Lazy de modais e subpáginas pesadas:
   - `PropertyDetailsPopup`, `PropertyEditForm`, `NewContractModal`, `MissingDataModal` com `React.lazy` e `Suspense` apenas quando abertos.
4. Prefetch sob ociosidade:
   - `requestIdleCallback(() => import('@/components/AgendaView'))` e outros módulos mais usados.
5. Postergar fetch/polling até visível:
   - Em hooks com polling externo, pausar quando `document.hidden` e retomar com debounce no foco.
6. UX de buscas pesada:
   - Usar `useDeferredValue`/`useTransition` para manter digitação suave.

Checklist técnico por arquivo (inicial):
- `src/components/ContractsView.tsx`: já usa import dinâmico para `processContract` (ok).
- `src/components/NewContractModal.tsx`: substituir imports estáticos por dinâmicos dentro dos handlers.
- `src/components/MissingDataModal.tsx`: idem (`getSelectOptions`).
- Modais: aplicar `React.lazy` e render condicional com `Suspense`.

Após esta etapa, repetir build e aferir tamanhos dos chunks.
