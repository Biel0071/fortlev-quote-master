# Auditoria do sistema Publicar

Auditoria realizada em 13/11/2026 antes de ativar qualquer publicação.

## Loja e repositório

- Repositório: `Biel0071/fortlev-quote-master`; branch local `feat/self-host-supabase`.
- A árvore local já tinha alterações de outras tarefas em `.env`, workflow, Docker, catálogo, Edge Functions e admin. Elas foram preservadas; não houve commit, push ou deploy.
- O workflow versionado nesta branch usa `push` para `main` e `workflow_dispatch`; seu deploy existente espera `/opt/app`, Nginx `edge.conf` e certificados Let's Encrypt.

## VPS, domínio e backend

| Verificação | Resultado observado |
|---|---|
| VPS `209.50.241.22` | API Platform responde em HTTP na porta 3001. |
| Código-fonte encontrado | `/home/deploy/api-platform-build`, branch `main`, árvore limpa, commit `96f643d0a185efc1a95b3115f5bd9d141eea07c6`. |
| Diretório da loja `/opt/app` | Não existe na VPS. |
| Containers `app_blue`/`app_green` | Não existem, nem em estado parado. |
| `/etc/nginx/conf.d/edge.conf` | Não existe. |
| Certificado `/etc/letsencrypt/live/materialdecontrucao.online/fullchain.pem` | Não existe. |
| DNS de `materialdecontrucao.online` | Resolve para `185.158.133.1`, não para `209.50.241.22`. |
| Site atual | `/` e `/healthz` respondem HTTP 200 no endereço `185.158.133.1`. |
| Proxy `/api/store-publish/status` | Responde `200 text/html`, indicando fallback da página; não chega ao backend. |
| Marcador `/deploy-version.json` | Responde 404 no host atual. |
| Variáveis da GitHub App na VPS | Não aparecem em `/home/deploy/api.env`; nenhum segredo foi lido ou exibido. |

## Atualização de auditoria do GitHub (13/11/2026)

- Consulta REST somente leitura autenticada pelo Git Credential Manager: Actions habilitado; nenhuma variável, secret ou environment de repositório listado. O GitHub CLI continua sem sessão local.
- Runs `43096253761` (`ff3854c`) e `43095355900` (`f07fbd0`) foram iniciados por `push` em `main` em 11/11/2026 e permanecem `queued`, sem jobs criados.
- Runs `43094893187`, `43085385734` e `43022046997` concluíram `lint-build`, falharam em `docker/build-push-action@v6` e ignoraram `deploy`. A API dos logs retornou 403, então não há evidência da causa detalhada.
- Nenhum desses estados foi alterado; nenhum workflow foi iniciado ou cancelado durante esta auditoria.

## Conclusão

O botão e o backend estão implementados no código local, mas o ambiente atual não pode recebê-los ainda. O fluxo agora falha fechado: a publicação fica desabilitada enquanto a rota HTTPS da Fênix API não responder com autenticação e enquanto o domínio não servir o SHA implantado. O workflow também verifica a infraestrutura antes de compilar e não declara sucesso sem o marcador do commit esperado.

Para ativar o fluxo, a infraestrutura da loja precisa ser provisionada na VPS existente, o domínio precisa ser apontado/roteado para essa aplicação e a API Platform precisa receber o código e as variáveis privadas descritas em `PUBLISH_PIPELINE_ARCHITECTURE.md`. Esta auditoria não altera DNS, serviços, containers ou arquivos na VPS.
