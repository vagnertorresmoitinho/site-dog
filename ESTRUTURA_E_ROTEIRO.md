# Dogtop - Estrutura e roteiro do sistema

Este documento serve como mapa do projeto. A ideia e registrar onde cada coisa mora, quais arquivos se conectam, quais campos existem e quais proximos passos fazem sentido.

## Visao geral

O sistema esta organizado como paginas HTML estaticas, CSS por tela e JavaScript por responsabilidade. Os dados principais ficam no `localStorage` do navegador.

## Estrutura de pastas

- `pages/`: telas HTML do painel e do pedido online.
- `assets/css/painel-vendas.css`: estilo base do painel administrativo.
- `assets/css/pages/`: estilos especificos de cada tela.
- `assets/js/painel-vendas.js`: comportamento comum do painel, menu, abas e parte do cadastro de clientes.
- `assets/js/config.js`: configuracoes comuns da empresa, contatos e parametros de pedidos.
- `assets/js/audit-log.js`: utilitario global de auditoria.
- `assets/js/pages/`: scripts especificos de cada tela.
- `CONTRATOS_PEDIDO_CLIENTE.md`: contrato fechado para os objetos `Cliente`, `Pedido`, itens e adicionais.

## Chaves de dados no localStorage

- `dogtopProdutos`: produtos cadastrados.
- `produtosLanchonete`: chave antiga de produtos, usada como fallback.
- `dogtopClientes`: clientes cadastrados e historico de pedidos.
- `dogtopPedidoRascunho`: carrinho temporario entre pedido online e pagamento.
- `dogtopPedidosOnline`: pedidos online concluidos.
- `dogtopClienteTelefoneAtual`: ultimo telefone usado para recuperar cadastro no fluxo de cliente/pagamento.
- `dogtopAuditLogs`: logs de auditoria.
- `dogtopConfiguracoes`: configuracoes comuns, como taxa de entrega e dados da empresa.

## Contratos fechados

### Cliente e Pedido

O contrato oficial esta documentado em `CONTRATOS_PEDIDO_CLIENTE.md`.

Resumo:
- `Cliente` vive em `dogtopClientes`.
- `Pedido` finalizado vive em `dogtopPedidosOnline`.
- Carrinho temporario vive em `dogtopPedidoRascunho`.
- Pedido sempre guarda snapshot de cliente, telefone, entrega, pagamento, itens, totais e status.
- Cliente guarda dados cadastrais, endereco principal, CEP, saldo e historico resumido.

## Telas principais

### Dashboard

Arquivos:
- `pages/dashboard.html`
- `assets/css/pages/dashboard.css`
- `assets/js/pages/dashboard.js`

Responsabilidade:
- Visao geral da operacao.
- Destaque de promocao da semana com produtos promocionais.

### Produtos

Arquivos:
- `pages/produtos.html`
- `assets/css/pages/produtos.css`
- `assets/js/pages/produtos.js`

Campos principais:
- Codigo
- Nome
- Categoria
- Preco
- Preco promocional
- Estoque
- Tempo de preparo
- Status
- Ingredientes
- Tags
- Descricao
- Imagem

Funcoes principais:
- Normalizar produtos.
- Cadastrar produto.
- Atualizar produto.
- Excluir produto.
- Renderizar tabela.
- Aplicar imagens ilustrativas quando nao houver foto.
- Registrar logs de cadastro, edicao e exclusao.

### Vendas / PDV

Arquivos:
- `pages/vendas.html`
- `assets/css/pages/vendas.css`
- `assets/js/pages/vendas.js`

Responsabilidade:
- Listar produtos disponiveis cadastrados em `dogtopProdutos`.
- Filtrar produtos por nome, codigo e categoria.
- Montar carrinho de venda presencial.
- Controlar quantidade por item respeitando estoque disponivel.
- Exibir preco promocional quando existir.
- Aplicar desconto manual.
- Gerar rascunho em `dogtopPedidoRascunho`.
- Enviar venda para `pagamento-pedido.html`.
- Registrar logs de item adicionado e envio ao pagamento.

Campos/elementos importantes:
- `pdv-search`: pesquisa por nome ou codigo.
- `pdv-category`: filtro de categoria.
- `pdv-product-list`: lista de produtos.
- `pdv-client`: cliente da venda.
- `pdv-cart-items`: itens do carrinho.
- `pdv-discount`: desconto manual.
- `pdv-checkout`: envio para pagamento.

### Promocoes

Arquivos:
- `pages/promocoes.html`
- `assets/css/pages/promocoes.css`
- `assets/js/pages/promocoes.js`

Responsabilidade:
- Listar produtos com `precoPromocional`.
- Exibir desconto calculado.

### Pedidos Online - etapa 1

Arquivos:
- `pages/pedidos-online.html`
- `assets/css/pages/pedidos-online.css`
- `assets/js/pages/pedidos-online.js`

Responsabilidade:
- Mostrar cardapio por categoria.
- Mostrar carrossel de destaques/promocoes.
- Adicionar produtos ao carrinho.
- Salvar rascunho em `dogtopPedidoRascunho`.
- Redirecionar para pagamento.

Campos/elementos importantes:
- `online-feature-slides`: slides do carrossel.
- `online-feature-dots`: indicadores do carrossel.
- `online-category-tabs`: abas de categoria.
- `online-category-list`: lista de produtos renderizada.
- `online-cart-items`: itens do carrinho.
- `online-go-payment`: botao para continuar.

Funcoes principais:
- `loadProducts`
- `normalizeOrderProduct`
- `renderFeatureCarousel`
- `updateFeatureCarousel`
- `startFeatureRotation`
- `renderProducts`
- `renderCart`
- `addToCart`
- `saveDraftAndGoToPayment`

### Cardapio publico

Arquivos:
- `pages/cardapio.html`
- `assets/css/pages/cardapio.css`
- `assets/js/pages/cardapio.js`

Responsabilidade:
- Exibir um cardapio visual e imprimivel.
- Ler produtos disponiveis de `dogtopProdutos`.
- Usar dados da loja, logotipo, contato e taxa de entrega de `DogtopConfig`.
- Separar produtos por categoria.
- Destacar ate cinco itens especiais no topo.
- Mostrar preco promocional com preco original riscado.

### Pagamento do Pedido - etapa 2

Arquivos:
- `pages/pagamento-pedido.html`
- `assets/css/pages/pedidos-online.css`
- `assets/js/pages/pagamento-pedido.js`

Responsabilidade:
- Ler carrinho salvo.
- Confirmar dados do cliente.
- Buscar clientes existentes por nome/telefone.
- Controlar entrega ou retirada.
- Aplicar taxa de entrega definida em `assets/js/config.js`.
- Controlar forma de pagamento.
- Exibir campo de troco somente quando pagamento for `Dinheiro`.
- Salvar pedido em `dogtopPedidosOnline`.
- Criar/atualizar cliente em `dogtopClientes`.
- Imprimir automaticamente a comanda termica de cozinha ao concluir o pedido.
- Redirecionar para acompanhamento.

Campos principais:
- Cliente
- Telefone
- Tipo de entrega
- Taxa de entrega
- Endereco
- Ponto de referencia
- Forma de pagamento
- Troco para
- Observacoes

Funcoes principais:
- `loadDraft`
- `loadClients`
- `fillClientFields`
- `updateDeliveryState`
- `updatePaymentMethodState`
- `renderTotals`
- `renderItems`
- `upsertClientWithOrder`

### Andamento do Pedido - etapa 3

Arquivos:
- `pages/andamento-pedido.html`
- `assets/css/pages/andamento-pedido.css`
- `assets/js/pages/andamento-pedido.js`

Responsabilidade:
- Exibir pedido concluido.
- Exibir itens, descontos, subtotal, taxa de entrega e total.
- Exibir forma de pagamento.
- Exibir troco calculado quando pagamento for dinheiro.
- Copiar link de acompanhamento.
- Imprimir recibo em formato de papel termico.
- Cancelar pedido e registrar cancelamento em auditoria.

Campos/elementos importantes:
- `track-items`: itens do pedido.
- `track-payment`: forma de pagamento.
- `track-change-value`: valor do troco.
- `track-delivery-fee`: taxa de entrega.
- `track-total`: total.
- `print-track-receipt`: botao de impressao.

Funcoes principais:
- Carregar pedido por `id` na URL.
- Calcular desconto.
- Calcular troco.
- Renderizar itens.
- Gerar HTML do recibo.
- Registrar log de recibo impresso.

### Historico

Arquivos:
- `pages/historico.html`
- `assets/css/pages/historico.css`
- `assets/js/pages/historico.js`

Responsabilidade:
- Listar vendas e pedidos salvos em `dogtopPedidosOnline`.
- Filtrar por texto, status e periodo.
- Calcular total vendido, quantidade de pedidos, ticket medio e descontos.
- Exportar o historico filtrado em CSV.
- Abrir a tela de acompanhamento do pedido.
- Cancelar pedido e registrar auditoria.

Campos/elementos importantes:
- `history-search`: busca por cliente, telefone, pedido ou produto.
- `history-status`: filtro por status.
- `history-period`: filtro por periodo.
- `history-table-body`: corpo da tabela de historico.
- `history-export`: exportacao CSV.

### Segunda via de recibo

Arquivos:
- `pages/segunda-via.html`
- `assets/css/pages/segunda-via.css`
- `assets/js/pages/segunda-via.js`

Responsabilidade:
- Buscar pedido por numero curto, ID completo ou telefone.
- Abrir acompanhamento do pedido.
- Imprimir segunda via em formato termico.
- Ler dados da loja, logotipo e preferencias de recibo de `DogtopConfig`.
- Registrar log de auditoria quando a segunda via for impressa.

### Clientes

Arquivos:
- `pages/clientes.html`
- `assets/css/pages/clientes.css`
- `assets/js/pages/clientes.js`

Responsabilidade:
- Cadastrar clientes.
- Editar clientes.
- Excluir clientes.
- Exibir historico de pedidos do cliente.
- Receber clientes criados automaticamente pelo pedido online.
- Recuperar cadastro pelo telefone/WhatsApp.
- Exibir ultimos pedidos no cadastro quando o telefone ja existir.
- Controlar bairro por lista pre-definida para evitar endereco inconsistente.
- Aplicar mascaras e validacoes de telefones.
- Registrar logs de cadastro, edicao e exclusao de clientes.

Campos principais:
- Nome
- WhatsApp/telefone
- Endereco
- Bairro
- Complemento
- Status
- Observacoes
- Historico de pedidos

Documento complementar:
- `PLANO_DADOS_E_BACKEND.md`: estrategia de dados atual, modelo recomendado, endpoints futuros, seguranca e migracao para backend.

### Logs de Auditoria

Arquivos:
- `pages/logs.html`
- `assets/css/pages/logs.css`
- `assets/js/pages/logs.js`
- `assets/js/audit-log.js`

Responsabilidade:
- Ficar acessivel dentro de `Configuracoes > Logs`.
- Permitir acesso somente para perfil `Administrador`.
- Exibir eventos importantes do sistema.
- Filtrar por modulo.
- Filtrar por periodo.
- Pesquisar por texto.
- Exportar CSV.
- Limpar logs.

Eventos registrados hoje:
- Produto cadastrado.
- Produto atualizado.
- Produto excluido.
- Cliente cadastrado.
- Cliente atualizado.
- Cliente excluido.
- Item adicionado ao carrinho.
- Carrinho enviado ao pagamento.
- Pedido concluido.
- Recibo impresso.
- Acesso a tela de logs.
- Limpeza de logs.

### Configuracoes

Arquivos:
- `pages/configuracoes.html`
- `assets/css/pages/configuracoes.css`
- `assets/js/pages/configuracoes.js`
- `assets/js/config.js`

Responsabilidade:
- Editar dados da empresa.
- Editar contatos.
- Editar endereco e abrir localizacao no Google Maps.
- Cadastrar logotipo usado no recibo, catalogo online e cardapio online.
- Editar moeda e casas decimais.
- Definir status habilitados de pedidos.
- Definir dados exibidos no recibo.
- Definir formas de pagamento aceitas.
- Editar taxa de entrega padrao.
- Salvar configuracoes em `dogtopConfiguracoes`.
- Atualizar preview dos dados que serao usados no pedido e recibo.
- Registrar logs de alteracao e restauracao das configuracoes.
- Exportar backup dos dados locais.
- Importar backup para restaurar dados locais.

Campos principais:
- Nome da loja
- Responsavel ou razao social
- CPF/CNPJ
- Nome no recibo
- Endereco
- Complemento
- WhatsApp
- Telefone
- Instagram
- Email
- Logotipo
- Tipo de moeda
- Casas decimais
- Status: pendente, confirmado, pago, em producao, pronto, saiu pra entrega, pronto pra retirar
- Recibo: dados da loja, dados do cliente, cabecalho e rodape
- Pagamentos: Pix, dinheiro, cartao debito, cartao credito
- Taxa de entrega padrao

### Cozinha

Arquivos:
- `pages/cozinha.html`
- `assets/css/pages/cozinha.css`
- `assets/js/pages/cozinha.js`
- `assets/js/thermal-print.js`

Responsabilidade:
- Listar pedidos online ativos.
- Separar pedidos por estado: recebidos, em preparo e prontos/despacho.
- Avancar status operacional.
- Reimprimir comanda termica de producao.
- Cancelar pedido pela cozinha.
- Registrar logs de alteracao de status e cancelamento.

Status usados:
- `recebido`
- `preparo`
- `saiu_entrega`
- `concluido`
- `cancelado`

### Impressao termica

Arquivo:
- `assets/js/thermal-print.js`

Responsabilidade:
- Gerar comanda de cozinha em 80 mm.
- Imprimir itens de producao sem depender do recibo financeiro.
- Exibir pedido, cliente, tipo de entrega, endereco, referencia, observacoes e itens.
- Ser usado automaticamente no fechamento do pedido e manualmente no KDS.

Rotina recomendada:
- Ao concluir pedido em `pagamento-pedido.js`, imprimir a comanda para a cozinha.
- Na tela `cozinha.html`, permitir reimpressao pelo botao `Imprimir` em cada card.
- Manter recibo financeiro separado em `andamento-pedido.js` e `segunda-via.js`.

## Arquivos de estilo por tela

- `dashboard.css`: dashboard e promocao da semana.
- `produtos.css`: formulario e tabela de produtos.
- `clientes.css`: cadastro, tabela e modal de clientes.
- `pedidos-online.css`: pedido online, carrossel, carrinho e pagamento.
- `andamento-pedido.css`: acompanhamento e tela final.
- `logs.css`: auditoria.

## Configuracoes comuns

Arquivo:
- `assets/js/config.js`

Objeto global:
- `window.DogtopConfig`

Responsabilidade:
- Centralizar dados da empresa.
- Centralizar contatos.
- Centralizar taxa de entrega.
- Fornecer fallback padrao caso ainda nao exista configuracao salva.

Campos atuais:
- `empresa.nome`
- `empresa.nomeRecibo`
- `empresa.nomeResponsavel`
- `empresa.documento`
- `empresa.endereco`
- `empresa.complemento`
- `empresa.email`
- `empresa.whatsapp`
- `empresa.telefone`
- `empresa.instagram`
- `empresa.logotipo`
- `empresa.cabecalhoRecibo`
- `empresa.rodapeRecibo`
- `moeda.codigo`
- `moeda.simbolo`
- `moeda.casasDecimais`
- `pedidos.taxaEntrega`
- `pedidos.status`
- `recibo.loja`
- `recibo.cliente`
- `pagamentos`

Funcoes principais:
- `DogtopConfig.load()`
- `DogtopConfig.save(config)`
- `DogtopConfig.get(path, fallback)`
- `DogtopConfig.getCompany()`
- `DogtopConfig.getCurrency()`
- `DogtopConfig.getCurrencyFormatter()`
- `DogtopConfig.getDeliveryFee()`
- `DogtopConfig.getPaymentMethods()`

## Pontos de atencao

- O projeto ainda usa `localStorage`, entao dados sao locais do navegador.
- A permissao de acesso aos Logs ainda e uma trava de front-end, baseada em `dogtopUsuarioAtual.perfil` ou `dogtopPerfilAtual`. Quando houver login/backend, essa regra precisa ser validada no servidor.
- Imagens ilustrativas usam URLs externas. Se a URL quebrar, o sistema precisa de fallback.
- O menu do painel ainda e repetido em varios HTML; parte do item Logs e inserida automaticamente pelo JS.
- Nao existe autenticacao real ainda, entao o usuario do log vem do nome exibido no perfil do painel ou `Sistema`.

## Roteiro de proximos passos

1. Continuar ampliando o uso de `data-company-field` nas telas que exibirem dados especificos da empresa.
2. Testar a tela de segunda via com pedidos reais e recibos cancelados/concluidos.
3. Revisar acessibilidade e responsividade usando `CHECKLIST_VISUAL.md`.
4. Seguir `PLANO_DADOS_E_BACKEND.md` para preparar a migracao de `localStorage` para backend/banco de dados quando o sistema estiver maduro.

## Como decidir onde mexer

- Mudanca visual de uma tela: procurar o CSS em `assets/css/pages/`.
- Novo campo em uma tela: alterar o HTML da pagina e o JS da pagina.
- Regra de calculo: geralmente fica no JS da tela responsavel.
- Pedido online antes do pagamento: `pedidos-online.js`.
- Pagamento, taxa, cliente e troco: `pagamento-pedido.js`.
- Pedido finalizado, acompanhamento e recibo: `andamento-pedido.js`.
- Cadastro e tabela de produtos: `produtos.js`.
- Cadastro e historico de clientes: `clientes.js`.
- Logs: `audit-log.js` para gravar, `logs.js` para listar.
