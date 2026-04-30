# Dogtop - Plano de dados e backend futuro

Este documento define a melhor abordagem para o esqueleto atual do sistema e o caminho recomendado para migrar depois para backend e banco de dados.

## Decisao atual

Neste momento, a melhor abordagem e manter o sistema funcionando com `localStorage`, mas modelar os dados como se eles ja viessem de uma API.

Motivos:
- Permite validar rapidamente o fluxo real da Dogtop.
- Evita travar o desenvolvimento por falta de backend.
- Mantem o front-end proximo do modelo final.
- Facilita trocar `localStorage` por chamadas HTTP depois.

O fluxo principal deve ser:
1. Cliente informa WhatsApp.
2. Sistema normaliza o telefone, deixando apenas digitos.
3. Sistema busca cliente existente por telefone.
4. Se encontrar, preenche nome, endereco e bairro.
5. Se nao encontrar, abre cadastro simples.
6. Ao concluir pedido, cria ou atualiza cliente.
7. Pedido finalizado entra no historico do cliente.

## Chaves locais atuais

- `dogtopClientes`: lista de clientes, endereco principal e historico.
- `dogtopPedidoRascunho`: carrinho temporario entre cardapio/PDV e pagamento.
- `dogtopPedidosOnline`: pedidos concluidos.
- `dogtopClienteTelefoneAtual`: ultimo telefone usado para recuperar cliente ao reabrir fluxo.
- `dogtopProdutos`: catalogo de produtos.
- `dogtopConfiguracoes`: configuracoes da empresa, recibo, pagamentos e taxa.
- `dogtopAuditLogs`: eventos de auditoria.

## Modelo recomendado de cliente

Contrato detalhado congelado em `CONTRATOS_PEDIDO_CLIENTE.md`.

```json
{
  "id": "001",
  "nome": "Maria Silva",
  "cpfCnpj": "",
  "observacoes": "",
  "email": "",
  "ddiCelular": "+55",
  "telefoneCelular": "(65) 99999-0000",
  "telefone": "",
  "ddiTelefone": "+55",
  "endereco": "Rua Principal",
  "numero": "120",
  "bairro": "Centro",
  "cep": "78365-000",
  "complemento": "Casa",
  "pontoReferencia": "Portao preto",
  "status": "Ativo",
  "saldo": 0,
  "observacoes": "",
  "pedidosHistorico": [],
  "criadoEm": "2026-04-26T18:00:00.000Z",
  "atualizadoEm": "2026-04-26T18:00:00.000Z"
}
```

Regras:
- O telefone deve ser a principal chave de busca.
- A comparacao deve ignorar mascara, espaco, hifen, parenteses e `+55`.
- O cadastro deve aceitar cliente sem CPF/e-mail neste momento.
- `bairro` deve vir de lista controlada, nao de texto livre.
- `pedidosHistorico` deve guardar apenas os dados necessarios para consulta e upsell.

## Modelo recomendado de pedido

Contrato detalhado congelado em `CONTRATOS_PEDIDO_CLIENTE.md`.

```json
{
  "id": "uuid-ou-id-do-backend",
  "clienteId": "001",
  "cliente": "Maria Silva",
  "telefone": "(65) 99999-0000",
  "telefoneCompleto": "+55 (65) 99999-0000",
  "tipoEntrega": "Delivery",
  "enderecoEntrega": "Rua Principal, 120, Centro, Casa",
  "bairro": "Centro",
  "cep": "78365-000",
  "pontoReferencia": "",
  "formaPagamento": "Pix",
  "trocoPara": 0,
  "trocoDevolver": 0,
  "itens": [],
  "subtotalOriginal": 42.5,
  "desconto": 0,
  "subtotal": 42.5,
  "taxaEntrega": 8,
  "total": 50.5,
  "status": "recebido",
  "observacoes": "",
  "criadoEm": "2026-04-26T18:00:00.000Z"
}
```

Regras:
- Pedido deve guardar `clienteId` quando houver cliente vinculado.
- Pedido tambem deve guardar nome e telefone como snapshot historico.
- Status operacional deve ser controlado por lista.
- Valores monetarios devem ser numeros, nao strings formatadas.

## Normalizacao de endereco

Para delivery local, endereco precisa ser previsivel.

Implementacao atual:
- `bairro` ja usa lista controlada para Sapezal e Canarana no cadastro de clientes.

Proximo passo recomendado:
- Criar cadastro de areas de entrega em `Configuracoes`.
- Cada area deve ter cidade, bairro, taxa de entrega e status ativo/inativo.
- O checkout deve usar a mesma lista de bairros.

Modelo futuro:

```json
{
  "id": "area-001",
  "cidade": "Sapezal",
  "bairro": "Centro",
  "taxaEntrega": 8,
  "ativo": true
}
```

Boas praticas:
- Evitar campo livre para bairro.
- Manter endereco livre apenas para rua, numero e complemento.
- Separar ponto de referencia.
- Bloquear pedido delivery para bairro inativo ou nao atendido.

## Protecao de dados

Na fase atual, os dados ficam no navegador. Isso e aceitavel para prototipo interno, mas nao e suficiente para producao.

Boas praticas futuras:
- Usar HTTPS.
- Autenticar painel administrativo.
- Validar permissoes no backend, nao apenas no front-end.
- Nao retornar dados sensiveis completos apenas por telefone em endpoint publico.
- Criar endpoint de identificacao com resposta limitada.
- Registrar consentimento ou aceite de politica de uso quando o pedido for publico.
- Definir rotina de exclusao/anonimizacao de cliente quando solicitado.

Endpoint publico recomendado:

```http
GET /api/customers/lookup?phone=65999990000
```

Resposta segura:

```json
{
  "found": true,
  "customer": {
    "id": "001",
    "name": "Maria Silva",
    "phone": "(65) 99999-0000",
    "address": "Rua Principal, 120",
    "neighborhood": "Centro",
    "complement": "Casa"
  },
  "lastOrders": [
    {
      "id": "10400",
      "total": 42.5,
      "createdAt": "2026-04-10T23:30:00.000Z",
      "itemsSummary": "1x Dogao Completo, 1x Coca-Cola"
    }
  ]
}
```

Evitar nesse endpoint:
- CPF/CNPJ.
- Observacoes internas.
- Logs.
- Historico completo.
- Dados de pagamento detalhados.

## Endpoints futuros

### Clientes

```http
GET /api/customers?search=texto
GET /api/customers/:id
GET /api/customers/lookup?phone=65999990000
POST /api/customers
PUT /api/customers/:id
DELETE /api/customers/:id
```

### Pedidos

```http
GET /api/orders
GET /api/orders/:id
POST /api/orders
PATCH /api/orders/:id/status
POST /api/orders/:id/receipt
```

### Produtos

```http
GET /api/products
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id
```

### Configuracoes

```http
GET /api/settings
PUT /api/settings
GET /api/delivery-areas
POST /api/delivery-areas
PUT /api/delivery-areas/:id
```

## Banco de dados recomendado

Para a primeira versao com backend, PostgreSQL e uma boa escolha.

Tabelas principais:
- `users`
- `customers`
- `customer_addresses`
- `products`
- `ingredients`
- `product_ingredients`
- `orders`
- `order_items`
- `delivery_areas`
- `settings`
- `audit_logs`

Relacionamentos:
- `orders.customer_id` aponta para `customers.id`.
- `order_items.order_id` aponta para `orders.id`.
- `customer_addresses.customer_id` aponta para `customers.id`.
- `product_ingredients.product_id` aponta para `products.id`.
- `product_ingredients.ingredient_id` aponta para `ingredients.id`.
- `orders.delivery_area_id` aponta para `delivery_areas.id` quando houver delivery.

## Ingredientes e estoque

Na fase atual, os ingredientes dos produtos devem ser cadastrados como checklist dinamico: um ingrediente por vez, formando uma lista.

Modelo local atual dentro do produto:

```json
{
  "ingredientes": ["Pao", "Salsicha", "Pure", "Milho"]
}
```

Modelo futuro recomendado:

```json
{
  "ingredient": {
    "id": "ing-001",
    "name": "Salsicha",
    "unit": "un",
    "stockQuantity": 120,
    "minimumStock": 20
  },
  "productIngredient": {
    "productId": "prd-001",
    "ingredientId": "ing-001",
    "quantity": 2
  }
}
```

Boas praticas:
- Evitar texto livre separado por virgula na base final.
- Reaproveitar ingredientes ja cadastrados com autocomplete.
- Permitir quantidade por ingrediente quando o estoque for implementado.
- Baixar estoque dos ingredientes ao concluir pedido.
- Alertar quando ingrediente essencial estiver abaixo do minimo.

## Praticas de implementacao

### No front-end atual

- Centralizar nomes de chaves do `localStorage`.
- Normalizar telefone antes de buscar.
- Tratar cliente encontrado e cliente novo no mesmo fluxo.
- Manter campos essenciais no checkout.
- Manter bairro controlado.
- Registrar eventos importantes em `DogtopAudit`.
- Evitar depender de CPF/e-mail para pedido rapido.

### No backend futuro

- Validar todos os dados no servidor.
- Gerar IDs no backend.
- Usar transacao ao criar pedido e atualizar historico do cliente.
- Registrar auditoria no servidor.
- Criar indices para telefone normalizado e status de pedido.
- Separar dados publicos de dados administrativos.
- Aplicar backup automatico do banco.

## Ordem recomendada de migracao

1. Congelar o modelo local atual.
2. Criar API de clientes com lookup por telefone.
3. Migrar `dogtopClientes` para tabela `customers`.
4. Criar API de pedidos.
5. Migrar `dogtopPedidosOnline` para `orders` e `order_items`.
6. Criar API de produtos.
7. Migrar configuracoes e areas de entrega.
8. Implementar login/permissoes reais.
9. Implementar auditoria no backend.
10. Desativar dependencia operacional do `localStorage`.

## Criterio de pronto para backend

O projeto esta pronto para backend quando:
- O fluxo de pedido online estiver validado.
- Cadastro rapido por telefone estiver funcionando.
- Historico de cliente estiver util para atendimento.
- Produtos e pedidos tiverem campos estaveis.
- A lista de bairros/areas de entrega estiver definida pela operacao.
- A Dogtop souber quais relatorios precisa no dia a dia.
