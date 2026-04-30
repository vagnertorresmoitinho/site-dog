// ============================================
// DOGTOP - API DE COMUNICAÇÃO COM O SUPABASE
// ============================================

(() => {
  // Verificar se as credenciais estão configuradas
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error('DogTop API: Credenciais do Supabase não configuradas em config.js');
    return;
  }

  // Utilitário para converter camelCase do frontend para snake_case do banco
  const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  
  // Limpa o objeto antes de enviar pro Supabase (remove arrays aninhados e converte chaves)
  const prepareForDB = (dados) => {
    if (!dados) return dados;
    const cleanData = {};
    Object.entries(dados).forEach(([key, value]) => {
      // Ignora arrays aninhados (como itens e pedidosHistorico) que dão erro na inserção da tabela pai
      if (Array.isArray(value) || (value !== null && typeof value === 'object')) return;
      cleanData[toSnakeCase(key)] = value;
    });
    return cleanData;
  };

  // Criar cliente Supabase (usando a biblioteca fetch nativa)
  const supabaseFetch = async (endpoint, options = {}) => {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    
    const defaultHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Erro HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('DogTop API Error:', error);
      throw error;
    }
  };

  // ============================================
  // PRODUTOS
  // ============================================
  const ProdutosAPI = {
    async listar() {
      return await supabaseFetch('produtos?ativo=eq.true&order=nome');
    },
    
    async buscar(id) {
      return await supabaseFetch(`produtos?id=eq.${id}`);
    },
    
    async criar(dados) {
      return await supabaseFetch('produtos', {
        method: 'POST',
        body: JSON.stringify(prepareForDB(dados))
      });
    },
    
    async atualizar(id, dados) {
      return await supabaseFetch(`produtos?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(prepareForDB(dados))
      });
    },
    
    async deletar(id) {
      return await supabaseFetch(`produtos?id=eq.${id}`, {
        method: 'DELETE'
      });
    }
  };

  // ============================================
  // ADICIONAIS
  // ============================================
  const AdicionaisAPI = {
    async listar() {
      return await supabaseFetch('adicionais?ativo=eq.true&order=nome');
    },
    
    async criar(dados) {
      return await supabaseFetch('adicionais', {
        method: 'POST',
        body: JSON.stringify(prepareForDB(dados))
      });
    },
    
    async atualizar(id, dados) {
      return await supabaseFetch(`adicionais?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(prepareForDB(dados))
      });
    }
  };

  // ============================================
  // CLIENTES
  // ============================================
  const ClientesAPI = {
    async listar() {
      return await supabaseFetch('clientes?order=created_at.desc');
    },
    
    async buscarPorTelefone(telefone) {
      const telefoneLimpo = telefone.replace(/\D/g, '');
      return await supabaseFetch(`clientes?telefone=like.*${telefoneLimpo}*`);
    },
    
    async buscar(id) {
      return await supabaseFetch(`clientes?id=eq.${id}`);
    },
    
    async criar(dados) {
      return await supabaseFetch('clientes', {
        method: 'POST',
        body: JSON.stringify(prepareForDB(dados))
      });
    },
    
    async atualizar(id, dados) {
      return await supabaseFetch(`clientes?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(prepareForDB(dados))
      });
    }
  };

  // ============================================
  // PEDIDOS
  // ============================================
  const PedidosAPI = {
    async listar(filtros = {}) {
      let query = 'pedidos?order=created_at.desc';
      
      if (filtros.status) {
        query += `&status=eq.${filtros.status}`;
      }
      if (filtros.cliente_id) {
        query += `&cliente_id=eq.${filtros.cliente_id}`;
      }
      
      return await supabaseFetch(query);
    },
    
    async buscar(id) {
      return await supabaseFetch(`pedidos?id=eq.${id}`);
    },
    
    async criar(dados) {
      return await supabaseFetch('pedidos', {
        method: 'POST',
        body: JSON.stringify(prepareForDB(dados))
      });
    },
    
    async atualizar(id, dados) {
      return await supabaseFetch(`pedidos?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(prepareForDB(dados))
      });
    },
    
    async buscarItens(pedidoId) {
      return await supabaseFetch(`itens_pedido?pedido_id=eq.${pedidoId}&order=created_at`);
    },
    
    async criarItem(dados) {
      return await supabaseFetch('itens_pedido', {
        method: 'POST',
        body: JSON.stringify(dados)
      });
    }
  };

  // ============================================
  // CONFIGURAÇÕES
  // ============================================
  const ConfigAPI = {
    async listar() {
      return await supabaseFetch('configuracoes');
    },
    
    async buscar(chave) {
      return await supabaseFetch(`configuracoes?chave=eq.${chave}`);
    },
    
    async atualizar(chave, valor) {
      // Primeiro tenta atualizar
      const existing = await supabaseFetch(`configuracoes?chave=eq.${chave}`);
      
      if (existing && existing.length > 0) {
        return await supabaseFetch(`configuracoes?chave=eq.${chave}`, {
          method: 'PATCH',
          body: JSON.stringify({ valor })
        });
      } else {
        // Se não existir, cria
        return await supabaseFetch('configuracoes', {
          method: 'POST',
          body: JSON.stringify({ chave, valor })
        });
      }
    }
  };

  // ============================================
  // ENTREGADORES
  // ============================================
  const EntregadoresAPI = {
    async listar() {
      return await supabaseFetch('entregadores?ativo=eq.true&order=nome');
    },
    
    async criar(dados) {
      return await supabaseFetch('entregadores', {
        method: 'POST',
        body: JSON.stringify(prepareForDB(dados))
      });
    },
    
    async atualizar(id, dados) {
      return await supabaseFetch(`entregadores?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(prepareForDB(dados))
      });
    }
  };

  // ============================================
  // USUÁRIOS
  // ============================================
  const UsuariosAPI = {
    async listar() {
      return await supabaseFetch('usuarios_admin?order=nome');
    },
    
    async criar(dados) {
      return await supabaseFetch('usuarios_admin', {
        method: 'POST',
        body: JSON.stringify(prepareForDB(dados))
      });
    },
    
    async atualizar(id, dados) {
      return await supabaseFetch(`usuarios_admin?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(prepareForDB(dados))
      });
    }
  };

  // ============================================
  // ESTOQUE
  // ============================================
  const InsumosAPI = {
    async listar() { return await supabaseFetch('insumos?order=nome'); },
    async criar(dados) { return await supabaseFetch('insumos', { method: 'POST', body: JSON.stringify(prepareForDB(dados)) }); },
    async atualizar(id, dados) { return await supabaseFetch(`insumos?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(prepareForDB(dados)) }); }
  };
  
  const ReceitasAPI = {
    async listar() { return await supabaseFetch('receitas'); },
    async atualizar(id, itens) {
      const existing = await supabaseFetch(`receitas?id=eq.${id}`);
      if (existing && existing.length > 0) {
        return await supabaseFetch(`receitas?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ itens }) });
      }
      return await supabaseFetch('receitas', { method: 'POST', body: JSON.stringify({ id, itens }) });
    }
  };
  
  const MovimentosAPI = {
    async listar() { return await supabaseFetch('movimentos_estoque?order=criado_em.desc&limit=500'); },
    async criar(dados) { return await supabaseFetch('movimentos_estoque', { method: 'POST', body: JSON.stringify(prepareForDB(dados)) }); }
  };

  // ============================================
  // EXPORtar API GLOBAL
  // ============================================
  window.DogtopAPI = {
    produtos: ProdutosAPI,
    adicionais: AdicionaisAPI,
    clientes: ClientesAPI,
    pedidos: PedidosAPI,
    configuracoes: ConfigAPI,
    entregadores: EntregadoresAPI,
    usuarios: UsuariosAPI,
    insumos: InsumosAPI,
    receitas: ReceitasAPI,
    movimentos: MovimentosAPI,
    
    // Método de teste de conexão
    async testarConexao() {
      try {
        const result = await supabaseFetch('produtos?select=count');
        console.log('✅ DogTop API: Conexão estabelecida com sucesso!');
        return true;
      } catch (error) {
        console.error('❌ DogTop API: Erro na conexão:', error.message);
        return false;
      }
    }
  };

  // Testar conexão automaticamente
  console.log('🐕 DogTop API inicializada');
  window.DogtopAPI.testarConexao();

})();