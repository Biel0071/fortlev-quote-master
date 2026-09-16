# Fortlev Quote Master

Para criar um sistema no Lovable (que utiliza IA para gerar aplicações completas), o prompt precisa ser técnico, estruturado e detalhado. Ele deve instruir a IA a criar tanto a interface de usuário (UI) quanto a lógica de negócio (geração de PDF e integração com WhatsApp).
Aqui está um prompt otimizado para você copiar e colar no Lovable:
Prompt para o Lovable
"Crie uma aplicação web profissional e responsiva para Geração de Orçamentos de Caixas d'Água Fortlev. O design deve ser limpo, utilizando as cores da marca Fortlev (Azul Marinho, Amarelo e Branco).
Funcionalidades Principais:
 * Catálogo de Produtos: Adicione um banco de dados interno ou seletor contendo todos os modelos de 'Caixa d'Água de Polietileno' vistos na imagem (100L, 150L, 250L, 310L, 500L, 750L, 1.000L, 1.500L, 2.000L, 3.000L, 5.000L, 7.500L, 10.000L, 15.000L e 20.000L).
 * Formulário de Orçamento:
   * Dados do Cliente: Nome, Telefone/WhatsApp, Endereço de Entrega.
   * Seleção de Itens: Dropdown para escolher a caixa, campo de quantidade e campo de preço unitário (editável).
   * Cálculo automático de subtotal e total.
 * Geração de Documento Formal (PDF):
   * O sistema deve gerar um PDF formatado como papel timbrado.
   * Deve conter o Logotipo da Fortlev no topo e uma Marca d'Água suave no fundo do documento.
   * Tabela organizada com descrição do produto, litragem, quantidade, valor unitário e valor total.
   * Campo para 'Validade do Orçamento' e 'Observações'.
 * Integração WhatsApp:
   * Botão 'Enviar Orçamento via WhatsApp'. Ao clicar, o sistema deve converter o orçamento em uma mensagem de texto formatada e abrir o link do WhatsApp (api.whatsapp.com/send?phone=...) para o número do cliente.
   * Se possível, incluir o link do PDF gerado ou instrução para anexar o arquivo.
Interface (UI/UX):
 * Use componentes do shadcn/ui para uma aparência moderna.
 * Crie um Dashboard simples onde eu possa ver os orçamentos emitidos.
 * O fluxo de criação deve ser rápido: Selecionar Produto -> Inserir Preço -> Gerar PDF -> Enviar."
Dicas para Refinar o Sistema no Lovable:
 * Logotipo e Marca d'Água: Após o Lovable criar a estrutura, ele perguntará sobre imagens. Você deve fazer o upload do logotipo oficial da Fortlev para que ele seja inserido no PDF.
 * Preços: Como os preços variam por região e fornecedor, peça ao Lovable para deixar o campo de preço vazio para você preencher manualmente no momento da venda, ou peça para ele criar uma aba de "Configurações de Preços" para deixar valores pré-salvos.
 * Envio do PDF: O Lovable geralmente usa bibliotecas como jsPDF ou react-pdf. Se você quiser que o PDF vá direto pelo WhatsApp, a maneira mais simples é gerar o PDF, baixá-lo e o sistema abrir o chat do cliente para você anexar.
Deseja que eu escreva também a lista detalhada de especificações técnicas (medidas e alturas) de cada caixa para você alimentar o sistema?

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fortlev-quote-wiz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b71066f5-63de-4881-94bf-43af94d65b61).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `MFATACA` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
