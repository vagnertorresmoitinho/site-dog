# Plano de Migração: localStorage → Supabase

## Status Atual

O sistema Dogtop currently operates with a hybrid architecture:
- **Frontend**: HTML/CSS/JS pages (static)
- **Data**: localStorage (browser-local)
- **Backend**: Supabase (already configured but underutilized)

### O que já existe

1. **config.js** - Configurações locais (empresa, pagamentos, taxa entrega)
2. **api.js** - Módulo de API para Supabase (produtos, clientes, pedidos, configurações)
3. **Schema Supabase** - Tabelas criadas (produtos, adicionais, clientes, entregadores, pedidos, entregas, itens_pedido)

### O que precisa ser migrado

| localStorage | Tabela Supabase | Status |
|--------------|-----------------|--------|
| dogtopProdutos | produtos | Parcial (1 registro) |
| dogtopClientes | clientes | Precisa criar |
| dogtopPedidosOnline | pedidos | Precisa criar |
| dogtopPedidoRascunho | pedidos (rascunho) | Precisa criar |
| dogtopConfiguracoes | configuracoes | Precisa criar |
| dogtopAuditLogs | audit_logs | Precisa criar |

---

## Fase 1: Preparação do Banco

### 1.1 Atualizar Schema

O schema atual precisa de campos adicionais para suportar o modelo de negócio:

```sql
-- Atualizar tabela produtos
alter table produtos add column if not exists categoria text;
alter table produtos add column if not exists descricao text;
alter table produtos add column if not exists imagem text;
alter table produtos add column if not exists preco_promocional numeric(10,2);
alter table produtos add column if not exists estoque integer default 0;
alter table produtos add column if not exists tempo_preparo_minutos integer;
alter table produtos add column if not exists ingredientes text[];
alter table produtos add column if not exists tags text[];

-- Atualizar tabela clientes
alter table clientes add column if not exists cpf_cnpj text;
alter table clientes add column if not exists email text;
alter table clientes add column if not exists numero text;
alter table clientes add column if not exists cep text;
alter table clientes add column if not exists complemento text;
alter table clientes add column if not exists ddi_celular text default '+55';
alter table clientes add column if not exists ddi_telefone text default '+55';
alter table clientes add column if not exists status text default 'Ativo';
alter table clientes add column if not exists saldo numeric(10,2) default 0;

-- Atualizar tabela pedidos
alter table pedidos add column if not exists telefone text;
alter table pedidos add column if not exists nome_cliente text;
alter table pedidos add column if not exists tipo_entrega text default 'Presencial';
alter table pedidos add column if not exists endereco_entrega text;
alter table pedidos add column if not exists bairro text;
alter table pedidos add column if not exists ponto_referencia text;
alter table pedidos add column if not exists forma_pagamento text;
alter table pedidos add column if not exists troco_para numeric(10,2);
alter table pedidos add column if not exists troco_devolver numeric(10,2);
alter table pedidos add column if not exists subtotal_original numeric(10,2);
alter table pedidos add column if not exists desconto numeric(10,2) default 0;
alter table pedidos add column if not exists subtotal numeric(10,2);
alter table pedidos add column if not exists taxa_entrega numeric(10,2) default 0;
alter table pedidos add column if not exists observacao text;

-- Criar tabela de configurações
create table if not exists configuracoes (
    id uuid primary key default gen_random_uuid(),
    chave text unique not null,
    valor jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Criar tabela de audit logs
create table if not exists audit_logs (
    id uuid primary key default gen_random_uuid(),
    acao text not null,
    entidade text not null,
    entidade_id text,
    dados_old jsonb,
    dados_new jsonb,
    usuario text,
    ip text,
    created_at timestamptz default now()
);

-- Criar tabela de áreas de entrega
create table if not exists areas_entrega (
    id uuid primary key default gen_random_uuid(),
    cidade text not null,
    bairro text not null,
    taxa_entrega numeric(10,2) not null,
    ativo boolean default true,
    created_at timestamptz default now()
);
```

---

## Fase 2: Criar Camada de Dados Unificada

### 2.1 Novo módulo data-manager.js

Criar um módulo central que gerencia a comunicação entre localStorage e Supabase:

```javascript
// assets/js/data-manager.js
(() => {
  const STORAGE_KEY = 'dataManagerMode'; // 'local' | 'remote' | 'hybrid'
  
  // Configuração de modo
  const DataManager = {
    mode: 'hybrid', // padrão: tenta remoto, cai para local
    
    async init() {
      // Testar conexão Supabase
      const connected = await window.DogtopAPI?.testarConexao();
      this.mode = connected ? 'hybrid' : 'local';
      console.log(`🐕 DataManager: Modo ${this.mode}`);
      return this.mode;
    },
    
    // Produtos
    async getProdutos() {
      if (this.mode === 'local' || this.mode === 'hybrid') {
        const local = JSON.parse(localStorage.getItem('dogtopProdutos') || '[]');
        if (this.mode === 'local') return local;
        
        try {
          const remote = await window.DogtopAPI.produtos.listar();
          // Sincronizar: remoto tem prioridade
          return remote.length > 0 ? remote : local;
        } catch {
          return local;
        }
      }
      return await window.DogtopAPI.produtos.listar();
    },
    
    async saveProduto(produto) {
      // Sempre salvar local primeiro
      const local = JSON.parse(localStorage.getItem('dogtopProdutos') || '[]');
      const existingIndex = local.findIndex(p => p.id === produto.id);
      
      if (existingIndex >= 0) {
        local[existingIndex] = { ...produto, updatedAt: new Date().toISOString() };
      } else {
        local.push({ ...produto, id: produto.id || crypto.randomUUID(), createdAt: new Date().toISOString() });
      }
      localStorage.setItem('dogtopProdutos', JSON.stringify(local));
      
      // Se conectado, sincronizar
      if (this.mode !== 'local') {
        try {
          await window.DogtopAPI.produtos.criar(produto);
        } catch (e) {
          console.warn('Sincronização offline:', e.message);
        }
      }
      return produto;
    },
    
    // Clientes
    async getClientes() {
      if (this.mode === 'local' || this.mode === 'hybrid') {
        const local = JSON.parse(localStorage.getItem('dogtopClientes') || '[]');
        if (this.mode === 'local') return local;
        
        try {
          const remote = await window.DogtopAPI.clientes.listar();
          return remote.length > 0 ? remote : local;
        } catch {
          return local;
        }
      }
      return await window.DogtopAPI.clientes.listar();
    },
    
    async saveCliente(cliente) {
      const local = JSON.parse(localStorage.getItem('dogtopClientes') || '[]');
      const existingIndex = local.findIndex(c => c.id === cliente.id);
      
      if (existingIndex >= 0) {
        local[existingIndex] = { ...cliente, updatedAt: new Date().toISOString() };
      } else {
        local.push({ ...cliente, id: cliente.id || crypto.randomUUID(), createdAt: new Date().toISOString() });
      }
      localStorage.setItem('dogtopClientes', JSON.stringify(local));
      
      if (this.mode !== 'local') {
        try {
          await window.DogtopAPI.clientes.criar(cliente);
        } catch (e) {
          console.warn('Sincronização offline:', e.message);
        }
      }
      return cliente;
    },
    
    // Pedidos
    async getPedidos() {
      if (this.mode === 'local' || this.mode === 'hybrid') {
        const local = JSON.parse(localStorage.getItem('dogtopPedidosOnline') || '[]');
        if (this.mode === 'local') return local;
        
        try {
          const remote = await window.DogtopAPI.pedidos.listar();
          return remote.length > 0 ? remote : local;
        } catch {
          return local;
        }
      }
      return await window.DogtopAPI.pedidos.listar();
    },
    
    async savePedido(pedido) {
      const local = JSON.parse(localStorage.getItem('dogtopPedidosOnline') || '[]');
      const existingIndex = local.findIndex(p => p.id === pedido.id);
      
      if (existingIndex >= 0) {
        local[existingIndex] = { ...pedido, updatedAt: new Date().toISOString() };
      } else {
        local.push({ ...pedido, id: pedido.id || crypto.randomUUID(), createdAt: new Date().toISOString() });
      }
      localStorage.setItem('dogtopPedidosOnline', JSON.stringify(local));
      
      if (this.mode !== 'local') {
        try {
          await window.DogtopAPI.pedidos.criar(pedido);
        } catch (e) {
          console.warn('Sincronização offline:', e.message);
        }
      }
      return pedido;
    },
    
    // Configurações
    async getConfig() {
      if (this.mode === 'local' || this.mode === 'hybrid') {
        const local = JSON.parse(localStorage.getItem('dogtopConfiguracoes') || 'null');
        if (this.mode === 'local') return local;
        
        try {
          const remote = await window.DogtopAPI.configuracoes.listar();
          if (remote.length > 0) {
            // Converter array para objeto
            const config = {};
            remote.forEach(c => { config[c.chave] = c.valor; });
            return config;
          }
        } catch {
          // ignore
        }
        return local;
      }
      const remote = await window.DogtopAPI.configuracoes.listar();
      const config = {};
      remote.forEach(c => { config[c.chave] = c.valor; });
      return config;
    },
    
    async saveConfig(chave, valor) {
      // Salvar local
      const local = JSON.parse(localStorage.getItem('dogtopConfiguracoes') || 'null') || {};
      local[chave] = valor;
      localStorage.setItem('dogtopConfiguracoes', JSON.stringify(local));
      
      if (this.mode !== 'local') {
        try {
          await window.DogtopAPI.configuracoes.atualizar(chave, valor);
        } catch (e) {
          console.warn('Sincronização offline:', e.message);
        }
      }
    }
  };
  
  window.DataManager = DataManager;
})();
```

---

## Fase 3: Atualizar Páginas para Usar DataManager

### 3.1 Padrão de atualização

Cada página que usa localStorage precisa ser atualizada para:

1. Importar `DataManager` (ou usar window.DataManager)
2. Substituir `localStorage.getItem('dogtopX')` por `await DataManager.getX()`
3. Substituir `localStorage.setItem('dogtopX', ...)` por `await DataManager.saveX(...)`

### 3.2 Arquivos a atualizar

| Arquivo | Função | Mudança Principal |
|---------|--------|-------------------|
| pages/produtos.html + js | Cadastro produtos | getProdutos/saveProduto |
| pages/clientes.html + js | Cadastro clientes | getClientes/saveCliente |
| pages/vendas.html + js | PDV/Vendas | getProdutos/savePedido |
| pages/pedidos.html + js | Lista pedidos | getPedidos |
| pages/pagamento-pedido.html + js | Checkout | savePedido/saveCliente |
| pages/configuracoes.html + js | Config sistema | getConfig/saveConfig |

---

## Fase 4: Sincronização Inicial

### 4.1 Script de migração

Criar página de migração para trazer dados do localStorage para o Supabase:

```html
<!-- pages/migracao.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Migração de Dados</title>
</head>
<body>
  <h1>🗄️ Migração de Dados</h1>
  <div id="status"></div>
  <button onclick="executarMigração()">Iniciar Migração</button>
  
  <script>
    async function executarMigração() {
      const status = document.getElementById('status');
      
      // 1. Migrar Produtos
      status.innerHTML += '<p>📦 Migrando produtos...</p>';
      const produtos = JSON.parse(localStorage.getItem('dogtopProdutos') || '[]');
      for (const p of produtos) {
        try {
          await window.DogtopAPI.produtos.criar(p);
        } catch (e) {
          console.log('Produto já existe:', p.nome);
        }
      }
      status.innerHTML += `<p>✅ ${produtos.length} produtos migrados</p>`;
      
      // 2. Migrar Clientes
      status.innerHTML += '<p>👥 Migrando clientes...</p>';
      const clientes = JSON.parse(localStorage.getItem('dogtopClientes') || '[]');
      for (const c of clientes) {
        try {
          await window.DogtopAPI.clientes.criar(c);
        } catch (e) {
          console.log('Cliente já existe:', c.nome);
        }
      }
      status.innerHTML += `<p>✅ ${clientes.length} clientes migrados</p>`;
      
      // 3. Migrar Pedidos
      status.innerHTML += '<p>📋 Migrando pedidos...</p>';
      const pedidos = JSON.parse(localStorage.getItem('dogtopPedidosOnline') || '[]');
      for (const p of pedidos) {
        try {
          await window.DogtopAPI.pedidos.criar(p);
        } catch (e) {
          console.log('Pedido já existe:', p.id);
        }
      }
      status.innerHTML += `<p>✅ ${pedidos.length} pedidos migrados</p>`;
      
      status.innerHTML += '<p>🎉 Migração concluída!</p>';
    }
  </script>
</body>
</html>
```

---

## Fase 5: Modo Offline

### 5.1 Estratégia

O sistema deve funcionar mesmo sem internet:

1. **Detecção**: Testar conexão ao iniciar
2. **Fallback**: Se offline, usar localStorage
3. **Sync**: Quando online, sincronizar dados pendentes
4. **Conflict Resolution**: Última alteração wins (ou data mais recente)

### 5.2 Indicador de status

Adicionar indicador visual no painel:

```javascript
// No header do painel
const statusIndicator = () => {
  const mode = window.DataManager?.mode || 'unknown';
  const colors = { local: 'red', hybrid: 'orange', remote: 'green' };
  return `<span style="color: ${colors[mode] || 'gray'}">●</span> ${mode.toUpperCase()}`;
};
```

---

## Cronograma Sugerido

| Fase | Descrição | Esforço |
|------|-----------|---------|
| 1 | Atualizar schema do banco | 1 dia |
| 2 | Criar data-manager.js | 2 dias |
| 3 | Atualizar páginas (produtos, clientes) | 2 dias |
| 4 | Atualizar páginas (vendas, pedidos) | 2 dias |
| 5 | Criar página de migração | 1 dia |
| 6 | Testes e ajustes | 2 dias |

**Total estimado**: 10 dias

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Perda de dados na migração | Fazer backup do localStorage antes |
| Conflitos de sincronização | Usar timestamp para resolver |
| Performance com muitos dados | Paginar requisições |
| API key exposta | Usar RLS policies no Supabase |
| Dados sensíveis expostos | Criptografar dados sensíveis |

---

## Próximos Passos Imediatos

1. ✅ Revisar este plano
2. ⬜ Executar Fase 1 (atualizar schema)
3. ⬜ Criar data-manager.js
4. ⬜ Testar em ambiente de desenvolvimento
5. ⬜ Executar migração inicial
6. ⬜ Atualizar páginas uma por uma
7. ⬜ Monitorar e ajustar

---

*Documento gerado em: 2026-04-30*
*Versão: 1.0*