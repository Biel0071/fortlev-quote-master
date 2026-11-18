# MIGRATION_CERTIFICATION

**Status: NÃO CERTIFICADA. A migração não foi executada.**

| Item | Estado | Evidência |
|---|---|---|
| Origem | Lovable Cloud `flkionbmkuqgkudjjuqk` | `supabase/config.toml` |
| Destino | VPS existente, escolhido; **não instalado** | documentação em `infra/supabase/README.md`; disco com apenas ~5,2 GB livres |
| Auditoria do repositório (Fase 1) | Concluída | 141 tabelas, 125 migrations, 347 policies, 52 triggers, 37 functions, 7 buckets referenciados |
| Backup do banco/auth/storage (Fase 2) | **Não executado** | sem acesso: `pg_dump` e service_role do projeto antigo; o servidor antigo está inacessível daqui |
| Restauração (Fase 3) | **Não executada** | depende de destino e backup |
| Fotos reais (Fase 4) | **Não recuperadas** | nenhuma foto foi baixada; nenhuma imagem foi gerada |
| Desacoplamento (Fase 5) | Parcial, local | Edge Functions de IA usam gateway configurável; sem deploy/teste remoto; `supabase/config.toml` usa identificador neutro |
| Ferramentas (Fase 6) | Criadas, **não executadas** | `scripts/`, `tests/`, `docs/`, `.env.example` |
| Testes (Fase 7) | Parcial, local | testes focados do catálogo e gateway adicionados; sem teste integrado contra destino |

## Pendências (ação do dono do projeto)
1. Ampliar armazenamento/avaliar recursos da VPS e provisionar stack Supabase self-hosted.
2. Recuperar acesso DNS/credenciais da origem ou uma exportação privada para recuperar dados operacionais.
3. Configurar `AI_GATEWAY_URL` e `AI_GATEWAY_API_KEY` no host e validar modelos reais.

Este arquivo só será atualizado para "CERTIFICADA" com contagens antes/depois, hashes e testes reais.
