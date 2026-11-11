# MIGRATION_CERTIFICATION

**Status: NÃO CERTIFICADA. A migração não foi executada.**

| Item | Estado | Evidência |
|---|---|---|
| Origem | Lovable Cloud `flkionbmkuqgkudjjuqk` | `supabase/config.toml` |
| Destino | **não definido** | falta projeto Supabase novo |
| Auditoria do repositório (Fase 1) | Concluída | 141 tabelas, 125 migrations, 347 policies, 52 triggers, 37 functions, 7 buckets referenciados |
| Backup do banco/auth/storage (Fase 2) | **Não executado** | sem acesso: `pg_dump` e service_role do projeto antigo; o servidor antigo está inacessível daqui |
| Restauração (Fase 3) | **Não executada** | depende de destino e backup |
| Fotos reais (Fase 4) | **Não recuperadas** | nenhuma foto foi baixada; nenhuma imagem foi gerada |
| Desacoplamento (Fase 5) | **Não feito** | `LOVABLE_API_KEY` e `project_id` antigos continuam |
| Ferramentas (Fase 6) | Criadas, **não executadas** | `scripts/`, `tests/`, `docs/`, `.env.example` |
| Testes (Fase 7) | **Não executados** | nenhum teste foi rodado |

## Pendências (ação do dono do projeto)
1. Projeto Supabase novo (URL, anon key, project ref).
2. Connection string do Postgres antigo e service_role key, só em `.env.local`.
3. Chave de IA própria para substituir `LOVABLE_API_KEY`.

Este arquivo só será atualizado para "CERTIFICADA" com contagens antes/depois, hashes e testes reais.
