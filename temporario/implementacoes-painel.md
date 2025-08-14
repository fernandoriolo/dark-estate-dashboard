## Módulo **PAINEL** – Especificações e Ajustes

### 1. Permissões de Acesso

* Por padrão, o módulo **PAINEL** deve ser acessível apenas por usuários com **roles** `ADMIN` e `GESTOR`.
* Essa configuração poderá ser alterada no módulo **CONFIGURAR PERMISSÕES**.

---

### 2. Reorganização na Barra Lateral

* Mover o **PAINEL** da seção **PRINCIPAL** (onde atualmente é o primeiro da lista) para a seção **ANALYTICS**.
* Ele deve ser posicionado como o **primeiro item** dessa seção, acima de **RELATÓRIOS**.

---

### 3. Novo Card: **Atividades Recentes**

* Localização: abaixo de todos os cards existentes (atualmente, os últimos são “PRÓXIMOS COMPROMISSOS” e “DISTRIBUIÇÃO POR TIPO”).
* Funções:

  * Exibir uma lista das **10 últimas atividades** realizadas no dashboard pelos usuários.
  * Possibilitar **clique** em cada item para abrir mais detalhes da atividade.
  * **Paginação interna** (apenas dentro do card) para exibir atividades além das 10 mais recentes, de forma dinâmica.
  * **Filtro por ROLE** e, ao selecionar uma role, exibir **filtro dinâmico** para escolher um usuário específico daquela role.
* Integração:

  * Dados devem vir **diretamente do banco de dados de logs** (integração em tempo real via Supabase).
  * Caso não exista tabela ou mecanismo para registrar logs, **criar** essa estrutura.
* Observação: se identificar funcionalidades adicionais úteis para este card, sugerir e implementar.

---

### 4. Cabeçalho do Painel (Dados em Tempo Real)

Todos os valores devem vir diretamente do banco de dados, com comparativo em relação ao mês anterior:

| Indicador            | Fonte / Lógica                                                                      |
| -------------------- | ----------------------------------------------------------------------------------- |
| **VGV (venda)**      | Total de vendas do mês atual (em reais), comparando com o mês anterior.             |
| **Total de Imóveis** | Número total de registros na tabela `imoveisvivareal`.                              |
| **Disponíveis**      | Total de imóveis na tabela `imoveisvivareal` onde `disponibilidade = 'disponivel'`. |
| **Total de Leads**   | Total de registros na tabela `leads`.                                               |

---

### 5. Card **Origem dos Clientes**

* Fonte: coluna `source` da tabela `leads`.
* Implementação:

  * Criar gráfico **circular (pie chart)** moderno e bem estruturado usando **Recharts** (React).
  * Consultar documentação mais recente via MCP Context7 para boas práticas e recursos avançados.
* Layout:

  * Inserir o gráfico abaixo dos dados já existentes no card (atualmente “Total de Leads”).
  * Ajustar tamanho do card para melhor visualização (aumentar largura/altura se necessário).
  * Reduzir a largura do card “Propriedades Recentes” se for preciso para manter proporção.

---

### 6. Card **Próximos Compromissos**

* Fonte: tabela `oncall_schedules` (relacionada ao módulo **Agenda**).
* Exibir:

  * **5 próximos compromissos** por padrão.
  * Paginação interna e dinâmica para mais registros.
* Atualização em tempo real e formatação visual consistente com o restante do painel.

---

### 7. Card **Distribuição por Tipo**

* Fonte: coluna `tipo_imovel` da tabela `imoveisvivareal` (os dados já estão sendo puxados do banco de forma correta).
* Implementação:

  * Criar gráfico nos mesmos moldes do item 5 (Recharts, design moderno).
  * Inserir abaixo dos elementos já existentes no card, mantendo dentro do layout original.

---
