# Arquitetura Multi-Tenant

## Camadas

| Camada         | Stack                                        |
| -------------- | -------------------------------------------- |
| Frontend       | React 18 + Vite + TS + Tailwind + shadcn/ui  |
| Backend        | Supabase (Postgres + Edge Functions + Auth + Storage + Realtime) |
| Infra          | VPS Ubuntu + Docker + Nginx + Cloudflare + Let's Encrypt |
| CI/CD          | GitHub Actions + GHCR + SSH Blue/Green       |

## Multi-Tenant (isolamento por `store_id`)

- `stores`, `store_domains`, `store_settings`, `store_themes`, `store_permissions`,
  `store_plans`, `store_modules`, `tenants`, `user_store_access`
- Todo dado transacional carrega `store_id`
- RLS obrigatório em toda tabela `public.*`
- `TenantProvider` (`src/providers/TenantProvider.tsx`) resolve a loja pelo `window.location.host`
  consultando `store_domains`
- Nginx edge **preserva o Host header** → o mesmo container serve N domínios

## Fluxo de request

```
Browser → Cloudflare → Nginx (443, preserva Host)
       → app_blue|green (Nginx SPA) → index.html + JS
       → JS lê location.host → SELECT store_id FROM store_domains WHERE domain=?
       → todas as queries usam store_id
```

## Master Admin

`/admin/master` — controla todas as lojas: Dashboard, Lojas, Planos SaaS,
Financeiro, Blueprints, Módulos, IA, White Label, Domínios, Logs.

## Segurança

- RLS por `store_id` + `has_role()` security definer
- Admin allowlist (`admin_allowlist`)
- Rate limit em endpoints públicos (`check_rate_limit`)
- Fingerprint em tokens de orçamento
- Cloudflare WAF + Fail2Ban recomendados na VPS
