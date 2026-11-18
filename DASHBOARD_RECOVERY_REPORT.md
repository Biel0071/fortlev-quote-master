# Relatório de recuperação do painel

**Estado: proteções locais aplicadas; métricas reais dependem do banco.**

- Métricas de tracking mostram erro/estado indisponível quando a consulta falha; pedidos e receita usam `—` quando não há ID de loja ou a consulta falha, evitando apresentar falha como zero.
- Gráficos de dispositivo e funil mostram mensagem explícita quando os dados do banco falham. O cartão de eventos também informa indisponibilidade.
- O ID de fallback inválido deixa de ser enviado pelo contexto como `store_id`.
- Build e preview local confirmam o botão verde **Publicar** no cabeçalho; em `localhost`/`127.0.0.1` aparece para teste local e fora desses hosts exige `isAdmin`. A rota da captura usa UUID inválido (`f5e69cd7-e-b465-4024-9b99-d388262b08fa`), por isso o painel informa que a loja não foi identificada e usa traços nas métricas. O botão não substitui sessão, credenciais nem configuração do backend publicador.
- Uma aba antiga do navegador ficou em estado de erro após atualizações HMR; uma aba nova em `localhost:8080` carregou o painel atual com Publicar visível. Recarregar a aba antiga limpa esse estado obsoleto.
- A seleção de lojas deixou de preencher cartões com lojas de exemplo quando o banco falha; agora informa indisponibilidade e oferece nova tentativa.
- O cabeçalho e o seletor de lojas não usam mais três opções estáticas quando a consulta não retorna lojas. O nome do tenant inválido aparece como “Loja não identificada”; a lista diferencia carregamento, falha de banco/permissão e resultado vazio, com retry para falhas.
- Verificação visual após reload em `localhost:8080`: a rota inválida exibe “Loja não identificada”, o seletor exibe “Banco indisponível”, a consulta expirou com mensagem explícita e retry, os seis contadores ficam em `—` e nenhum produto demonstrativo aparece.
- Na tela Produtos, o contador distingue ausência de imagem e falha de leitura; a ação de nova busca seleciona apenas linhas `no_image_found`, escreve somente `status=import_pending` e preserva o `active` original. O texto não afirma mais que falta de imagem desativou produtos.
- A Home e o catálogo não mostram mais categorias/banners promocionais estáticos como conteúdo real; falha de consulta de categorias e conteúdo aparece separadamente.
- A API do painel não foi exercitada contra uma sessão válida: a conexão configurada ao Supabase não resolve.

**Verificação local (2026-11-13):** `npx tsc --noEmit` passou; `npm run test:catalog` passou, 20/20; `npm run build` passou (5.362 módulos); `git diff --check` passou. ESLint de `AdminProductsList` segue falhando em regras `any`/estilo legado e um aviso de dependências do hook; o novo helper isolado e `StoreSwitcher` não têm erros. O backend de publicação não foi autenticado.
