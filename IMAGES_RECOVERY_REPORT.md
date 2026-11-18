# Relatório de recuperação de imagens

**Estado: imagens remotas não recuperadas.**

- As três imagens de areia usadas anteriormente como fallback foram removidas por não haver prova de que pertencem aos produtos do depósito; nenhum fallback visual é tratado como imagem real.
- Há 73 arquivos raster na pasta `public`, mas a contagem inclui recursos de interface e não estabelece vínculo confiável com produtos.
- A planilha local de 1.692 itens contém URLs para páginas de produto CNR, não URLs diretas de imagem, e zero imagens incorporadas. Não prova fotos originais nem vínculos com produtos da loja.
- O scraper `search-product-images` e o vínculo `store_product_images` existem no código; dependem do Supabase/Storage funcional. A busca/importação em lote não foi executada.
- Nenhuma imagem genérica foi atribuída como foto real de produto e nenhum produto foi desativado por falta de foto.
- Não foram encontrados containers Supabase ativos nem backups Storage relacionados à loja nos diretórios examinados da VPS.
- Uma busca ampliada encontrou `C:\Users\Dell\Downloads\public_html.zip` (cópia WordPress de 718 MB) com 3.272 arquivos de imagem em `wp-content/uploads` e 492 nomes únicos. O ZIP não contém dump SQL/export do banco; a identidade do site não foi confirmada. Há banners e logomarca nomeados como “Hidráulica Passos”, então a mídia não pode ser atribuída com segurança ao Depósito Mais.
- Foram localizados nomes candidatos para caixas d'água (Tigre 1000 L e galeria Fortlev 1000 L). Inspeção visual da amostra Fortlev mostrou uma peça/tampa em baixa resolução (140×140); a amostra Tigre mostra produto de outra marca. Nenhuma corresponde com segurança à foto principal do item Fortlev cadastrada localmente. Não foram vinculadas nem copiadas para o catálogo.
- Dois outros possíveis “backups” locais foram descartados por proveniência: os JSON grandes têm estrutura de backup de outro aplicativo; `1772742986665-system_export_05-03-2026.zip` identifica “Casa Delivery” e contém sessões/pedidos desse serviço, não dados da loja.

**Para concluir:** restaurar acesso ao banco/Storage, inventariar imagens já vinculadas e então executar busca com aprovação das correspondências ambíguas.
