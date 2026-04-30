document.body.dataset.page = 'clientes';

(() => {
  const CLIENTS_STORAGE_KEY = 'dogtopClientes';
  const CURRENT_CLIENT_KEY = 'dogtopClienteSelecionado';

  const form = document.getElementById('client-form');
  const listElement = document.getElementById('client-list');
  const searchInput = document.getElementById('client-search');
  const countElement = document.getElementById('client-count');
  const avatar = document.getElementById('client-avatar');
  const balanceElement = document.getElementById('client-balance');
  const ordersEmpty = document.getElementById('client-orders-empty');
  const ordersList = document.getElementById('client-orders-list');
  const newButton = document.getElementById('client-new');
  const clearButton = document.getElementById('client-clear');
  const deleteButton = document.getElementById('client-delete');
  const addBalanceButton = document.getElementById('client-balance-add');
  const subtractBalanceButton = document.getElementById('client-balance-subtract');
  const newOrderButton = document.getElementById('client-new-order');
  const openMapButton = document.getElementById('client-open-map');

  if (!form || !listElement) return;

  const formatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeNumber = (value) => {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const normalizeSearch = (value) => normalizeText(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const getNextId = () => String(clients.reduce((max, client) => {
    const numericId = Number.parseInt(client.id, 10);
    return Number.isNaN(numericId) ? max : Math.max(max, numericId);
  }, 0) + 1).padStart(3, '0');

  function normalizeClient(client) {
    return {
      id: String(client.id || ''),
      nome: normalizeText(client.nome) || 'Cliente sem nome',
      cpfCnpj: normalizeText(client.cpfCnpj),
      observacoes: normalizeText(client.observacoes),
      email: normalizeText(client.email),
      ddiCelular: normalizeText(client.ddiCelular) || '+55',
      telefoneCelular: normalizeText(client.telefoneCelular || client.telefone),
      ddiTelefone: normalizeText(client.ddiTelefone) || '+55',
      telefone: normalizeText(client.telefone),
      endereco: normalizeText(client.endereco),
      numero: normalizeText(client.numero),
      bairro: normalizeText(client.bairro),
      cep: normalizeText(client.cep),
      complemento: normalizeText(client.complemento),
      pontoReferencia: normalizeText(client.pontoReferencia),
      status: normalizeText(client.status) || 'Ativo',
      saldo: normalizeNumber(client.saldo),
      pedidosHistorico: Array.isArray(client.pedidosHistorico) ? client.pedidosHistorico : [],
      criadoEm: client.criadoEm || new Date().toISOString(),
      atualizadoEm: client.atualizadoEm || new Date().toISOString()
    };
  }

  let clients = [];
  let selectedClientId = localStorage.getItem(CURRENT_CLIENT_KEY) || '';

  const loadClients = async () => {
    const data = await window.DogtopData.getClientes();
    clients = Array.isArray(data) ? data.map(normalizeClient) : [];
    if (!selectedClientId && clients.length > 0) {
      selectedClientId = clients[0].id;
    }
  };

  const getSelectedClient = () => clients.find((client) => client.id === selectedClientId) || null;
  const getInitials = (name) => normalizeText(name).split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'DT';
  const getAddress = (client) => [client.endereco, client.numero, client.bairro, client.cep, client.complemento].map(normalizeText).filter(Boolean).join(', ');

  const maskPhone = (value) => {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const maskCep = (value) => {
    const digits = onlyDigits(value).slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const fillForm = (client = null) => {
    form.reset();
    const data = client || {
      id: '',
      nome: '',
      cpfCnpj: '',
      observacoes: '',
      email: '',
      ddiCelular: '+55',
      telefoneCelular: '',
      ddiTelefone: '+55',
      telefone: '',
      endereco: '',
      numero: '',
      bairro: '',
      cep: '',
      complemento: '',
      pontoReferencia: '',
      saldo: 0,
      pedidosHistorico: []
    };
    Object.entries(data).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = value ?? '';
    });
    if (form.elements.namedItem('ddiCelular')) form.elements.namedItem('ddiCelular').value = data.ddiCelular || '+55';
    if (form.elements.namedItem('ddiTelefone')) form.elements.namedItem('ddiTelefone').value = data.ddiTelefone || '+55';
    avatar.textContent = getInitials(data.nome);
    balanceElement.textContent = formatter.format(data.saldo || 0);
    renderOrders(data);
  };

  const renderOrders = (client) => {
    const orders = Array.isArray(client?.pedidosHistorico) ? client.pedidosHistorico.slice(0, 6) : [];
    ordersEmpty.classList.toggle('hidden', orders.length > 0);
    ordersList.classList.toggle('hidden', orders.length === 0);
    ordersList.innerHTML = orders.map((order) => `
      <div class="client-order-item">
        <strong>${escapeHtml(order.id || order.pedidoId || 'Pedido')}</strong>
        <span>${escapeHtml(order.data || order.criadoEm || '')}</span>
        <span>${formatter.format(normalizeNumber(order.total))}</span>
      </div>
    `).join('');
  };

  const getFilteredClients = () => {
    const term = normalizeSearch(searchInput.value);
    return clients.filter((client) => {
      const haystack = normalizeSearch([client.nome, client.telefoneCelular, client.telefone, client.endereco, client.bairro, client.cep].join(' '));
      return !term || haystack.includes(term);
    });
  };

  const renderList = () => {
    const filtered = getFilteredClients();
    countElement.textContent = `${clients.length} ${clients.length === 1 ? 'cadastrado' : 'cadastrados'}`;
    listElement.innerHTML = filtered.length ? filtered.map((client) => `
      <button type="button" class="client-list-item ${client.id === selectedClientId ? 'active' : ''}" data-client-id="${escapeHtml(client.id)}">
        <strong>${escapeHtml(client.nome)}</strong>
        <span>${escapeHtml(client.telefoneCelular || 'Sem telefone')}</span>
        <span>${escapeHtml(getAddress(client) || 'Sem endereço')}</span>
      </button>
    `).join('') : '<div class="client-list-item"><strong>Nenhum cliente encontrado.</strong><span>Cadastre um novo cliente.</span></div>';
  };

  const render = () => {
    renderList();
    fillForm(getSelectedClient());
  };

  const readForm = () => {
    const formData = new FormData(form);
    const existing = getSelectedClient();
    return normalizeClient({
      ...(existing || {}),
      id: normalizeText(formData.get('id')) || existing?.id || getNextId(),
      nome: formData.get('nome'),
      cpfCnpj: formData.get('cpfCnpj'),
      observacoes: formData.get('observacoes'),
      email: formData.get('email'),
      ddiCelular: formData.get('ddiCelular'),
      telefoneCelular: formData.get('telefoneCelular'),
      ddiTelefone: formData.get('ddiTelefone'),
      telefone: formData.get('telefone'),
      endereco: formData.get('endereco'),
      numero: formData.get('numero'),
      bairro: formData.get('bairro'),
      cep: formData.get('cep'),
      complemento: formData.get('complemento'),
      pontoReferencia: formData.get('pontoReferencia'),
      saldo: existing?.saldo || 0,
      pedidosHistorico: existing?.pedidosHistorico || [],
      atualizadoEm: new Date().toISOString()
    });
  };

  const saveClient = async (client) => {
    try {
      const savedClient = await window.DogtopData.saveCliente(client);
      const index = clients.findIndex((item) => item.id === savedClient.id);
      if (index >= 0) clients[index] = savedClient;
      else clients.unshift(savedClient);

      selectedClientId = savedClient.id;
      localStorage.setItem(CURRENT_CLIENT_KEY, selectedClientId);

      window.DogtopAudit?.log?.({
        modulo: 'Clientes',
        acao: 'Cliente salvo',
        entidade: savedClient.id,
        detalhe: `${savedClient.nome} salvo na base de clientes.`,
        dados: { id: savedClient.id, telefone: savedClient.telefoneCelular }
      });
      render();
    } catch (e) {
      console.error('Falha ao salvar cliente', e);
      window.alert('Ocorreu um erro ao salvar o cliente.');
    }
  };

  const clearForm = () => {
    selectedClientId = '';
    localStorage.removeItem(CURRENT_CLIENT_KEY);
    fillForm(null);
    renderList();
    form.elements.namedItem('nome')?.focus();
  };

  const adjustBalance = async (direction) => {
    const client = getSelectedClient();
    if (!client) {
      window.alert('Salve o cliente antes de movimentar saldo.');
      return;
    }
    const raw = window.prompt(direction === 'add' ? 'Valor para adicionar:' : 'Valor para subtrair:');
    if (raw === null) return;
    const value = Math.abs(normalizeNumber(raw));
    if (!value) return;
    client.saldo = direction === 'add' ? client.saldo + value : client.saldo - value;
    client.atualizadoEm = new Date().toISOString();
    
    await window.DogtopData.saveCliente(client);
    render();
  };

  const getMapQueryFromForm = () => {
    const data = new FormData(form);
    return [
      data.get('endereco'),
      data.get('numero'),
      data.get('bairro'),
      data.get('cep'),
      'Sapezal MT',
      data.get('pontoReferencia')
    ].map(normalizeText).filter(Boolean).join(', ');
  };

  const openGoogleMaps = () => {
    const query = getMapQueryFromForm();
    if (!query) {
      window.alert('Preencha pelo menos o endereco ou o bairro antes de abrir o mapa.');
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener');
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    await saveClient(readForm());
  });

  listElement.addEventListener('click', (event) => {
    const button = event.target.closest('[data-client-id]');
    if (!button) return;
    selectedClientId = button.dataset.clientId;
    localStorage.setItem(CURRENT_CLIENT_KEY, selectedClientId);
    render();
  });

  searchInput.addEventListener('input', renderList);
  newButton.addEventListener('click', clearForm);
  clearButton.addEventListener('click', clearForm);
  addBalanceButton.addEventListener('click', async () => await adjustBalance('add'));
  subtractBalanceButton.addEventListener('click', async () => await adjustBalance('subtract'));
  openMapButton?.addEventListener('click', openGoogleMaps);
  newOrderButton.addEventListener('click', () => {
    const client = getSelectedClient();
    if (client) localStorage.setItem('dogtopClientePedidoAtual', JSON.stringify(client));
    window.location.href = './vendas.html';
  });
  deleteButton.addEventListener('click', () => {
    const client = getSelectedClient();
    if (!client) return;
    if (!window.confirm(`Excluir o cadastro de ${client.nome}?`)) return;
    clients = clients.filter((item) => item.id !== client.id);
    selectedClientId = clients[0]?.id || '';
    
    // Como a API não possui método delete explícito no DataManager,
    // atualizamos o localStorage diretamente como fallback
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    render();
  });

  ['telefoneCelular', 'telefone'].forEach((fieldName) => {
    form.elements.namedItem(fieldName)?.addEventListener('input', (event) => {
      event.target.value = maskPhone(event.target.value);
    });
  });
  form.elements.namedItem('cep')?.addEventListener('input', (event) => {
    event.target.value = maskCep(event.target.value);
  });

  // Inicialização assíncrona
  loadClients().then(() => {
    render();
  });
})();
