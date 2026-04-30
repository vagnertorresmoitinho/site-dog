# Insumos, Receitas e Baixa Automatica

## Objetivo

Separar o estoque de venda do estoque de producao. Produtos como lanches e bebidas continuam no catalogo, enquanto insumos como pao, salsicha, pure, embalagem, cheddar e milho ficam em uma base propria.

## Estrutura recomendada

### Insumos

Campos essenciais:

- `id`
- `nome`
- `categoria`
- `unidade` (`un`, `kg`, `g`, `ml`, `l`)
- `estoque`
- `minimo`
- `custoUnitario`
- `status`, calculado por estoque:
  - `zerado`: estoque igual a zero
  - `critico`: estoque menor ou igual ao minimo
  - `normal`: estoque acima do minimo

### Receitas

A receita liga um produto aos insumos consumidos.

Exemplo:

```json
{
  "LAN-002": [
    { "insumoId": "ins-pao", "quantidade": 1 },
    { "insumoId": "ins-salsicha", "quantidade": 1 },
    { "insumoId": "ins-pure", "quantidade": 0.06 },
    { "insumoId": "ins-emb-hotdog", "quantidade": 1 }
  ]
}
```

## Fluxo de baixa

1. Pedido e confirmado no pagamento.
2. Sistema busca a receita de cada item pelo `codigo`, `id` ou nome normalizado.
3. Multiplica a receita pela quantidade vendida.
4. Aplica adicionais como receitas separadas.
5. Subtrai do estoque de insumos.
6. Registra movimento em `dogtopMovimentosEstoque`.
7. Se algum insumo ficar no minimo, gera alerta no log.

## Implementacao atual no esqueleto

Foi criado o modulo:

- `assets/js/stock-recipes.js`

Ele usa:

- `dogtopInsumos`
- `dogtopReceitas`
- `dogtopMovimentosEstoque`

O pagamento chama:

```js
window.DogtopStock.processOrder(order)
```

Isso ja permite testar a baixa automatica usando `localStorage`.

## Proxima etapa de tela

Criar `insumos.html` com:

- cards de total, criticos e zerados;
- filtro por categoria;
- barra visual de estoque versus minimo;
- entrada rapida;
- saida manual;
- edicao de insumo;
- aba ou modal de `Receitas por produto`.
