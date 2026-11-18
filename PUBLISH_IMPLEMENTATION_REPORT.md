# Relatório de implementação: Publicar

## Implementado localmente

- Controle verde no cabeçalho do admin, visível apenas para administradores, com prévia do SHA, arquivos alterados, estado do domínio, confirmação e distinção entre conteúdo salvo no banco e código em `main`.
- Interface consulta a API same-origin autenticada pela sessão Supabase, acompanha execuções reais do Actions a cada 4 segundos, mostra jobs/etapas, histórico, link do GitHub e ZIP de logs após a conclusão. Nenhuma credencial GitHub vai ao navegador.
- Confirmação explícita mostra commit de `main`, arquivos alterados, verificações e domínio antes de enviar o dispatch; cancelar não inicia workflow.
- Fênix API Platform estendida em clone local do código existente, com validação server-side de admin, GitHub App para um repositório/workflow/branch fixos, idempotência, bloqueio Redis, registros em `activity_logs`, status/histórico e logs.
- Workflow mantém deploy automático por push em `main` e adiciona workflow dispatch, concorrência sem cancelamento, lint bloqueante, testes de catálogo, TypeScript/build, pré-verificação da VPS, SHA embutido na imagem, verificação HTTPS e rollback de aplicação.
- A rota é registrada sob o grupo administrativo da Fênix API, validada adicionalmente com a sessão e papel admin da loja, encaminhada pelo host da loja e usa credencial privada server-side para `activity_logs`.
- Os arquivos solicitados de auditoria, arquitetura e resultados acompanham este relatório.

## Estado de entrega

O código está apenas em árvores locais. Não houve commit, push, alteração de segredo, configuração na VPS, mudança de DNS ou deploy. A loja tem outras alterações locais preexistentes, preservadas. A API Platform tem seu próprio clone/branch local para esta implementação.

O botão permanece bloqueado até a publicação do backend e a correção da infraestrutura. A evidência consultada em 13/11/2026 está em `PUBLISH_SYSTEM_AUDIT.md`: DNS aponta a outro host; `/opt/app`, containers da loja, Nginx da VPS e certificado esperado não existem; a rota proxy atual serve HTML e `/deploy-version.json` retorna 404; as credenciais da GitHub App não estão configuradas.

## Ação operacional necessária

Para ativar de ponta a ponta, disponibilizar os commits da loja e da API Platform nos repositórios/branches de deploy, provisionar a aplicação/blue-green e TLS na VPS, apontar o domínio, configurar a rota proxy e inserir as variáveis privadas da GitHub App e Supabase no ambiente seguro do serviço. Depois disso, o próprio botão poderá verificar o Actions e o site. Nenhuma publicação real foi iniciada nesta implementação.
