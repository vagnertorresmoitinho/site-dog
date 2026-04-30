# Contratos de Dados - Cliente e Pedido

Data: 2026-04-26

Este documento congela o contrato local atual para `Cliente` e `Pedido`. A partir daqui, telas novas e backend futuro devem seguir estes campos para evitar divergencia entre PDV, pedido online, cozinha, historico, financeiro e estoque.

## Chaves de armazenamento atuais

- `dogtopClientes`: lista de clientes.
- `dogtopClienteSelecionado`: cliente selecionado na tela de cadastro.
- `dogtopClientePedidoAtual`: cliente enviado da tela de clientes para o PDV.
- `dogtopClienteTelefoneAtual`: ultimo telefone usado no fluxo de pagamento.
- `dogtopPedidoRascunho`: carrinho temporario antes do pagamento.
- `dogtopPedidosOnline`: pedidos finalizados.

## Contrato de Cliente

### Campos

| Campo | Tipo | Obrigatorio | Origem | Observacao |
| --- | --- | --- | --- | --- |
| `id` | string | Sim | Sistema | No localStorage pode ser sequencial. No backend sera UUID/ID do banco. |
| `nome` | string | Sim | Cadastro/checkout | Nome de exibicao e busca. |
| `cpfCnpj` | string | Nao | Cadastro | Opcional nesta fase. |
| `observacoes` | string | Nao | Cadastro | Observacao interna do atendimento. |
| `email` | string | Nao | Cadastro | Opcional. |
| `ddiCelular` | string | Nao | Cadastro | Padrao `+55`. |
| `telefoneCelular` | string | Sim | Cadastro/checkout | Principal chave de busca. |
| `ddiTelefone` | string | Nao | Cadastro | Padrao `+55`. |
| `telefone` | string | Nao | Cadastro | Telefone alternativo. |
| `endereco` | string | Nao | Cadastro/checkout | Rua, avenida ou logradouro. |
| `numero` | string | Nao | Cadastro/checkout | Numero do endereco. |
| `bairro` | string | Nao | Cadastro/checkout | Deve migrar para lista controlada/area de entrega. |
| `cep` | string | Nao | Cadastro | Formato recomendado `00000-000`. |
| `complemento` | string | Nao | Cadastro/checkout | Casa, apto, sala, etc. |
| `pontoReferencia` | string | Nao | Cadastro/checkout | Ajuda operacional para entrega. |
| `status` | string | Sim | Sistema | Valores: `Ativo`, `Inativo`, `Bloqueado`. Padrao `Ativo`. |
| `saldo` | number | Sim | Sistema | Credito/debito interno do cliente. Padrao `0`. |
| `pedidosHistorico` | array | Sim | Sistema | Snapshot resumido dos pedidos do cliente. |
| `criadoEm` | ISO string | Sim | Sistema | Data de criacao. |
| `atualizadoEm` | ISO string | Sim | Sistema | Data da ultima alteracao. |

### Exemplo

```json
{
  "id": "001",
  "nome": "Vagner Torres",
  "cpfCnpj": "",
  "observacoes": "Cliente recorrente.",
  "email": "",
  "ddiCelular": "+55",
  "telefoneCelular": "(65) 99967-2535",
  "ddiTelefone": "+55",
  "telefone": "",
  "endereco": "Modesto Paludo",
  "numero": "2440NW",
  "bairro": "Agua Clara",
  "cep": "78365-000",
  "complemento": "",
  "pontoReferencia": "Rotatoria",
  "status": "Ativo",
  "saldo": 0,
  "pedidosHistorico": [],
  "criadoEm": "2026-04-26T20:00:00.000Z",
  "atualizadoEm": "2026-04-26T20:00:00.000Z"
}
```

### Regras de Cliente

- Telefone deve ser normalizado para comparacao usando apenas digitos.
- Busca por telefone deve aceitar com ou sem `+55`, mascara, parenteses e hifen.
- `telefoneCelular` e `nome` sao suficientes para pedido rapido.
- CPF/CNPJ e e-mail nao devem bloquear venda.
- Endereco pode existir no cliente, mas cada pedido deve salvar snapshot proprio do endereco usado naquela venda.
- `pedidosHistorico` deve guardar resumo util para consulta e upsell, nao substituir a tabela/lista oficial de pedidos.

## Contrato de Pedido

### Campos principais

| Campo | Tipo | Obrigatorio | Origem | Observacao |
| --- | --- | --- | --- | --- |
| `id` | string | Sim | Sistema | UUID/local. No backend sera gerado no servidor. |
| `clienteId` | string | Nao | Checkout | Presente quando pedido vincula cliente salvo. |
| `cliente` | string | Sim | Checkout/PDV | Snapshot do nome no momento da venda. |
| `telefone` | string | Sim | Checkout/PDV | Snapshot do telefone. |
| `telefoneCompleto` | string | Nao | Checkout | Telefone formatado para exibicao. |
| `tipoEntrega` | string | Sim | Checkout | Valores: `Delivery`, `Retirada`. |
| `taxaEntrega` | number | Sim | Config/checkout | `0` para retirada. |
| `enderecoEntrega` | string | Condicional | Checkout | Obrigatorio quando `tipoEntrega = Delivery`. |
| `bairro` | string | Nao | Checkout | Futuramente deve vincular `deliveryAreaId`. |
| `cep` | string | Nao | Checkout | CEP do endereco usado na entrega. |
| `pontoReferencia` | string | Nao | Checkout | Ajuda para entrega. |
| `formaPagamento` | string | Sim | Checkout | Ex: `Pix`, `Dinheiro`, `Cartao de debito`, `Cartao de credito`. |
| `trocoPara` | number | Nao | Checkout | Usado somente para dinheiro. |
| `trocoDevolver` | number | Nao | Sistema | `trocoPara - total`, nunca negativo. |
| `itens` | array | Sim | Carrinho | Lista de itens do pedido. |
| `subtotalOriginal` | number | Sim | Carrinho | Soma antes de desconto. |
| `desconto` | number | Sim | Carrinho/PDV | Desconto total aplicado. Padrao `0`. |
| `subtotal` | number | Sim | Carrinho | Soma depois do desconto e antes da taxa. |
| `total` | number | Sim | Sistema | `subtotal + taxaEntrega`. |
| `status` | string | Sim | Sistema/KDS | Status operacional. Padrao `recebido`. |
| `observacoes` | string | Nao | Checkout/PDV | Observacao geral do pedido. |
| `criadoEm` | ISO string | Sim | Sistema | Data de criacao. |
| `atualizadoEm` | ISO string | Nao | Sistema | Ultima mudanca de status/dados. |
| `canceladoEm` | ISO string | Nao | Sistema | Apenas quando cancelado. |
| `concluidoEm` | ISO string | Nao | Sistema | Apenas quando concluido. |
| `estoqueProcessadoEm` | ISO string | Nao | Estoque | Marca baixa automatica processada. |
| `baixaEstoque` | object | Nao | Estoque | Resumo de insumos baixados e criticos. |
| `entregadorId` | string | Nao | Logistica | Vinculo com `dogtopEntregadores` para pedidos de delivery. |
| `entregadorNome` | string | Nao | Logistica | Snapshot para fila, relatorios e historico. |
| `entregadorConcluidoEm` | ISO string | Nao | Logistica | Marca que a entrega ja contabilizou uma conclusao para o entregador. |

### Status aceitos

| Status | Significado | Telas que usam |
| --- | --- | --- |
| `recebido` | Pedido entrou na fila | Pedidos, cozinha, acompanhamento |
| `aguardando` | Aguardando inicio/confirmacao | Pedidos |
| `preparo` | Em preparo/montagem | Pedidos, cozinha |
| `saiu_entrega` | Pronto, saiu para entrega ou despacho | Pedidos, cozinha, acompanhamento |
| `concluido` | Pedido finalizado/retirado/entregue | Pedidos, historico |
| `cancelado` | Pedido cancelado | Pedidos, historico, recibo |

### Contrato de Item do Pedido

| Campo | Tipo | Obrigatorio | Observacao |
| --- | --- | --- | --- |
| `id` | string | Sim | ID do produto. |
| `codigo` | string | Nao | Codigo/SKU do produto. Importante para receita/estoque. |
| `nome` | string | Sim | Nome exibido no pedido. |
| `categoria` | string | Nao | Ex: `lanche`, `bebida`, `combo`. |
| `quantidade` | number | Sim | Quantidade vendida. |
| `precoUnitario` | number | Sim | Preco final unitario com promocao, se houver. |
| `precoVenda` | number | Nao | Preco original/de venda antes de desconto. |
| `adicionais` | array | Sim | Lista de adicionais escolhidos. Pode ser vazia. |
| `adicionalTotal` | number | Sim | Soma dos adicionais por unidade. |
| `observacao` | string | Nao | Ex: sem cebola, sem milho. |
| `subtotal` | number | Sim | `(precoUnitario + adicionalTotal) * quantidade`. |

### Contrato de Adicional dentro do item

| Campo | Tipo | Obrigatorio | Observacao |
| --- | --- | --- | --- |
| `id` | string | Sim | ID do adicional/produto adicional. |
| `codigo` | string | Nao | Importante para receita/estoque. |
| `nome` | string | Sim | Ex: Adicional de milho. |
| `preco` | number | Sim | Valor do adicional. |
| `quantidade` | number | Nao | Padrao `1` por unidade do item principal. |

### Exemplo

```json
{
  "id": "b5d4f4c8-8f3a-4a85-8b6f-1df9c9f6f001",
  "clienteId": "001",
  "cliente": "Vagner Torres",
  "telefone": "(65) 99967-2535",
  "telefoneCompleto": "+55 (65) 99967-2535",
  "tipoEntrega": "Delivery",
  "taxaEntrega": 8,
  "enderecoEntrega": "Modesto Paludo, 2440NW, Agua Clara",
  "bairro": "Agua Clara",
  "cep": "78365-000",
  "pontoReferencia": "Rotatoria",
  "formaPagamento": "Dinheiro",
  "trocoPara": 50,
  "trocoDevolver": 27,
  "itens": [
    {
      "id": "LAN-001",
      "codigo": "LAN-001",
      "nome": "Top Dog Kids",
      "categoria": "lanche",
      "quantidade": 1,
      "precoUnitario": 15,
      "precoVenda": 15,
      "adicionais": [],
      "adicionalTotal": 0,
      "observacao": "sem cebola",
      "subtotal": 15
    }
  ],
  "subtotalOriginal": 15,
  "desconto": 0,
  "subtotal": 15,
  "total": 23,
  "status": "recebido",
  "observacoes": "1x Top Dog Kids: Obs: sem cebola",
  "criadoEm": "2026-04-26T20:10:00.000Z"
}
```

## Regras de Pedido

- Pedido deve guardar `clienteId` quando houver cliente cadastrado.
- Pedido sempre deve guardar `cliente`, `telefone` e endereco como snapshot historico.
- `Delivery` exige endereco; `Retirada` deve ter `taxaEntrega = 0`.
- Valores monetarios devem ser number, nunca string formatada.
- Alteracao de status deve atualizar `atualizadoEm`.
- Cancelamento deve preencher `canceladoEm`.
- Conclusao deve preencher `concluidoEm`.
- Baixa de estoque deve acontecer uma unica vez por pedido.
- Impressao de cozinha deve usar o snapshot do pedido, nao buscar produto novamente.
- Pedido `Delivery` pode receber `entregadorId`; pedidos `Retirada` nao entram na carga dos entregadores.
- A carga atual do entregador deve ser calculada por pedidos ativos (`recebido`, `aguardando`, `preparo`, `saiu_entrega`) vinculados a ele.

## Dependencias por tela

| Tela | Le campos de Cliente | Le campos de Pedido | Escreve |
| --- | --- | --- | --- |
| `clientes.html` | todos os campos de cliente | `pedidosHistorico` | `dogtopClientes` |
| `vendas.html` | `nome`, `telefoneCelular`, endereco resumido | rascunho | `dogtopPedidoRascunho` |
| `pedidos-online.html` | nenhum direto | rascunho | `dogtopPedidoRascunho` |
| `pagamento-pedido.html` | lookup por nome/telefone | cria pedido final | `dogtopClientes`, `dogtopPedidosOnline` |
| `pedidos.html` | snapshot no pedido | status, total, entrega, entregador | `dogtopPedidosOnline`, `dogtopEntregadores` |
| `cozinha.html` | snapshot no pedido | itens, adicionais, observacoes, status | `dogtopPedidosOnline` |
| `historico.html` | snapshot no pedido | totais/status | `dogtopPedidosOnline` |
| `segunda-via.html` | snapshot no pedido | recibo completo | leitura |
| `relatorios.html` | snapshot no pedido | taxa/entregador/status | `dogtopContasPagar` |
| `entregadores.html` | nenhum | entregador/carga por pedidos ativos | `dogtopEntregadores` |
| `insumos.html` | nenhum | itens/codigos/receitas | `dogtopInsumos`, `dogtopMovimentosEstoque` |

## Mapeamento futuro para banco

### Tabela `customers`

- `id`
- `name`
- `document`
- `notes`
- `email`
- `mobile_phone`
- `phone`
- `status`
- `balance`
- `created_at`
- `updated_at`

### Tabela `customer_addresses`

- `id`
- `customer_id`
- `street`
- `number`
- `neighborhood`
- `zip_code`
- `complement`
- `reference`
- `is_primary`

### Tabela `orders`

- `id`
- `customer_id`
- `customer_name_snapshot`
- `customer_phone_snapshot`
- `delivery_type`
- `delivery_fee`
- `delivery_address_snapshot`
- `neighborhood_snapshot`
- `zip_code_snapshot`
- `reference_snapshot`
- `payment_method`
- `change_for`
- `change_returned`
- `subtotal_original`
- `discount`
- `subtotal`
- `total`
- `status`
- `notes`
- `driver_id`
- `driver_name_snapshot`
- `created_at`
- `updated_at`
- `canceled_at`
- `completed_at`

### Tabela `order_items`

- `id`
- `order_id`
- `product_id`
- `product_code_snapshot`
- `product_name_snapshot`
- `category_snapshot`
- `quantity`
- `unit_price`
- `sale_price`
- `additional_total`
- `notes`
- `subtotal`

### Tabela `order_item_additionals`

- `id`
- `order_item_id`
- `additional_product_id`
- `additional_code_snapshot`
- `additional_name_snapshot`
- `price`
- `quantity`

## Criterio de pronto

O contrato `Cliente` e `Pedido` esta fechado quando:

- Toda tela cria pedido com os mesmos nomes de campo.
- Todo pedido possui `id`, `cliente`, `telefone`, `tipoEntrega`, `itens`, `subtotal`, `taxaEntrega`, `total`, `status` e `criadoEm`.
- Todo cliente possui `id`, `nome`, `telefoneCelular`, `status`, `saldo`, `pedidosHistorico`, `criadoEm` e `atualizadoEm`.
- O CEP fica no cliente e, quando usado na venda, tambem fica no snapshot do pedido.
- O backend futuro pode receber estes objetos sem renomeacao grande.
