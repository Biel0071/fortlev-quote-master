# Deploy VPS — Multi-Loja (resumo executivo)

Sistema pronto para rodar **N lojas em 1 única VPS** via Docker + Nginx edge + blue/green.
Todo o roteamento multi-tenant é feito pelo header `Host` (a app resolve loja pela tabela `store_domains`).

## 1. Pré-requisitos na VPS (uma única vez)

```bash
# Docker + Compose + Nginx + Certbot
apt update && apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
systemctl enable --now docker nginx

# Login no GHCR (registry do GitHub) para puxar a imagem
echo $GHCR_TOKEN | docker login ghcr.io -u <SEU_USER> --password-stdin

# Certificados SSL (um por domínio ou multi-SAN)
certbot --nginx -d mfatacadista.com -d www.mfatacadista.com \
                -d materialdecontrucao.online -d www.materialdecontrucao.online
```

## 2. Deploy inicial

```bash
mkdir -p /opt/app && cd /opt/app
# copiar docker-compose.yml, infra/nginx/edge.conf, infra/scripts/* para cá
cp infra/nginx/edge.conf /etc/nginx/conf.d/edge.conf
nginx -t && systemctl reload nginx

export IMAGE=ghcr.io/<OWNER>/<REPO>:latest
docker compose pull && docker compose up -d app_blue
```

Edge Nginx aponta para `127.0.0.1:8081` (blue). Pronto.

## 3. Deploy contínuo (blue/green automático)

Push na branch `main` → GitHub Actions (`.github/workflows/deploy.yml`) builda a imagem, envia p/ GHCR e chama `infra/scripts/deploy.sh` via SSH, que:

1. Faz `docker compose pull` da nova imagem
2. Sobe o slot ocioso (green) e aguarda `/healthz`
3. Reescreve `upstream` no `edge.conf` → `nginx -s reload`
4. Derruba o slot antigo

Rollback: `bash infra/scripts/rollback.sh`

## 4. Adicionar uma nova loja (nova VPS ou mesmo servidor)

**Mesmo servidor (recomendado até ~50 lojas):**

1. Apontar DNS do novo domínio → IP da VPS
2. Editar `/etc/nginx/conf.d/edge.conf`: incluir domínio nas 2 diretivas `server_name`
3. `certbot --nginx -d novodominio.com -d www.novodominio.com`
4. `nginx -s reload`
5. No painel Master Admin → **Domínios** → cadastrar `novodominio.com` vinculado à loja

Nenhum rebuild de imagem é necessário — o app já resolve tenant por Host header.

**Nova VPS (isolamento):** repita seções 1–3 com um servidor novo e aponte o DNS.

## 5. Secrets necessários no GitHub

`Repo → Settings → Secrets → Actions`:

| Nome | Uso |
|---|---|
| `VPS_HOST` | IP/host da VPS |
| `VPS_USER` | usuário SSH |
| `VPS_SSH_KEY` | chave privada |
| `VITE_SUPABASE_URL` | build-time |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | build-time |
| `VITE_SUPABASE_PROJECT_ID` | build-time |

## 6. Commit & push (via Lovable)

O código deste projeto é sincronizado automaticamente com o GitHub conectado a cada mudança feita no Lovable — **não é preciso rodar `git add/commit/push` manualmente**.

Se ainda não conectou o repositório: **Menu (+) no chat → GitHub → Connect project**.
A partir daí, cada edição gera um commit e dispara o workflow de deploy.
