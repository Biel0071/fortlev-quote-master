# Infraestrutura e procedimentos

Repositório **público**: nunca versionar dados pessoais, senhas, service_role keys ou tokens.

## Estrutura
- `supabase/migrations` (125 arquivos), `supabase/functions` (37 Edge Functions): fonte oficial do schema e da lógica.
- `scripts/backup.mjs`, `restore.mjs`, `verify.mjs`: backup, restauração e comparação.
- `tests/connection.mjs`, `storage.mjs`, `images-integrity.mjs`: testes reais contra o Supabase configurado.
- `backups/`: saída dos scripts. O `.gitignore` bloqueia tudo que contém dados pessoais ou binários (database, auth, storage). Só `verification/manifest.json` e `verification/compare.json` podem ser versionados.

## Backup (origem)
1. Instale `pg_dump` e `psql` (PostgreSQL client).
2. Em `.env.local`: `SOURCE_DB_URL`, `SOURCE_SUPABASE_URL`, `SOURCE_SERVICE_ROLE_KEY`.
3. `node scripts/backup.mjs`. O manifesto sai em `backups/verification/manifest.json` (linhas por tabela, arquivos, tamanhos, SHA-256).
4. Guarde `backups/` completo em armazenamento **privado** (ex.: disco criptografado ou bucket privado), nunca no GitHub.

## Restauração (destino)
1. Crie o projeto Supabase novo. Em `.env.local`: `TARGET_DB_URL`, `TARGET_SUPABASE_URL`, `TARGET_SERVICE_ROLE_KEY`.
2. `supabase link --project-ref <ref>` e `supabase db push` (aplica as migrations).
3. `node scripts/restore.mjs --with-auth` (dados, usuários, buckets e arquivos com os mesmos caminhos; confere SHA-256).
4. `supabase functions deploy` e `supabase secrets set ...` (lista em `.env.example`).
5. `node scripts/verify.mjs`, depois `node tests/connection.mjs`, `node tests/storage.mjs`, `node tests/images-integrity.mjs`.
6. Troque `.env` (`VITE_*`) e `supabase/config.toml` (`project_id`) para o projeto novo e rode `npm run build`.

## Dependências conhecidas do Lovable Cloud
- `LOVABLE_API_KEY` em ~16 Edge Functions de IA: trocar por chave própria (exige alterar o código das functions).
- `.env` e `supabase/config.toml` apontam para `flkionbmkuqgkudjjuqk`.
- Referências a domínios/white-label "lovable" no admin e em `vite.config.ts`.

## Backup automático
Agende `node scripts/backup.mjs` em máquina/CI **privada** com os secrets em cofre. Uma Action no repositório público só pode rodar se gravar o resultado em destino privado.
