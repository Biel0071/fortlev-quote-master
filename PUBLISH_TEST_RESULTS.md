# Resultados de verificação: Publicar

Verificado em 13/11/2026. Nenhum workflow foi iniciado pelo agente; execuções automáticas existentes estão descritas na atualização abaixo.

| Verificação | Resultado |
|---|---|
| `npm run test:catalog` na loja | Passou: 20/20 testes na verificação final (inclui catálogo, preço verificado, retry de imagem e proxy de publicação). |
| `npx tsc --noEmit --pretty false` | Passou na verificação atual. |
| `node_modules\\.bin\\tsc --noEmit` na loja | Passou. |
| ESLint global da loja (`npm run lint`) | Falhou: 994 erros e 53 avisos na verificação atual, distribuídos pelo repositório. |
| ESLint dos arquivos do painel/layout | Passou após corrigir o tipo do ícone e dependências de hooks. |
| `npm run build` na loja | Passou; Vite transformou 5.362 módulos. Há avisos de chunk/import existentes. |
| Testes específicos da API Platform | Passou: 7/7 testes do `store-publishing.test.ts`. |
| Build TypeScript da API Platform | Passou após integrar a rota no grupo admin. |
| Suíte global da API Platform | Falhou: 277/278 testes; a falha é `smart-router-and-pools.test.ts`, expectativa de que `ollama:qwen3.5:0.8b` não inclua `vision`. Logs também mostram Postgres/Redis locais indisponíveis em testes de outros serviços. |
| `git diff --check` | Passou nas árvores da loja e da API Platform. |
| Bash/YAML syntax check | Não disponível neste Windows: Bash/WSL não inicia e o Python local está quebrado. |
| Teste remoto do domínio/proxy | Bloqueado pela infraestrutura observada: proxy responde SPA HTML 200; marcador de versão retorna 404; DNS aponta para `185.158.133.1`. |
| Publicação e rollback real | Não executados, pois o domínio e o alvo de deploy da VPS não estão provisionados para este fluxo. |

## Cobertura específica

Os testes novos da API cobrem a assinatura do JWT da GitHub App, rejeição de não-admin, validação de sessão administrativa, parsing do workflow/run e proteção contra duplicidade. Os testes da loja cobrem uso do proxy same-origin com bearer, SHA esperado/idempotência e exibição de falha real do backend.

Ficam pendentes para ambiente provisionado: executar uma publicação controlada, observar passos/logs pelo navegador, validar loja/login/carrinho e confirmar rollback mediante falha de saúde. A ausência de domínio/proxy/segredos impede afirmar esses resultados.

## Estado observado diretamente no GitHub em 13/11/2026

- Actions está habilitado. REST lista zero variáveis, zero secrets e zero environments de repositório.
- Dois pushes em `main` (`ff3854c`, `f07fbd0`) seguem enfileirados desde 11/11/2026, ambos com zero jobs.
- Três execuções anteriores tiveram `lint-build` aprovado, etapa Docker `docker/build-push-action@v6` falha e deploy ignorado.
- Consulta REST de logs retornou 403; a razão da falha Docker não pôde ser examinada. Nenhum run foi disparado ou cancelado durante esta tarefa.
# Atualização da interface local (2026-11-13)

- Build de produção concluído com sucesso.
- Em uma aba nova de `localhost:8080`, o botão **Publicar** foi confirmado visível no cabeçalho.
- A rota de loja da captura usa um identificador inválido; o painel mantém métricas em `—` e explica que não identificou a loja. Não foi executado deploy.
- O início real de publicação não foi testado: falta backend publicador configurado/sessão autenticada confirmada.
- `npx tsc --noEmit`: passou; `npm run test:catalog`: 20/20 passaram; build de produção passou (5.362 módulos); `git diff --check` passou. ESLint global segue falhando por erros legados distribuídos no repositório.
- O teste unitário da API de publicação confirma o proxy same-origin e falha explícita do backend, mas não valida uma sessão/backend Fênix real.

