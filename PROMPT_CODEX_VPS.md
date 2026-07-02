# PROMPT COMPLETO PARA CODEX — Setup VPS com Auto-Deploy do Lovable

Copie e cole o bloco abaixo no Codex (rodando com acesso SSH à sua VPS).
Ele configura tudo: Docker, Nginx edge multi-domínio, SSL, GHCR, blue/green,
webhook de auto-deploy e o admin da plataforma apontado para a VPS.

---

## 📋 CONTEXTO (preencha antes de rodar)

```
VPS_IP=          # ex: 203.0.113.10
VPS_USER=root
DOMINIOS="mfatacadista.com www.mfatacadista.com materialdecontrucao.online www.materialdecontrucao.online"
DOMINIO_PRINCIPAL=materialdecontrucao.online
EMAIL_CERTBOT=seu@email.com
GITHUB_OWNER=      # ex: joaosilva
GITHUB_REPO=       # ex: fortlev-quote-wiz
GHCR_TOKEN=        # Personal Access Token (classic) c/ escopos: read:packages, write:packages
VITE_SUPABASE_URL=https://flkionbmkuqgkudjjuqk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...      # anon key
VITE_SUPABASE_PROJECT_ID=flkionbmkuqgkudjjuqk
WEBHOOK_SECRET=    # gere: openssl rand -hex 32
```

---

## 🤖 PROMPT PARA COLAR NO CODEX

> Você é um engenheiro DevOps. Configure minha VPS Ubuntu 22.04 para hospedar
> uma aplicação multi-tenant (SaaS de lojas) desenvolvida no Lovable e
> sincronizada via GitHub. Cada `git push` no branch `main` deve gerar um novo
> deploy automático **sem intervenção manual**, com **blue/green** e rollback.
>
> **Arquitetura desejada:**
> - Docker + Docker Compose (blue/green nas portas 8081 e 8082)
> - Nginx edge (host) terminando SSL e roteando por `Host` header (multi-tenant)
> - Imagens armazenadas no GHCR (ghcr.io)
> - GitHub Actions faz `docker build/push` + chama webhook na VPS
> - Webhook receiver na VPS (systemd + Go/Python simples) valida HMAC e roda `deploy.sh`
> - Certificados via Let's Encrypt (certbot) com renovação automática
> - Todos os domínios servem o **mesmo container**; a app resolve tenant via `store_domains` no Supabase
>
> **Execute as tarefas em ordem, com verificação após cada passo:**
>
> ### 1. Bootstrap do servidor
> ```bash
> ssh $VPS_USER@$VPS_IP
> apt update && apt upgrade -y
> apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx \
>                ufw fail2ban jq curl git
> systemctl enable --now docker nginx fail2ban
> ufw allow 22,80,443/tcp && ufw --force enable
> ```
>
> ### 2. Login no GHCR
> ```bash
> echo "$GHCR_TOKEN" | docker login ghcr.io -u $GITHUB_OWNER --password-stdin
> ```
>
> ### 3. Estrutura de diretórios
> ```bash
> mkdir -p /opt/app /opt/app/nginx /var/www/certbot
> cd /opt/app
> ```
>
> ### 4. Crie `/opt/app/docker-compose.yml` (blue/green)
> ```yaml
> services:
>   app_blue:
>     image: ghcr.io/${GITHUB_OWNER}/${GITHUB_REPO}:latest
>     container_name: app_blue
>     restart: unless-stopped
>     ports: ["127.0.0.1:8081:80"]
>     healthcheck:
>       test: ["CMD","curl","-fsS","http://127.0.0.1/healthz"]
>       interval: 15s
>   app_green:
>     image: ghcr.io/${GITHUB_OWNER}/${GITHUB_REPO}:latest
>     container_name: app_green
>     restart: unless-stopped
>     ports: ["127.0.0.1:8082:80"]
>     healthcheck:
>       test: ["CMD","curl","-fsS","http://127.0.0.1/healthz"]
>       interval: 15s
> ```
>
> ### 5. Nginx edge em `/etc/nginx/conf.d/edge.conf`
> - upstream `app_upstream` apontando para `127.0.0.1:8081` (blue ativo)
> - server HTTP → 301 HTTPS
> - server HTTPS com `server_name $DOMINIOS`
> - `proxy_set_header Host $host` (essencial p/ multi-tenant)
> - certs em `/etc/letsencrypt/live/$DOMINIO_PRINCIPAL/`
>
> ### 6. Emitir SSL
> ```bash
> certbot certonly --webroot -w /var/www/certbot --email $EMAIL_CERTBOT \
>   --agree-tos --no-eff-email $(printf -- '-d %s ' $DOMINIOS)
> systemctl reload nginx
> ```
> Cron de renovação: `echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'" | crontab -`
>
> ### 7. Deploy inicial
> ```bash
> cd /opt/app
> IMAGE=ghcr.io/$GITHUB_OWNER/$GITHUB_REPO:latest docker compose pull
> docker compose up -d app_blue
> curl -f http://127.0.0.1:8081/healthz  # deve retornar 200
> ```
>
> ### 8. Script `/opt/app/deploy.sh` (blue/green + rollback)
> Lógica:
> 1. Detectar slot ativo lendo `upstream` no `edge.conf`
> 2. Slot ocioso = `blue` se ativo=green, senão `green`
> 3. `docker compose pull` e `docker compose up -d app_$OCIOSO`
> 4. Polling `/healthz` do slot ocioso (30 tentativas × 2s)
> 5. `sed -i` no `edge.conf` trocando `127.0.0.1:808X` e `nginx -s reload`
> 6. `docker compose stop app_$ATIVO`
> 7. Falha em qualquer passo → não trocar upstream (rollback implícito)
>
> Torne executável: `chmod +x /opt/app/deploy.sh`
>
> ### 9. Webhook receiver `/opt/app/webhook.py` (Python + HMAC)
> - Ouve em `127.0.0.1:9000/deploy`
> - Valida header `X-Hub-Signature-256` com `$WEBHOOK_SECRET`
> - Executa `/opt/app/deploy.sh` em background e retorna 202
>
> Systemd unit `/etc/systemd/system/lovable-webhook.service`:
> ```ini
> [Unit] Description=Lovable Deploy Webhook
> [Service]
> Environment=WEBHOOK_SECRET=$WEBHOOK_SECRET
> ExecStart=/usr/bin/python3 /opt/app/webhook.py
> Restart=always
> [Install] WantedBy=multi-user.target
> ```
> `systemctl enable --now lovable-webhook`
>
> Expor via nginx no mesmo edge (location `/__deploy` → `proxy_pass http://127.0.0.1:9000`) protegido por token.
>
> ### 10. Configurar secrets no GitHub
> Instrua-me a rodar (imprima exatamente estes comandos com `gh`):
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
> ### 11. Verifique se `.github/workflows/deploy.yml` já:
> - Faz build da imagem com os 3 `VITE_*` como build-args
> - Push para `ghcr.io/${{ github.repository }}:latest` e `:${{ github.sha }}`
> - Chama `curl -X POST https://$DOMINIO_PRINCIPAL/__deploy -H "X-Hub-Signature-256: ..."`
>
> Se algo estiver faltando, corrija o arquivo e comite via `gh` no meu nome.
>
> ### 12. Teste end-to-end
> 1. Faça uma alteração trivial no repo (ex: bump em `CHANGELOG.md`)
> 2. `git push origin main`
> 3. Acompanhe: `gh run watch` → deve terminar verde
> 4. Na VPS: `docker ps` → mostra novo container ativo
> 5. `curl -I https://$DOMINIO_PRINCIPAL` → 200 OK
>
> ### 13. Apontar Master Admin para VPS
> No painel do Lovable, em **Master Admin → Servidores**, cadastre:
> - Host: `$VPS_IP`
> - Domínio principal: `$DOMINIO_PRINCIPAL`
> - Webhook URL: `https://$DOMINIO_PRINCIPAL/__deploy`
> - Status: ativo
>
> **Ao final, me entregue:**
> - Um resumo do que ficou instalado
> - URL do site em produção
> - Comando para adicionar uma nova loja (novo domínio) sem rebuild
> - Comando de rollback manual
> - Localização de todos os logs (nginx, webhook, containers)

---

## 🔁 Fluxo final após setup

```
[Você edita no Lovable]
        ↓ (sync automático)
[GitHub main] 
        ↓ (Actions)
[Build → GHCR]
        ↓ (webhook HTTPS)
[VPS deploy.sh]
        ↓ (blue/green swap)
[Produção atualizada — zero downtime]
```

**Para criar uma nova loja daqui em diante:**
1. Você cria a loja pelo Master Admin no Lovable → grava em `stores` e `store_domains`
2. Aponta o DNS do novo domínio para o IP da VPS
3. Roda **um único comando** na VPS (ou pelo Master Admin → Domínios → "Provisionar SSL"):
   ```bash
   /opt/app/add-domain.sh novodominio.com www.novodominio.com
   ```
   (script inclui domínio no `edge.conf` + certbot + reload — o Codex deve criá-lo no passo 8)

Nenhum rebuild da imagem é necessário — a app resolve o tenant pelo `Host` header.
