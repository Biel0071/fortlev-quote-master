# Infraestrutura e migração

O repositório contém 125 migrations, Edge Functions, scripts de backup/restauração e catálogo local com 121 produtos. Não contém credenciais privadas nem uma exportação confirmada do Lovable Cloud. A migração continua não certificada.

## Estado atual

- Destino escolhido: Supabase self-hosted na VPS existente, separado dos containers da aplicação. Consulte [`infra/supabase/README.md`](../infra/supabase/README.md).
- A verificação atual da VPS encontrou apenas cerca de 5,2 GB livres no disco raiz, abaixo do mínimo operacional recomendado. Não instalar a stack nem remover imagens/volumes ativos até ampliar o armazenamento e reavaliar recursos.
- A origem antiga não resolveu por DNS durante a análise e não há credenciais privadas de origem disponíveis no projeto. Sem acesso ou exportação, pedidos, usuários, fotos e outros dados remotos não são recuperáveis.
- A loja usa os produtos locais como fallback quando a consulta remota retorna vazia. Esses 121 produtos ainda precisam ser importados ao banco de destino após a migração.
- O código das funções de IA agora usa o gateway configurável da VPS (`AI_GATEWAY_URL`, `AI_GATEWAY_API_KEY`), mas isso ainda não foi implantado nem validado contra modelos reais.

## Recuperar uma cópia da origem

Em máquina segura, instale `pg_dump`/`psql` e preencha `.env.local` (ignorado pelo Git) com `SOURCE_DB_URL`, `SOURCE_SUPABASE_URL` e `SOURCE_SERVICE_ROLE_KEY`. Execute `node scripts/backup.mjs` e guarde a pasta `backups/` em armazenamento privado criptografado. Nunca envie dumps ou credenciais ao GitHub.

Se a origem permanecer indisponível, prossiga com o catálogo versionado em `src/modules/catalog/data/constructionProducts.ts`; não declare recuperação de dados operacionais.

## Preparar o destino

1. Amplie disco (mínimo 40 GB livres dedicados à stack; recomendado VPS com 8 GB RAM e 80 GB SSD) e avalie o uso atual antes de instalar.
2. Siga `infra/supabase/README.md` para instalar uma versão Docker do Supabase fixada, manter portas de banco privadas e configurar proxy HTTPS em `api.<domínio-da-loja>`.
3. Aplique migrations, configure secrets das functions e migre dados/backups. Para um destino self-hosted, use conexão Postgres privada (`TARGET_DB_URL`) e endpoints/chaves privados do projeto; valide os scripts existentes antes de qualquer restauração.
4. Importe produtos por upsert idempotente, preservando preço/imagem remotos válidos quando recuperados, e compare contagens/hashes.
5. Configure no GitHub Actions somente `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VPS_HOST`, `VPS_USER` e `VPS_SSH_KEY`. Secrets de Postgres, service role e gateway ficam no host/secret store privado; nunca nos secrets de build do frontend.
6. Faça deploy controlado e valide catálogo, busca, produto, carrinho, checkout, admin, IA, backup e restauração antes de apontar tráfego.

## Backups

Agende backup em processo privado fora do build público. Guarde os arquivos e chaves de restauração fora do repositório e teste restaurações regularmente. As Actions de deploy publicam apenas a imagem da aplicação; o Supabase e seus dados têm ciclo de atualização e backup separado.
