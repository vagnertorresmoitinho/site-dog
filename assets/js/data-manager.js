/**
 * DogTop Data Manager
 * Gerenciador unificado de dados (Sincroniza LocalStorage <-> Supabase)
 */
(() => {
  const STORAGE_KEY = 'dogtopDataMode'; // 'local' | 'remote' | 'hybrid'
  
  const DataManager = {
    mode: localStorage.getItem(STORAGE_KEY) || 'hybrid',
    
    async init() {
      // Testar conexão com a API do Supabase (se existir)
      if (window.DogtopAPI && typeof window.DogtopAPI.testarConexao === 'function') {
        try {
          const connected = await window.DogtopAPI.testarConexao();
          this.mode = connected ? 'hybrid' : 'local';
        } catch (error) {
          this.mode = 'local';
        }
      } else {
        this.mode = 'local';
      }
      
      localStorage.setItem(STORAGE_KEY, this.mode);
      console.log(`🐕 DataManager inicializado. Modo operacional: ${this.mode.toUpperCase()}`);
      return this.mode;
    },
    
    // ==========================================
    // PRODUTOS
    // ==========================================
    async getProdutos() {
      const local = JSON.parse(localStorage.getItem('dogtopProdutos') || '[]');
      if (this.mode === 'local') return local;
      
      try {
        const remote = await window.DogtopAPI.produtos.listar();
        if (remote && remote.length > 0) {
          localStorage.setItem('dogtopProdutos', JSON.stringify(remote)); // Atualiza cache local
          return remote;
        }
        return local;
      } catch (e) {
        console.warn('Falha ao buscar produtos online, usando cache local.', e.message);
        return local;
      }
    },
    
    async saveProduto(produto) {
      const local = JSON.parse(localStorage.getItem('dogtopProdutos') || '[]');
      const id = produto.id || crypto.randomUUID();
      const existingIndex = local.findIndex(p => p.id === id);
      
      const produtoToSave = { ...produto, id, updatedAt: new Date().toISOString() };
      if (!produtoToSave.createdAt) produtoToSave.createdAt = new Date().toISOString();
      
      if (existingIndex >= 0) {
        local[existingIndex] = produtoToSave;
      } else {
        local.push(produtoToSave);
      }
      localStorage.setItem('dogtopProdutos', JSON.stringify(local)); // Salva local primeiro
      
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          if (existingIndex >= 0) {
            await window.DogtopAPI.produtos.atualizar(id, produtoToSave);
          } else {
            await window.DogtopAPI.produtos.criar(produtoToSave);
          }
        } catch (e) {
          console.warn('Sincronização offline pendente: falha ao salvar produto no Supabase.', e.message);
        }
      }
      return produtoToSave;
    },
    
    // ==========================================
    // CLIENTES
    // ==========================================
    async getClientes() {
      const local = JSON.parse(localStorage.getItem('dogtopClientes') || '[]');
      if (this.mode === 'local') return local;
      
      try {
        const remote = await window.DogtopAPI.clientes.listar();
        if (remote && remote.length > 0) {
          localStorage.setItem('dogtopClientes', JSON.stringify(remote));
          return remote;
        }
        return local;
      } catch (e) {
        console.warn('Falha ao buscar clientes online, usando cache local.', e.message);
        return local;
      }
    },
    
    async saveCliente(cliente) {
      const local = JSON.parse(localStorage.getItem('dogtopClientes') || '[]');
      const id = cliente.id || crypto.randomUUID();
      const existingIndex = local.findIndex(c => c.id === id);
      
      const clienteToSave = { ...cliente, id, updatedAt: new Date().toISOString() };
      if (!clienteToSave.createdAt) clienteToSave.createdAt = new Date().toISOString();
      
      if (existingIndex >= 0) {
        local[existingIndex] = clienteToSave;
      } else {
        local.push(clienteToSave);
      }
      localStorage.setItem('dogtopClientes', JSON.stringify(local));
      
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          if (existingIndex >= 0) {
            await window.DogtopAPI.clientes.atualizar(id, clienteToSave);
          } else {
            await window.DogtopAPI.clientes.criar(clienteToSave);
          }
        } catch (e) {
          console.warn('Sincronização offline pendente: falha ao salvar cliente no Supabase.', e.message);
        }
      }
      return clienteToSave;
    },
    
    // ==========================================
    // PEDIDOS ONLINE
    // ==========================================
    async getPedidos() {
      const local = JSON.parse(localStorage.getItem('dogtopPedidosOnline') || '[]');
      if (this.mode === 'local') return local;
      
      try {
        const remote = await window.DogtopAPI.pedidos.listar();
        if (remote && remote.length > 0) {
          localStorage.setItem('dogtopPedidosOnline', JSON.stringify(remote));
          return remote;
        }
        return local;
      } catch (e) {
        console.warn('Falha ao buscar pedidos online, usando cache local.', e.message);
        return local;
      }
    },
    
    async savePedido(pedido) {
      const local = JSON.parse(localStorage.getItem('dogtopPedidosOnline') || '[]');
      const id = pedido.id || crypto.randomUUID();
      const existingIndex = local.findIndex(p => p.id === id);
      
      const pedidoToSave = { ...pedido, id, updatedAt: new Date().toISOString() };
      if (!pedidoToSave.createdAt) pedidoToSave.createdAt = new Date().toISOString();
      
      if (existingIndex >= 0) {
        local[existingIndex] = pedidoToSave;
      } else {
        local.push(pedidoToSave);
      }
      localStorage.setItem('dogtopPedidosOnline', JSON.stringify(local));
      
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          if (existingIndex >= 0) {
            await window.DogtopAPI.pedidos.atualizar(id, pedidoToSave);
          } else {
            await window.DogtopAPI.pedidos.criar(pedidoToSave);
          }
        } catch (e) {
          console.warn('Sincronização offline pendente: falha ao salvar pedido no Supabase.', e.message);
        }
      }
      return pedidoToSave;
    },
    
    // ==========================================
    // CONFIGURAÇÕES
    // ==========================================
    async getConfig() {
      const local = JSON.parse(localStorage.getItem('dogtopConfiguracoes') || 'null');
      if (this.mode === 'local') return local;
      
      try {
        const remote = await window.DogtopAPI.configuracoes.listar();
        if (remote && remote.length > 0) {
          const config = {};
          remote.forEach(c => { config[c.chave] = c.valor; });
          return config;
        }
      } catch (e) {
        console.warn('Falha ao buscar config online, usando local.', e.message);
      }
      return local;
    },
    
    async saveConfig(chave, valor) {
      const local = JSON.parse(localStorage.getItem('dogtopConfiguracoes') || 'null') || {};
      local[chave] = valor;
      localStorage.setItem('dogtopConfiguracoes', JSON.stringify(local));
      
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          await window.DogtopAPI.configuracoes.atualizar(chave, valor);
        } catch (e) {
          console.warn('Sincronização offline pendente: config.', e.message);
        }
      }
    },
    
    // ==========================================
    // ENTREGADORES
    // ==========================================
    async getEntregadores() {
      const local = JSON.parse(localStorage.getItem('dogtopEntregadores') || '[]');
      if (this.mode === 'local') return local;
      
      try {
        const remote = await window.DogtopAPI.entregadores.listar();
        if (remote && remote.length > 0) {
          localStorage.setItem('dogtopEntregadores', JSON.stringify(remote));
          return remote;
        }
      } catch (e) {
        console.warn('Falha ao buscar entregadores online, usando local.', e.message);
      }
      return local;
    },
    
    async saveEntregador(entregador) {
      const local = JSON.parse(localStorage.getItem('dogtopEntregadores') || '[]');
      const id = entregador.id || crypto.randomUUID();
      const existingIndex = local.findIndex(e => e.id === id);
      
      const entregadorToSave = { ...entregador, id, updatedAt: new Date().toISOString() };
      if (!entregadorToSave.createdAt) entregadorToSave.createdAt = new Date().toISOString();
      
      if (existingIndex >= 0) {
        local[existingIndex] = entregadorToSave;
      } else {
        local.push(entregadorToSave);
      }
      localStorage.setItem('dogtopEntregadores', JSON.stringify(local));
      
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          if (existingIndex >= 0) {
            await window.DogtopAPI.entregadores.atualizar(id, entregadorToSave);
          } else {
            await window.DogtopAPI.entregadores.criar(entregadorToSave);
          }
        } catch (e) {
          console.warn('Sincronização offline pendente: entregador no Supabase.', e.message);
        }
      }
      return entregadorToSave;
    },
    
    // ==========================================
    // USUÁRIOS
    // ==========================================
    async getUsuarios() {
      const local = JSON.parse(localStorage.getItem('dogtopUsuarios') || '[]');
      if (this.mode === 'local') return local;
      
      try {
        const remote = await window.DogtopAPI.usuarios.listar();
        if (remote && remote.length > 0) {
          const formatted = remote.map(u => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            perfil: u.perfil,
            status: u.ativo ? 'Ativo' : 'Bloqueado',
            criadoEm: u.created_at,
            senhaTemporaria: u.senha_hash // Apenas para compatibilidade do fluxo sem backend real
          }));
          localStorage.setItem('dogtopUsuarios', JSON.stringify(formatted));
          return formatted;
        }
      } catch (e) {
        console.warn('Falha ao buscar usuarios online, usando local.', e.message);
      }
      return local;
    },
    
    async saveUsuario(usuario) {
      const local = JSON.parse(localStorage.getItem('dogtopUsuarios') || '[]');
      const id = usuario.id || crypto.randomUUID();
      const existingIndex = local.findIndex(u => u.id === id);
      
      const usuarioToSave = { ...usuario, id, updatedAt: new Date().toISOString() };
      if (!usuarioToSave.criadoEm) usuarioToSave.criadoEm = new Date().toISOString();
      
      if (existingIndex >= 0) {
        local[existingIndex] = usuarioToSave;
      } else {
        local.push(usuarioToSave);
      }
      localStorage.setItem('dogtopUsuarios', JSON.stringify(local));
      
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          const dbData = {
            id: usuarioToSave.id,
            nome: usuarioToSave.nome,
            email: usuarioToSave.email,
            perfil: usuarioToSave.perfil,
            ativo: usuarioToSave.status === 'Ativo',
            senha_hash: usuarioToSave.senhaTemporaria || '123456'
          };
          if (existingIndex >= 0) {
            await window.DogtopAPI.usuarios.atualizar(id, dbData);
          } else {
            await window.DogtopAPI.usuarios.criar(dbData);
          }
        } catch (e) {
          console.warn('Sincronização offline pendente: usuario no Supabase.', e.message);
        }
      }
      return usuarioToSave;
    },

    // ==========================================
    // ESTOQUE (Insumos, Receitas, Movimentos)
    // ==========================================
    async getInsumos() {
      const local = JSON.parse(localStorage.getItem('dogtopInsumos') || '[]');
      if (this.mode === 'local') return local;
      try {
        const remote = await window.DogtopAPI.insumos.listar();
        if (remote && remote.length > 0) {
          localStorage.setItem('dogtopInsumos', JSON.stringify(remote));
          return remote;
        }
      } catch (e) { console.warn('Falha ao buscar insumos', e); }
      return local;
    },
    
    async saveInsumo(insumo) {
      const local = JSON.parse(localStorage.getItem('dogtopInsumos') || '[]');
      const id = insumo.id || crypto.randomUUID();
      const existingIndex = local.findIndex(i => i.id === id);
      const insumoToSave = { ...insumo, id, atualizadoEm: new Date().toISOString() };
      if (existingIndex >= 0) local[existingIndex] = insumoToSave;
      else local.push(insumoToSave);
      localStorage.setItem('dogtopInsumos', JSON.stringify(local));
      
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          if (existingIndex >= 0) await window.DogtopAPI.insumos.atualizar(id, insumoToSave);
          else await window.DogtopAPI.insumos.criar(insumoToSave);
        } catch(e) { console.warn('Falha sync insumo', e); }
      }
      return insumoToSave;
    },
    
    async getReceitas() {
      const local = JSON.parse(localStorage.getItem('dogtopReceitas') || '{}');
      if (this.mode === 'local') return local;
      try {
        const remote = await window.DogtopAPI.receitas.listar();
        if (remote && remote.length > 0) {
          const map = {};
          remote.forEach(r => { map[r.id] = r.itens; });
          localStorage.setItem('dogtopReceitas', JSON.stringify(map));
          return map;
        }
      } catch (e) { console.warn('Falha ao buscar receitas', e); }
      return local;
    },
    
    async saveReceita(produtoId, itens) {
      const local = JSON.parse(localStorage.getItem('dogtopReceitas') || '{}');
      local[produtoId] = itens;
      localStorage.setItem('dogtopReceitas', JSON.stringify(local));
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          await window.DogtopAPI.receitas.atualizar(produtoId, itens);
        } catch(e) { console.warn('Falha sync receita', e); }
      }
    },
    
    async saveMovimento(movimento) {
      const local = JSON.parse(localStorage.getItem('dogtopMovimentosEstoque') || '[]');
      const id = movimento.id || crypto.randomUUID();
      const movToSave = { ...movimento, id, criadoEm: new Date().toISOString() };
      local.unshift(movToSave);
      localStorage.setItem('dogtopMovimentosEstoque', JSON.stringify(local.slice(0, 500)));
      if (this.mode !== 'local' && window.DogtopAPI) {
        try {
          await window.DogtopAPI.movimentos.criar(movToSave);
        } catch(e) { console.warn('Falha sync mov', e); }
      }
      return movToSave;
    }
  };
  
  // Torna global para que todas as telas possam acessar
  window.DogtopData = DataManager;
  window.dataManager = dataManager;
})();