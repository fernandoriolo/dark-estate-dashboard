# Checklist — Branch Protection na main (gate de merge)

- Objetivo: exigir que PRs para `main` passem pelos jobs do CI antes do merge.

## Passo a passo

1) Abra Settings → Branches → Branch protection rules → Add rule
2) Branch name pattern: `main`

3) Pull Requests
- Marque "Require a pull request before merging"
- Required approvals: 1 (ou 2, se preferir)
- Marque "Dismiss stale pull request approvals when new commits are pushed"
- Marque "Require conversation resolution"
- (Opcional) "Require review from Code Owners"

4) Status checks obrigatórios
- Marque "Require status checks to pass before merging"
- Marque "Require branches to be up to date before merging"
- Selecione os checks:
  - `rls-verify`
  - `lint-build`
  - `semgrep`
  - `types-gen-check`
  - `require-all`
- Observação: se os checks não aparecerem, abra um PR de teste de `desenvolvimentoTiago`/`desenvolvimentoFernando` → `main` para “popular” a lista. Volte e selecione-os.

5) Restrições de push
- Marque "Restrict who can push to matching branches"
- Selecione apenas administradores ou um time específico (bloqueia push direto na main)

6) Proteções adicionais
- Marque "Do not allow bypassing the above settings"
- (Opcional) Marque "Require linear history"
- Marque "Do not allow force pushes"
- Marque "Do not allow deletions"
