# Google Play Store Studio & Editor em Tempo Real

Interface interativa com **Editor Administrativo Lateral** e visualização em tempo real da página oficial da Google Play Store (baseada fielmente no jogo *Sniper 3D: Jogos de tiro*).

---

## 🚀 Como Executar

O servidor local já está ativo e rodando:
- Acesse no seu navegador: **[http://127.0.0.1:5500](http://127.0.0.1:5500)**
- Caso deseje iniciar manualmente em outro momento:
  ```bash
  cd "C:\Users\Dell\.gemini\antigravity\scratch\google-play-clone"
  node server.js
  ```

---

## 🎛️ Painel do Editor Lateral (Admin)

O editor lateral fica posicionado à esquerda da tela e permite customizar **100% dos elementos da página** com atualização instantânea ao vivo (0ms de atraso):

### 1. 🎮 Informações Básicas
- **Título do Jogo / App**: Altere o nome principal do app.
- **Desenvolvedor / Estúdio**: Nome da produtora/empresa.
- **Subtítulo**: Mensagem de anúncios e compras no app.
- **Ícone / Logo do App**:
  - Botão **"Enviar Logo do PC"** para fazer upload de qualquer imagem do seu computador (PNG, JPG, SVG, WebP).
  - Ou campo para colar a URL direta de uma imagem.
- **Avaliação**: Nota (ex: `4,7`) e quantidade de avaliações (ex: `18,4 mi avaliações`).
- **Downloads**: Quantidade exibida (ex: `500 mi+`) e rótulo (`downloads`).

### 2. 🖼️ Banner Principal & Ações
- **Fundo do Banner Principal (Hero Key Art)**:
  - Botão **"Trocar Imagem do Banner"** para upload de arte personalizada do seu PC.
  - Ou campo para colar URL.
- **Botão Principal**: Texto customizável (ex: `Instalar no Windows`, `Comprar por R$ 39,99`, etc.).
- **Botão Secundário**: Texto customizável (ex: `Instalar em outros locais`).
- **Botão Trailer**: Texto do botão e **ID do YouTube** para o player do modal.
- **Aviso Legal / Termos**: Texto de rodapé do banner.

### 3. 📸 Galeria de Screenshots
- Lista todas as capturas do carrossel com miniatura.
- Botão **"+ Adicionar Nova Captura de Tela"** para enviar imagens do seu computador.
- Botão de lixeira 🗑️ para remover qualquer captura da lista.
- Carrossel interativo com botões de avançar/voltar e visualizador Lightbox ao clicar.

### 4. 📝 Sobre este Jogo & Categorias
- **Descrição Completa**: Texto da seção "Sobre este jogo" e do modal de detalhes.
- **Metadados**: "Atualizado em" e "Disponível em" (Android, Windows, etc.).
- **Gerenciador de Tags (Pills)**:
  - Campo para digitar novas tags e botão **"+ Adicionar"** (ou aperte Enter).
  - Cada tag possui um botão `✕` para exclusão individual.
- **Nota de Rodapé**: Ex: `*Com a tecnologia Intel®`.

### 5. 🎯 Eventos & Destaques
- **Eventos e Ofertas**: Selo de expiração, título do evento e upload de banner.
- **Matérias em Destaque**: Selo de destaque, título e upload de imagem.

### 6. 🛡️ Barra Lateral & Requisitos de PC
- **Classificação Indicativa**: Idade (18, 16, 14, 12, 10, Livre), título e descrição (ex: `Violência Extrema`).
- **Card "Jogar no PC"**: Título e subtítulo dos benefícios de PC.
- **Requisitos Mínimos**: SO, Armazenamento, Placa de Vídeo (GPU) e Processador (CPU).

---

## ⚡ Barra Superior de Ferramentas (Studio Toolbar)

- **Modelos Prontos (Presets)**:
  - `Sniper 3D (Original)`: A tela original do print.
  - `Free Fire MAX`: Transforma instantaneamente para a página do Free Fire.
  - `Minecraft`: Página no estilo Minecraft Bedrock Edition.
  - `Em Branco (Novo App)`: Tela limpa para criar um aplicativo do zero.
- **Alternador de Modos de Visualização**:
  - `📱 Referência (632px)`: Enquadra na largura exata do print original enviado.
  - `💻 Desktop Fluido`: Expande para largura completa de computadores desktop.
  - `👁️ Ocultar / Exibir Editor`: Oculta o painel lateral para visualizar o resultado 100% limpo em tela cheia.
- **Ações de Dados**:
  - `🔄 Restaurar`: Retorna todas as configurações para o padrão original do Sniper 3D.
  - `📥 Exportar`: Baixa um arquivo `.json` com todas as suas customizações.
  - `📤 Importar`: Carrega um arquivo `.json` previamente exportado.
- **Auto-Save**: Todas as alterações feitas são salvas automaticamente no `localStorage` do navegador para você não perder nada se recarregar a página!
