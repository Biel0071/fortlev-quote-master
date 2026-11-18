# Relatório de recuperação de produtos

**Estado: catálogo local preservado; reconciliação com o banco bloqueada.**

- O catálogo efetivo tem 172 itens locais: 120 registros diretos em `constructionProducts.ts` e 52 itens hidráulicos expandidos de `hydraulicProducts.ts`. Os primeiros são comentados como extraídos de planilha; os preços hidráulicos incluem valores fixos e referências de mercado com desconto. As fontes não provam que todos correspondam ao cadastro atual nem que preços/estoque estejam vigentes.
- O catálogo hidráulico tem outra fonte local (`hydraulicProducts.ts`); nenhuma linha foi inserida ou sobrescrita no banco durante esta auditoria.
- Um arquivo homônimo encontrado em dois checkouts antigos tem hash idêntico e foi adicionado ao Git em 2026-03-13. Contém 1.692 linhas de scraping CNR, com SKU `SCRP-*`, categorias, marca, medidas, unidade, preços de mercado/loja e URL de página CNR. Não tem células obrigatórias vazias nem SKUs duplicados, mas não contém IDs, estoque, status, descrições do depósito ou imagens embutidas. Uma comparação textual simples encontrou 26 nomes aproximados (similaridade ≥0,65) entre 164 nomes locais que puderam ser extraídos automaticamente e nenhum nome exato. Isso é um catálogo de referência raspado, não uma exportação do banco do Depósito Mais.
- Os preços da planilha são referências raspadas/calculadas sem data de coleta confirmada; não foram tratados como preços reais atuais.
- Busca local adicional não achou exportação de produtos do Depósito Mais. O ZIP `public_html.zip` é um site WordPress com mídia, sem dump de banco; o arquivo de exportação de sistema encontrado identifica outra loja (“Casa Delivery”); backups JSON grandes também são de outro aplicativo. Foram excluídos por proveniência e nenhum item foi importado.
- O hook do catálogo agora só exibe registros confirmados no banco. Resposta vazia continua vazia; falha de conexão/permissão mostra erro e não fabrica itens/preços a partir dos 172 registros locais não verificados.
- O fallback de seis categorias ilustrativas e o banner promocional Fortlev foram removidos do caminho de exibição quando não há resposta confirmada; caches antigos dessas listas foram invalidados por troca de versão da chave.
- Checkout valida novamente cada item contra o catálogo remoto e bloqueia criação de pedido quando há erro, carregamento incompleto ou produto antigo no carrinho.
- Não foi possível comparar SKU, descrição, preço, unidade, disponibilidade ou histórico de pedidos com a origem remota.

**Importação idempotente não executada:** falta conexão, ID real da loja, verificação de schema/RLS e validação comercial dos preços. Não usar este arquivo como tabela de preços confirmada.
