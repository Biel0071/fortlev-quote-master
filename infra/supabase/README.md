# Supabase self-hosted na VPS

Esta stack é independente do `docker-compose.yml` da aplicação. Não exponha Postgres/Analytics/Studio diretamente à Internet. Publique somente o gateway HTTPS da API por meio do proxy já administrado na VPS e mantenha volumes persistentes e backups fora do diretório da aplicação.

## Pré-requisitos e bloqueio atual

A documentação oficial exige ao menos 4 GB de RAM e 40 GB SSD para a stack Docker, com 8 GB RAM e 80 GB SSD recomendados. A VPS inspecionada em 2026-11-13 tinha cerca de 5,2 GB livres no disco raiz e serviços ativos. Portanto, **não instalar ainda**: aumente o disco, verifique memória/CPU e planeje retenção de imagens e backups sem limpar recursos ativos.

Consulte o [guia oficial do Supabase Docker](https://supabase.com/docs/guides/self-hosting/docker) e a [configuração HTTPS](https://supabase.com/docs/guides/self-hosting/https). Fixe explicitamente uma release estável do repositório `supabase/supabase` ao preparar o host; registre a versão e atualize-a por mudança revisada, com backup e rollback.

## Sequência de implantação (após liberar recursos)

1. Use o diretório de implantação oficial do Supabase Docker em um diretório próprio (por exemplo `/opt/supabase`), separado de `/opt/app`.
2. Gere segredos fortes com o utilitário oficial, guarde `.env` somente no host com permissões restritas, configure URLs públicas para o domínio da loja/API e valide as chaves anon/service role. Não copie valores de exemplo para produção.
3. Mantenha a porta Postgres acessível apenas em localhost/rede Docker privada. No proxy existente, roteie `api.<domínio>` para Kong/API e aplique TLS, limites e cabeçalhos encaminhados. Não altere o proxy ativo sem validação e rollback.
4. Configure Auth redirect URLs, SMTP se necessário, Storage, Edge Runtime e pools de conexão. Confirme as funções requeridas pelo projeto contra a versão selecionada.
5. Aplique as migrations do repositório na ordem e inspecione operações destrutivas antes de executar. Faça backup vazio inicial e teste restore.
6. Recupere a origem usando `docs/INFRASTRUCTURE.md`. Sem origem, importe o catálogo local de maneira idempotente depois de conferir o schema, tenant e políticas RLS.
7. Configure Edge Function secrets no ambiente de funções, incluindo `AI_GATEWAY_URL` e `AI_GATEWAY_API_KEY`, e modelos adequados para texto e visão. Valide geração de imagem separadamente.
8. Configure os secrets públicos de build e acesso SSH estritamente necessários no GitHub. Faça deploy, valide o site e só então altere DNS/tráfego.

## Operação

Atualize imagens Supabase com janela de manutenção e compatibilidade de migrations. Monitore espaço de volumes, logs, banco e gateway. Faça backups consistentes de Postgres e Storage para armazenamento privado, pratique restauração e documente rollback. A stack self-hosted exige manutenção própria e não inclui todos os recursos do serviço gerenciado.
