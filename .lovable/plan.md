# Canos, varas e conexões + criação de itens melhorada

## 1. Itens pedidos (preço fixo informado)
Adicionar ao catálogo de Construção (categoria Hidráulica):
- Vara de Cano 100mm — R$ 52,60 (barra)
- Vara de Cano 50mm — R$ 35,22 (barra)
- Joelho 100mm — R$ 8,50 (peça)

## 2. Lista completa de canos, varas e conexões (preço médio de mercado -20%)
Usar preço médio de mercado (Tigre/Amanco/Krona, 2026) de cada medida e aplicar 20% de desconto. Medidas:
- Cano/Vara esgoto (6m): 40, 50, 75, 100, 150 mm
- Cano soldável água fria (6m): 20, 25, 32, 40, 50, 60 mm
- Cano CPVC água quente (3m): 15, 22, 28 mm
- Conexões esgoto: joelho 90°/45°, tê, junção, luva, cap, redução (40–100 mm)
- Conexões soldáveis: joelho, tê, luva, adaptador, registro esfera (20–50 mm)
- Cola PVC 175g e 850g, fita veda-rosca

Exemplo de cálculo: mercado R$ 75,00 → catálogo R$ 60,00. Itens já existentes com a mesma medida serão atualizados em vez de duplicados.

## 3. Publicar na loja
Inserir os mesmos itens no catálogo online de Construção (para aparecerem em todos os aparelhos) e como produtos ativos da loja materialdecontrucao.online.

## 4. Melhorar "Adicionar item novo"
- Preenchimento automático de categoria e unidade ao digitar o nome (ex.: "Joelho 100" → Hidráulica / Peça).
- Campo "Medida" (mm, polegadas, metros) incorporado ao nome.
- Campo "Preço de mercado" com opção "aplicar desconto %" (padrão 20%) que calcula o preço final.
- Aviso de item parecido já existente antes de criar.
- Opção "Publicar também na loja" (cria produto ativo na loja atual com nome, preço e unidade).
- Criar vários tamanhos de uma vez (ex.: 40, 50, 75, 100 mm com preços por linha).

## Detalhes técnicos
- `src/modules/catalog/data/constructionProducts.ts`: novos itens hidráulica.
- Inserção em `construction_catalog_products` e `store_products` (store_id da loja Material) via ferramenta de dados.
- `AddCustomConstructionProductDialog.tsx`: usa `detectCategory/detectUnit` de `productIntelligence.ts`, busca de similares, modo multi-medidas, checkbox publicar em `store_products`.
