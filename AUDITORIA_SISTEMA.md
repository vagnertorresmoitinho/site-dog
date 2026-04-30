# Auditoria do Sistema Dogtop

Data da auditoria: 2026-04-26

## Escopo validado

Foram analisadas as telas oficiais em `pages/`, os scripts em `assets/js/` e os estilos em `assets/css/`.

Arquivos de rascunho/prototipo fora do fluxo principal, como `teste.html`, `referencia-tailwind.html`, `painel-vendas.html`, `teste.py`, `static/` e `static.zip`, foram tratados como material legado ou experimental.

## Validacoes executadas

- `node --check` em todos os arquivos `.js` de `assets/js`.
- `npx.cmd --yes htmlhint pages\*.html`.
- Verificacao de links locais, CSS e scripts referenciados pelos HTMLs em `pages/`.
- Cruzamento entre IDs esperados por scripts de pagina e IDs existentes no HTML correspondente.
- Revisao estatica dos botoes, fluxos de localStorage e telas que ainda estao em modo visual.

## Resultado tecnico

### Aprovado

- Todas as telas oficiais em `pages/*.html` passaram no HTMLHint.
- Todos os JavaScripts em `assets/js/**/*.js` passaram no `node --check`.
- Nenhum `href`/`src` local quebrado foi encontrado nas telas oficiais.
- Nenhum script de pagina esta buscando `getElementById()` inexistente no HTML correspondente.
- O fluxo principal de pedido online esta conectado por localStorage:
  - `pedidos-online/cardapio/vendas` geram `dogtopPedidoRascunho`.
  - `pagamento-pedido` transforma o rascunho em `dogtopPedidosOnline`.
  - `pedidos`, `cozinha`, `historico`, `segunda-via` e `andamento-pedido` leem `dogtopPedidosOnline`.
- O fluxo de estoque ja possui base:
  - `dogtopInsumos`
  - `dogtopReceitas`
  - `dogtopMovimentosEstoque`
  - baixa automatica via `DogtopStock.processOrder(order)`.

## Mapa funcional por tela

| Tela | Estado atual | Observacoes |
| --- | --- | --- |
| `dashboard.html` | Parcialmente funcional | Cards e graficos estaticos/mistos; promo semanal vem de produtos promocionais. |
| `login.html` | Funcional local | Autentica usuarios de `dogtopUsuarios`, cria admin local padrao e inicia sessao em `dogtopUsuarioAtual`. |
| `vendas.html` | Funcional para PDV local | Lista produtos principais, personaliza lanches, salva rascunho e envia para pagamento. Adicionais nao aparecem mais na listagem principal. |
| `pedidos-online.html` | Funcional para pedido online | Cardapio, filtros, carrinho, modal de adicionais e rascunho funcionando. |
| `cardapio.html` | Funcional como cardapio publico | Busca, categorias, carrinho, impressao e envio para pagamento. |
| `pagamento-pedido.html` | Funcional | Conclui pedido, cria/atualiza cliente, baixa estoque e imprime comanda. |
| `andamento-pedido.html` | Funcional | Acompanha status e permite acoes basicas conforme origem. |
| `pedidos.html` | Funcional | Lista fila, filtra, exporta CSV, atribui entregador, avanca status, cancela e abre detalhes. |
| `cozinha.html` | Funcional | KDS por colunas, botoes de status, impressao e drag-and-drop. |
| `historico.html` | Funcional | Lista pedidos finalizados/online, filtra, exporta CSV e reabre detalhes/segunda via. |
| `segunda-via.html` | Funcional | Busca pedidos e reimprime recibo. |
| `produtos.html` | Funcional | Cadastro, edicao, exclusao, ingredientes dinamicos e tabela separada de adicionais. |
| `insumos.html` | Funcional | Cadastro de insumos, ajustes, receitas e integracao com baixa automatica. |
| `clientes.html` | Funcional | Cadastro local, busca, saldo, historico e envio para venda. |
| `configuracoes.html` | Funcional | Salva configuracoes, logo, pagamento, entrega e backup. |
| `configuracoes2.html` | Arquivada/teste | Versao visual alternativa mantida para homologacao futura. |
| `logs.html` | Funcional | Filtra/exporta/limpa logs de auditoria. |
| `relatorios.html` | Parcialmente funcional | Relatorio de entregadores usa `entregadorNome` dos pedidos e gera contas a pagar; outros cards/botoes de relatorio ainda sao visuais. |
| `financas.html` | Parcialmente funcional | Recebe contas geradas por relatorios; restante ainda e dashboard/tabela estatica. |
| `promocoes.html` | Parcialmente funcional | Lista produtos com preco promocional; modal "Nova Promocao" abre/fecha, mas ainda nao persiste uma promocao independente. |
| `usuarios.html` | Funcional local | Cadastra, persiste em `dogtopUsuarios`, lista, bloqueia/desbloqueia, exclui e exporta CSV. Usuarios ativos entram pelo `login.html`. |
| `entregadores.html` | Funcional local | Persiste em `dogtopEntregadores`, busca, filtra, cadastra novo motoboy, alterna status, abre mapa, exporta CSV e recalcula carga por pedidos reais atribuidos. |

## Inconsistencias e riscos encontrados

### Alta prioridade

1. **Login e permissoes sao locais, ainda sem backend**
   - `login.html` valida usuarios em `dogtopUsuarios`.
   - `painel-vendas.js` exige sessao em `dogtopUsuarioAtual`, filtra menus e bloqueia rotas por perfil.
   - Existe admin local padrao: `admin@dogtop.local` / `admin123`.
   - Impacto: fluxo operacional ja respeita acesso por perfil no navegador, mas senha ainda fica em localStorage ate a etapa de backend/autenticacao real.

2. **Promocoes independentes nao persistem**
   - A tela lista produtos com `precoPromocional`.
   - O modal de nova promocao nao salva em localStorage, nao vincula imagem, data de inicio/fim nem status.
   - Impacto: promocao hoje e tratada como preco promocional no produto, nao como campanha.

3. **Financeiro ainda e incompleto**
   - Contas a pagar geradas pelo relatorio entram na tela.
   - Botoes de exportacao e boa parte dos blocos financeiros ainda sao estaticos.
   - Impacto: nao fecha caixa real ainda.

### Media prioridade

4. **Menu/sidebar padronizado via script**
   - A navegacao administrativa principal passou a ser montada por `assets/js/painel-vendas.js`.
   - Telas administrativas com sidebar carregam o mesmo mapa de rotas e grupos.
   - Excecoes esperadas: telas publicas/online (`pedidos-online`, `pagamento-pedido`, `cardapio`) e `configuracoes2`, que permanece arquivada como teste visual.

5. **Dados centrais ainda estao espalhados em localStorage**
   - Produtos, clientes, pedidos, configuracoes, insumos e logs estao em chaves separadas.
   - Isso e adequado para esqueleto, mas precisa virar contrato de API antes do backend.
   - Impacto: risco de divergencia ao migrar para banco.

6. **Exports inconsistentes**
   - `historico.html`, `logs.html` e `pedidos.html` possuem exportacao CSV funcional.
   - `produtos.html`, `financas.html`, `promocoes.html`, `usuarios.html` e alguns relatorios possuem botoes de exportar sem funcao real.

7. **Relatorios com botoes visuais**
   - Cards de relatorio e botoes "Baixar" em `relatorios.html` ainda nao geram arquivo.
   - Apenas a parte de entregadores possui logica operacional.

8. **Fluxo de impressao depende do navegador**
   - `thermal-print.js` abre janela de impressao.
   - Funciona como MVP, mas nao garante impressao silenciosa/direta em termica sem configuracao do sistema operacional ou app ponte.

### Baixa prioridade

10. **Arquivos de rascunho na raiz**
    - `teste.html` e `referencia-tailwind.html` falham no HTMLHint porque contem texto antes do `DOCTYPE`.
    - Como nao estao em `pages/`, nao quebram o sistema, mas podem confundir a manutencao.

11. **CSS vazio ou quase vazio em algumas telas**
    - Existem arquivos pequenos como `pedidos.css`, `financas.css`, `usuarios.css`, `relatorios.css`, `entregadores.css`.
    - Nao e erro, mas indica telas ainda baseadas quase totalmente em Tailwind inline.

## Botoes/acoes que precisam virar tarefa

- `produtos.html`: `Exportar Excel`.
- `financas.html`: `Exportar`.
- `promocoes.html`: `Exportar` e persistencia do modal `Nova Promocao`.
- `usuarios.html`: editar usuario salvo e migrar senha local para autenticacao segura no backend.
- `entregadores.html`: registrar retorno de rota e calcular comissao/taxa por pedido.
- `relatorios.html`: cards de relatorios gerais e botoes `Baixar`.
- `dashboard.html`: trocar cards estaticos por calculos reais a partir dos pedidos.

## Recomendacao para a proxima etapa

Antes de partir para backend, estabilizar estes contratos de dados:

1. `Produto`
2. `Adicional`
3. `Insumo`
4. `Receita`
5. `Cliente`
6. `Pedido`
7. `Usuario`
8. `Entregador`
9. `Promocao`
10. `MovimentoFinanceiro`
11. `MovimentoEstoque`
12. `ConfiguracaoLoja`

Contrato ja fechado:
- `CONTRATOS_PEDIDO_CLIENTE.md`

Ordem sugerida de implementacao:

1. Fechar contrato de `Produto`, `Adicional`, `Insumo` e `Receita`.
2. Implementar financeiro real: entradas, saidas, fechamento de caixa e contas a pagar.
3. Migrar localStorage para API/banco mantendo os nomes dos campos ja usados no front.

## Conclusao

O sistema ja tem um esqueleto forte para PDV, pedido online, cozinha, produtos, clientes, insumos, usuarios, entregadores e configuracoes. A parte critica antes da proxima fase e trocar autenticacao local por backend, completar financeiro, promocoes independentes e relatorios finais.
