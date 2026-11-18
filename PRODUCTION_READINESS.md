# Prontidão de produção — Depósito Mais

**NÃO PRONTO para declarar recuperação ou publicar.**

## Comprovado localmente

- `npx tsc --noEmit`: passou. `npm run test:catalog`: 20/20 aprovados, incluindo IDs malformados, respostas vazias, preço de carrinho verificado, API de publicação e retry de imagem sem alterar status ativo.
- Build atual passou (5362 módulos; Vite reportou avisos de imports dinâmicos e bundle). `git diff --check` passou.
- Visualização local em `localhost:8080` confirma botão **Publicar** visível, métricas em traço e mensagem clara para UUID de loja inválido. Lojas de demonstração foram removidas do fallback.
- Verificação visual mais recente confirma cabeçalho “Loja não identificada”, seletor “Banco indisponível”, timeout após a consulta de lojas, botão de tentar novamente e painel de produtos sem registros falsos.
- ESLint global falha em 994 erros preexistentes. ESLint focado no `AdminProductsList` segue falhando em regras `any`/estilo de código legado; o novo helper de retry não tem erros de lint.
- Também foram retirados os fallbacks de categorias e banner de campanha, as fotos genéricas de areia e avaliações fictícias. O carrinho agora não aceita preço de snapshot local quando o produto/preço não foi confirmado no banco; checkout fica bloqueado nesse caso.
- Nenhum deploy, push, alteração DNS ou escrita em banco foi executado nesta etapa.
- Em 2026-11-13, `materialdecontrucao.online` resolveu na VPS para `185.158.133.1` e serviu HTML via Cloudflare com HTTP 200. `/healthz` também respondeu 200, porém o corpo era o `index.html` da SPA; isso não é evidência de health check do backend.
- Verificação HTTP atual do domínio retorna 200 em `185.158.133.1` com título `Material de Contrução`; isso confirma entrega de HTML, não funcionamento do catálogo/API. A pesquisa pública ainda encontrou uma cópia rastreada em estado “Sistema em Manutenção”, então não foi usada como prova de estado atual.
- Sonda direta adicional em 2026-11-13: `/` e `/healthz` retornam `200 text/html`; `/deploy-version.json` retorna 404; `/auth/v1/health` do Supabase configurado excedeu 8s. Logo o domínio não comprovou saúde da aplicação/backend e a origem não está validada.
- `git ls-remote` confirma `origin/main` e `origin/MFATACA` no commit `ff3854c`; o checkout local está em `feat/self-host-supabase` no mesmo commit, com alterações locais não commitadas. `gh auth status` não encontra sessão, mas uma credencial GitHub já armazenada pelo Git Credential Manager permitiu consulta REST somente leitura: Actions está habilitado; não há variáveis, secrets ou environments no nível do repositório.
- A API do GitHub mostra dois pushes para `main` enfileirados desde 11/11/2026, ambos sem jobs criados. Três runs anteriores passaram em `lint-build`, falharam em `docker/build-push-action@v6` e tiveram `deploy` ignorado. A API de logs retornou 403; causa detalhada não foi acessível. Nenhum deploy bem-sucedido foi confirmado.
- O CLI Supabase não está instalado e não há token de acesso nem credenciais SOURCE/Service Role no ambiente de processo; nenhum acesso administrativo para descobrir o projeto ou recuperar dados está disponível localmente.

## Bloqueios

- Host de origem Supabase retorna `ENOTFOUND`; usuários, pedidos, tracking, tabelas e Storage não foram recuperados nem validados.
- UUID real da loja não confirmado; o valor hardcoded legado é inválido e foi neutralizado para consultas.
- VPS sem espaço livre suficiente para instalar a stack self-hosted, conforme `infra/supabase/README.md`.
- Não foram confirmados HTTPS, health check, backup/restore, login, catálogo conectado, carrinho/checkout em backend real ou workflow de deploy.
- Não há comprovação de credenciais da GitHub App/Fênix API necessárias para publicar pelo painel.
- O domínio público segue no endereço observado e não foi redirecionado para a VPS; nenhum tráfego foi alterado.

Não alterar DNS nem publicar até reconectar/recuperar a origem, validar tenant e dados, preparar capacidade/backups e executar os testes de operação com ambiente seguro.
