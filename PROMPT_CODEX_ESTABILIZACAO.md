# PROMPT CODEX — Estabilização + Deploy VPS Produção (One-Shot)

Cole o bloco abaixo no Codex CLI (com acesso ao repo local e SSH à VPS).
Execute tudo em ordem. Ao final, o sistema estará estável, com CI/CD verde
e rodando em produção com auto-update a cada push.

---

## 🔧 VARIÁVEIS (preencha antes)

```bash
export REPO_DIR="$HOME/work/fortlev-quote-master"
export GITHUB_OWNER=""           # seu user/org
export GITHUB_REPO=""            # nome do repo
export VPS_IP=""
export VPS_USER="root"
export DOMINIO_PRINCIPAL="materialdecontrucao.online"
export DOMINIOS_TODOS="mfatacadista.com www.mfatacadista.com materialdecontrucao.online www.materialdecontrucao.online"
export EMAIL_CERTBOT=""
export GHCR_TOKEN=""             # PAT classic: read:packages, write:packages, repo
export WEBHOOK_SECRET="$(openssl rand -hex 32)"
export VITE_SUPABASE_URL="https://flkionbmkuqgkudjjuqk.supabase.co"
export VITE_SUPABASE_PROJECT_ID="flkionbmkuqgkudjjuqk"
export VITE_SUPABASE_PUBLISHABLE_KEY=""   # anon key (pública)
```

---

## 🤖 PROMPT PARA COLAR NO CODEX

> Você é um SRE sênior. Estabilize e coloque em produção esta plataforma SaaS
> multi-loja (React 18 + Vite + TS + Tailwind + shadcn/ui + Supabase, 112
> migrations, 40 edge functions, Docker + Nginx multi-tenant já esboçado).
> Execute todos os passos abaixo em sequência, validando cada um antes do
> próximo. Nunca remova funcionalidades existentes.
>
> ### FASE 0 — Ambiente local
> 1. Instale Node 20 LTS via `nvm` (o `node` está ausente na máquina). Confirme com `node -v && npm -v`.
> 2. Instale Bun: `curl -fsSL https://bun.sh/install | bash`.
> 3. `cd $REPO_DIR`.
>
> ### FASE 1 — Higiene do repositório
> 1. **Lockfiles duplicados**: manter apenas `bun.lockb`. Delete `package-lock.json` e `bun.lock`. Adicione ambos ao `.gitignore` se ainda não estiverem.
> 2. **.env versionado**: `git rm --cached .env` e adicione `.env` ao `.gitignore`. Crie `.env.example` com as chaves `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (valores em branco). Não reescreva o histórico — as chaves são anon públicas.
> 3. **README genérico**: substitua por um README real descrevendo módulos (loja, checkout, orçamentos Fortlev, admin, master admin, AllowPay, IA), stack, requisitos, `bun install`, `bun run dev`, `bun run build`, link p/ `DEPLOY.md` e `docs/Architecture.md`.
> 4. **console.log em produção**: crie `src/lib/logger.ts` exportando `logger.debug/info/warn/error` que só imprime quando `import.meta.env.DEV`. Rode um codemod (ex: `jscodeshift` ou `sed` seguro) trocando `console.log(` por `logger.debug(` em `src/**/*.{ts,tsx}` **exceto** em `src/lib/logger.ts`. Rode `bun run build` depois para garantir que nada quebrou.
> 5. **Componentes gigantes (>800 linhas ou >50 KB)**: liste-os com `find src -name '*.tsx' -size +50k -exec wc -l {} +`. Para o(s) maior(es) (~200 KB), extraia sub-componentes em pastas irmãs (`./components/`, `./hooks/`, `./utils/`) preservando 100% do comportamento. Se o refactor for arriscado, deixe um TODO estruturado e NÃO force — priorize build verde.
> 6. **Placeholders "Em breve"**: `rg -n "Em breve" src` — para cada ocorrência, mantenha o placeholder mas adicione `data-testid="placeholder-<area>"` para futuros testes. Não remova.
>
> ### FASE 2 — Testes mínimos
> 1. Adicione Vitest + Testing Library: `bun add -d vitest @testing-library/react @testing-library/jest-dom @vitest/coverage-v8 jsdom`.
> 2. Configure `vitest.config.ts` (jsdom, setup file) e script `"test": "vitest run"`, `"test:watch": "vitest"`.
> 3. Crie 3 smoke tests: render de `App`, render de `/loja`, e um teste utilitário puro (ex: função de preço em `src/lib`).
> 4. Rode `bun run test` — deve passar.
>
> ### FASE 3 — Build reprodutível
> 1. `bun install --frozen-lockfile` (falha se lockfile inconsistente — regenere se necessário e comite).
> 2. `bun run build` — corrija erros de tipo/import bloqueantes. Warnings podem ficar.
> 3. `bun run preview` local: `curl -I http://localhost:4173/healthz` (se não existir rota `/healthz`, adicione uma rota estática que retorna 200 texto "ok" — necessária para healthcheck do Docker).
>
> ### FASE 4 — Docker & CI verificação
> 1. Verifique que existem: `Dockerfile`, `docker-compose.yml`, `infra/nginx/{app.conf,edge.conf}`, `infra/scripts/{deploy.sh,rollback.sh}`, `.github/workflows/deploy.yml`. Se algum estiver faltando, crie conforme `DEPLOY.md` e `PROMPT_CODEX_VPS.md` do repo.
> 2. Ajuste `.github/workflows/deploy.yml` para:
>    - Trigger em `push` na branch `main`
>    - `docker/build-push-action` com build-args `VITE_SUPABASE_*`
>    - Push para `ghcr.io/${{ github.repository }}:latest` e `:${{ github.sha }}`
>    - Step final `curl -X POST https://$DOMINIO_PRINCIPAL/__deploy` com header HMAC `X-Hub-Signature-256` usando `secrets.WEBHOOK_SECRET`
> 3. Rode `docker build .` local — deve concluir.
>
> ### FASE 5 — Commit & push
> ```bash
> git checkout -b chore/stabilization
> git add -A
> git commit -m "chore: estabilização (lockfiles, env, logger, testes, healthz, docker)"
> git checkout main && git merge --no-ff chore/stabilization
> git push origin main
> ```
> Depois configure os secrets:
> ```bash
> gh secret set VPS_HOST -b"$VPS_IP"
> gh secret set VPS_USER -b"$VPS_USER"
> gh secret set VPS_SSH_KEY < ~/.ssh/id_ed25519
> gh secret set WEBHOOK_SECRET -b"$WEBHOOK_SECRET"
> gh secret set GHCR_TOKEN -b"$GHCR_TOKEN"
> gh secret set VITE_SUPABASE_URL -b"$VITE_SUPABASE_URL"
> gh secret set VITE_SUPABASE_PUBLISHABLE_KEY -b"$VITE_SUPABASE_PUBLISHABLE_KEY"
> gh secret set VITE_SUPABASE_PROJECT_ID -b"$VITE_SUPABASE_PROJECT_ID"
> ```
>
> ### FASE 6 — Provisionamento da VPS
> SSH em `$VPS_USER@$VPS_IP` e execute:
> ```bash
> apt update && apt upgrade -y
> apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx \
>                ufw fail2ban jq curl git python3
> systemctl enable --now docker nginx fail2ban
> ufw allow 22,80,443/tcp && ufw --force enable
> echo "$GHCR_TOKEN" | docker login ghcr.io -u $GITHUB_OWNER --password-stdin
> mkdir -p /opt/app /var/www/certbot
> cd /opt/app
> ```
> Copie do repo para `/opt/app/`: `docker-compose.yml`, `infra/nginx/edge.conf` → `/etc/nginx/conf.d/edge.conf`, `infra/scripts/deploy.sh`, `infra/scripts/rollback.sh`.
>
> Substitua `OWNER/REPO` no `docker-compose.yml` por `$GITHUB_OWNER/$GITHUB_REPO`.
>
> Emita SSL:
> ```bash
> certbot certonly --webroot -w /var/www/certbot --email $EMAIL_CERTBOT \
>   --agree-tos --no-eff-email $(printf -- '-d %s ' $DOMINIOS_TODOS)
> nginx -t && systemctl reload nginx
> (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
> ```
>
> Deploy inicial:
> ```bash
> IMAGE=ghcr.io/$GITHUB_OWNER/$GITHUB_REPO:latest docker compose pull
> docker compose up -d app_blue
> sleep 10 && curl -f http://127.0.0.1:8081/healthz
> ```
>
> ### FASE 7 — Webhook auto-deploy
> Crie `/opt/app/webhook.py` (Python stdlib, HMAC SHA-256, executa `deploy.sh` em background, responde 202).
> Crie unit `/etc/systemd/system/lovable-webhook.service` com `Environment=WEBHOOK_SECRET=...`. `systemctl enable --now lovable-webhook`.
> Adicione no `edge.conf` um `location /__deploy { proxy_pass http://127.0.0.1:9000; }` e `nginx -s reload`.
>
> Crie `/opt/app/add-domain.sh <dominio> [www.dominio]` que:
> - Adiciona domínio nos dois `server_name` do `edge.conf`
> - Roda `certbot --nginx -d ...`
> - `nginx -s reload`
> Torne executável.
>
> ### FASE 8 — Validação end-to-end
> 1. No repo local: `echo "deploy test $(date)" >> CHANGELOG.md && git commit -am "test: deploy" && git push`
> 2. `gh run watch` — Actions deve terminar verde
> 3. Na VPS: `docker ps` mostra novo container no slot alternativo, depois swap
> 4. `curl -I https://$DOMINIO_PRINCIPAL` → HTTP/2 200
> 5. Abra o site em navegador anônimo — deve carregar
>
> ### FASE 9 — Apontamento no Master Admin
> No painel Lovable → **Master Admin → Servidores** cadastre:
> - Host: `$VPS_IP` | Domínio: `$DOMINIO_PRINCIPAL` | Webhook: `https://$DOMINIO_PRINCIPAL/__deploy`
> - Marcar como servidor **ativo de produção**
>
> ### ENTREGA FINAL — imprima ao terminar:
> 1. Resumo do que foi alterado no repo (arquivos criados/editados/removidos)
> 2. URL de produção funcionando
> 3. Status dos containers (`docker ps`)
> 4. Comandos úteis:
>    - Nova loja/domínio: `/opt/app/add-domain.sh novodominio.com www.novodominio.com`
>    - Rollback: `/opt/app/rollback.sh` ou `bash infra/scripts/rollback.sh`
>    - Logs: `docker logs -f app_blue|app_green`, `journalctl -u lovable-webhook -f`, `/var/log/nginx/{access,error}.log`
> 5. Pendências deixadas como TODO (componentes gigantes não refatorados, placeholders "Em breve")
>
> **Regras invioláveis:** não delete funcionalidade; não reescreva histórico do git; não exponha service_role key; se `bun run build` falhar, corrija até passar antes de dar `git push`.

---

## 🔁 Depois disso

Cada `git push` no `main` (feito automaticamente pelo Lovable a cada edição
sua no chat) dispara Actions → GHCR → webhook VPS → blue/green swap → produção
atualizada em ~2 minutos, zero downtime.
