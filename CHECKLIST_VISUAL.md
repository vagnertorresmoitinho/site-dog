# Checklist visual - acessibilidade e responsividade

Use este roteiro ao revisar cada tela em desktop, tablet e celular.

## Telas do painel

- [ ] Menu abre e fecha no celular sem cobrir ações importantes.
- [ ] Botões principais têm texto claro e área clicável confortável.
- [ ] Campos de formulário têm `label` visível.
- [ ] Tabelas não quebram no celular; quando necessário, têm rolagem horizontal.
- [ ] Textos não ficam cortados dentro de cards, botões ou badges.
- [ ] Links de ação são distinguíveis visualmente de texto comum.
- [ ] Foco por teclado aparece em inputs, botões e links.
- [ ] Contraste entre texto e fundo permite leitura em telas claras.
- [ ] Dados da empresa exibidos na tela vêm de `DogtopConfig`.

## Pedidos online

- [ ] Carrossel mostra imagem, nome, preço e botão sem sobreposição.
- [ ] Categorias rolam horizontalmente no celular.
- [ ] Adicionais aparecem como checkboxes compactos.
- [ ] Carrinho fica acessível e legível em celular.
- [ ] Botão de pagamento fica visível após adicionar itens.
- [ ] Campo de troco aparece somente para pagamento em dinheiro.

## Recibos e segunda via

- [ ] Recibo térmico usa largura de 80 mm.
- [ ] Logotipo, nome, documento, telefone, WhatsApp e endereço obedecem configuração.
- [ ] Dados do cliente obedecem configuração.
- [ ] Taxa de entrega aparece na última linha antes do total.
- [ ] Segunda via localiza pedido por número curto, ID completo ou telefone.
- [ ] Impressão de segunda via registra log de auditoria.

## Breakpoints para testar

- [ ] 390 x 844 - celular comum.
- [ ] 768 x 1024 - tablet.
- [ ] 1366 x 768 - notebook.
- [ ] 1920 x 1080 - desktop amplo.

## Navegação entre telas

- [ ] Dashboard abre sem erro.
- [ ] Vendas envia carrinho para pagamento.
- [ ] Pedidos online envia carrinho para pagamento.
- [ ] Pagamento conclui pedido e abre acompanhamento.
- [ ] Histórico abre acompanhamento.
- [ ] Histórico abre 2ª via.
- [ ] 2ª via imprime recibo.
- [ ] Configurações altera dados da empresa e as demais telas refletem a mudança.
