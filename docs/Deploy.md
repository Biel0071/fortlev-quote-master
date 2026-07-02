# Deploy Guide — Multi-Tenant VPS (Blue/Green)

## Arquitetura

```
Cloudflare (DNS + WAF)
        │
        ▼
Nginx edge (VPS host)  ← preserva Host: header
        │  upstream app_blue OR app_green
   ┌────┴─────┐
   ▼          ▼
app_blue   app_green      ← containers Docker (mesma imagem, mesmo backend)
:8081       :8082
```

Todos os domínios (`mfatacadista.com`, `materialdecontrucao.online`, futuras lojas)
apontam para o **mesmo container**. O React lê `window.location.host` e resolve a
loja via `store_domains` no Supabase. Isso é o que torna o sistema multi-tenant.

## Setup inicial da VPS

```bash
# Ubuntu 22.04+
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker nginx

# App dir
sudo mkdir -p /opt/app && cd /opt/app
# copie: docker-compose.yml, infra/scripts/deploy.sh, rollback.sh
sudo chmod +x deploy.sh rollback.sh

# Edge Nginx
sudo cp infra/nginx/edge.conf /etc/nginx/conf.d/edge.conf
sudo nginx -t && sudo systemctl reload nginx

# SSL (repita por domínio ou use --expand)
sudo certbot --nginx -d mfatacadista.com -d www.mfatacadista.com \
                     -d materialdecontrucao.online -d www.materialdecontrucao.online
```

## Secrets do GitHub Actions

Em **Repo → Settings → Secrets and variables → Actions**:

| Secret                          | Valor                                                     |
| ------------------------------- | --------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | do `.env`                                                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | do `.env`                                                 |
| `VITE_SUPABASE_PROJECT_ID`      | do `.env`                                                 |
| `VPS_HOST`                      | IP público da VPS                                         |
| `VPS_USER`                      | usuário SSH (ex: `deploy`)                                |
| `VPS_SSH_KEY`                   | chave privada SSH (o público vai em `~/.ssh/authorized_keys` do usuário) |

## Deploy

Push em `main` → GitHub Actions:
1. Lint + tsc + build
2. Docker build & push para `ghcr.io`
3. SSH na VPS → `deploy.sh` faz blue/green:
   - sobe slot idle com nova imagem
   - health check `/healthz`
   - troca upstream do Nginx
   - se falhar → mantém slot atual

## Rollback (1 comando)

```bash
sudo /opt/app/rollback.sh
```

Volta o upstream do Nginx para o container anterior (que continua rodando).

## Adicionar nova loja / domínio

1. **DNS (Cloudflare):** A `@` e A `www` → IP da VPS
2. **SSL:** `sudo certbot --nginx -d novaloja.com -d www.novaloja.com`
3. **Nginx:** adicione o domínio na diretiva `server_name` de `edge.conf`, `sudo nginx -t && sudo systemctl reload nginx`
4. **Admin:** em `/admin/master/domains` vincule `novaloja.com` a uma loja
5. Pronto — sem redeploy.
