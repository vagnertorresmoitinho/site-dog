document.body.dataset.page = 'entregadores';

(() => {
  const STORAGE_KEY = 'dogtopEntregadores';
  const ORDERS_STORAGE_KEY = 'dogtopPedidosOnline';

  const listElement = document.getElementById('driver-list');
  const searchInput = document.getElementById('driver-search');
  const statusFilter = document.getElementById('driver-status-filter');
  const newButton = document.getElementById('driver-new');
  const reportButton = document.getElementById('driver-report-day');
  const countStore = document.getElementById('driver-count-store');
  const countRoute = document.getElementById('driver-count-route');
  const countOffline = document.getElementById('driver-count-offline');

  if (!listElement) return;

  const defaultDrivers = [
    {
      id: 'drv-joao',
      nome: 'Joao Lima',
      telefone: '(65) 99991-1001',
      veiculo: 'Moto',
      placa: 'ABC-1234',
      zona: 'Centro / Leste',
      status: 'rota',
      cargaAtual: 12,
      concluidasHoje: 6,
      enderecoBase: 'Sapezal MT',
      criadoEm: new Date().toISOString()
    },
    {
      id: 'drv-carla',
      nome: 'Carla Souza',
      telefone: '(65) 99992-1002',
      veiculo: 'Moto',
      placa: 'XYZ-9876',
      zona: 'Centro',
      status: 'disponivel',
      cargaAtual: 0,
      concluidasHoje: 9,
      enderecoBase: 'Sapezal MT',
      criadoEm: new Date().toISOString()
    },
    {
      id: 'drv-leandro',
      nome: 'Leandro Alves',
      telefone: '(65) 99993-1003',
      veiculo: 'Bike eletrica',
      placa: '',
      zona: 'Zona Sul',
      status: 'rota',
      cargaAtual: 4,
      concluidasHoje: 3,
      enderecoBase: 'Sapezal MT',
      criadoEm: new Date().toISOString()
    }
  ];

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };
  const normalizeKey = (value) => normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const createId = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `entregador-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const readDrivers = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // fallback below
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDrivers));
    return defaultDrivers;
  };

  const saveDrivers = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
  const readOrders = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const normalizeOrderStatus = (status) => {
    const normalized = normalizeKey(status || 'recebido').replace(/\s+/g, '_');
    if (['pendente', 'confirmado', 'pago', 'recebido'].includes(normalized)) return 'recebido';
    if (['preparo', 'em_preparo', 'em_producao', 'separacao'].includes(normalized)) return 'preparo';
    if (['transito', 'saiu_entrega', 'pronto', 'pronto_retirada', 'pronto_para_retirar'].includes(normalized)) return 'saiu_entrega';
    if (normalized === 'concluido') return 'concluido';
    if (normalized === 'cancelado') return 'cancelado';
    if (normalized === 'aguardando') return 'aguardando';
    return 'recebido';
  };
  const syncDriversWithOrders = async () => {
    const orders = (await window.DogtopData.getPedidos()) || [];
    const activeLoads = orders.reduce((acc, order) => {
      const status = normalizeOrderStatus(order.status);
      const isDelivery = normalizeKey(order.tipoEntrega) === 'delivery';
      if (!order.entregadorId || !isDelivery || ['concluido', 'cancelado'].includes(status)) return acc;
      acc[order.entregadorId] = (acc[order.entregadorId] || 0) + 1;
      return acc;
    }, {});

    let changed = false;
    drivers = drivers.map((driver) => {
      const cargaAtual = activeLoads[driver.id] || 0;
      const nextStatus = driver.status === 'offline'
        ? 'offline'
        : cargaAtual > 0
          ? 'rota'
          : 'disponivel';

      if (normalizeNumber(driver.cargaAtual) === cargaAtual && driver.status === nextStatus) return driver;
      changed = true;
      return {
        ...driver,
        status: nextStatus,
        cargaAtual,
        atualizadoEm: new Date().toISOString()
      };
    });

    if (changed) {
      await Promise.all(drivers.map(d => window.DogtopData.saveEntregador(d)));
    }
  };

  const statusLabel = {
    disponivel: 'Disponivel na Loja',
    rota: 'Em Rota',
    offline: 'Offline'
  };

  const statusClass = {
    disponivel: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rota: 'bg-amber-50 text-amber-700 border-amber-200',
    offline: 'bg-slate-100 text-slate-500 border-slate-200'
  };

  const statusDot = {
    disponivel: 'bg-emerald-500',
    rota: 'bg-amber-500',
    offline: 'bg-slate-400'
  };

  const getFilteredDrivers = () => {
    const term = normalizeText(searchInput?.value).toLowerCase();
    const status = statusFilter?.value || 'todos';

    return drivers.filter((driver) => {
      const matchesStatus = status === 'todos' || driver.status === status;
      const matchesTerm = !term || [
        driver.nome,
        driver.telefone,
        driver.placa,
        driver.veiculo,
        driver.zona
      ].some((value) => String(value || '').toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
  };

  const updateCounters = () => {
    const available = drivers.filter((driver) => driver.status === 'disponivel').length;
    const route = drivers.filter((driver) => driver.status === 'rota').length;
    const offline = drivers.filter((driver) => driver.status === 'offline').length;
    if (countStore) countStore.textContent = String(available);
    if (countRoute) countRoute.textContent = String(route);
    if (countOffline) countOffline.textContent = String(offline);
  };

  const renderDrivers = () => {
    const filtered = getFilteredDrivers();
    updateCounters();

    if (!filtered.length) {
      listElement.innerHTML = `
        <div class="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <strong class="block text-slate-700">Nenhum entregador encontrado.</strong>
          <span class="text-sm">Ajuste a busca ou cadastre um novo motoboy.</span>
        </div>
      `;
      return;
    }

    listElement.innerHTML = filtered.map((driver) => `
      <article class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group" data-driver-id="${escapeHtml(driver.id)}">
        <div class="p-5 flex gap-4 border-b border-slate-100">
          <div class="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative">
            <span class="text-base font-black text-slate-500">${escapeHtml(driver.nome.slice(0, 2).toUpperCase())}</span>
            <span class="absolute bottom-0 right-0 w-3.5 h-3.5 ${statusDot[driver.status] || statusDot.offline} border-2 border-white rounded-full"></span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-slate-800 truncate text-base">${escapeHtml(driver.nome)}</h3>
            <p class="text-xs text-slate-500 truncate mb-2">${escapeHtml(driver.placa || 'Sem placa')} - ${escapeHtml(driver.veiculo || 'Veiculo nao informado')}</p>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${statusClass[driver.status] || statusClass.offline}">
              ${driver.status === 'rota' ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>' : ''}
              ${escapeHtml(statusLabel[driver.status] || 'Offline')}
            </span>
          </div>
        </div>
        <div class="px-5 py-4 flex-1 bg-slate-50/50 space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-xs font-semibold text-slate-500">Carga Atual:</span>
            <strong class="text-sm font-bold text-slate-800">${normalizeNumber(driver.cargaAtual)} pedidos</strong>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs font-semibold text-slate-500">Concluidas Hoje:</span>
            <strong class="text-sm font-bold text-slate-800">${normalizeNumber(driver.concluidasHoje)} entregas</strong>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs font-semibold text-slate-500">Zona de Atuacao:</span>
            <span class="text-xs font-medium text-slate-700 text-right">${escapeHtml(driver.zona || '-')}</span>
          </div>
        </div>
        <div class="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-3">
          <button type="button" class="py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors" data-driver-action="profile" data-driver-id="${escapeHtml(driver.id)}">Ver Perfil</button>
          ${driver.status === 'disponivel'
            ? `<button type="button" class="py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors" data-driver-action="dispatch" data-driver-id="${escapeHtml(driver.id)}">Despachar</button>`
            : `<button type="button" class="py-2 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-500 hover:text-white hover:border-brand-500 rounded-lg transition-colors" data-driver-action="map" data-driver-id="${escapeHtml(driver.id)}">Ver no Mapa</button>`
          }
          <button type="button" class="col-span-2 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors" data-driver-action="${driver.status === 'offline' ? 'available' : 'offline'}" data-driver-id="${escapeHtml(driver.id)}">
            ${driver.status === 'offline' ? 'Marcar disponivel' : 'Marcar offline'}
          </button>
        </div>
      </article>
    `).join('');
  };

  const createDriverModal = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[80] hidden items-center justify-center bg-slate-900/60 p-4';
    modal.id = 'driver-modal';
    modal.innerHTML = `
      <form id="driver-form" class="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 class="text-lg font-black text-slate-900">Novo Motoboy</h2>
            <p class="text-xs text-slate-500">Cadastro rapido para despacho e relatorios.</p>
          </div>
          <button type="button" class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black" data-close-driver-modal aria-label="Fechar">x</button>
        </div>
        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label class="md:col-span-2 text-sm font-semibold text-slate-700">
            Nome
            <input name="nome" required class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Ex: Marcos Silva">
          </label>
          <label class="text-sm font-semibold text-slate-700">
            Telefone
            <input name="telefone" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="(65) 99999-9999">
          </label>
          <label class="text-sm font-semibold text-slate-700">
            Veiculo
            <input name="veiculo" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Moto, bike...">
          </label>
          <label class="text-sm font-semibold text-slate-700">
            Placa
            <input name="placa" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="ABC-1234">
          </label>
          <label class="text-sm font-semibold text-slate-700">
            Zona
            <input name="zona" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Centro / bairros">
          </label>
          <label class="md:col-span-2 text-sm font-semibold text-slate-700">
            Endereco base
            <input name="enderecoBase" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Sapezal MT">
          </label>
        </div>
        <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button type="button" class="px-4 py-2 rounded-lg border border-slate-300 font-bold text-sm text-slate-700" data-close-driver-modal>Cancelar</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-black text-sm">Salvar</button>
        </div>
      </form>
    `;
    document.body.appendChild(modal);
    return modal;
  };

  const modal = createDriverModal();
  const form = modal.querySelector('#driver-form');

  const openModal = () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    form.elements.namedItem('nome')?.focus();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    form.reset();
  };

  const exportReport = () => {
    const rows = [
      ['Nome', 'Telefone', 'Veiculo', 'Placa', 'Zona', 'Status', 'Carga atual', 'Concluidas hoje'],
      ...drivers.map((driver) => [
        driver.nome,
        driver.telefone,
        driver.veiculo,
        driver.placa,
        driver.zona,
        statusLabel[driver.status] || driver.status,
        driver.cargaAtual,
        driver.concluidasHoje
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entregadores-dogtop-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  searchInput?.addEventListener('input', renderDrivers);
  statusFilter?.addEventListener('change', renderDrivers);
  newButton?.addEventListener('click', openModal);
  reportButton?.addEventListener('click', exportReport);

  modal.querySelectorAll('[data-close-driver-modal]').forEach((button) => button.addEventListener('click', closeModal));
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    const driver = {
      id: createId(),
      nome: normalizeText(formData.get('nome')),
      telefone: normalizeText(formData.get('telefone')),
      veiculo: normalizeText(formData.get('veiculo')) || 'Moto',
      placa: normalizeText(formData.get('placa')),
      zona: normalizeText(formData.get('zona')) || 'Sapezal',
      enderecoBase: normalizeText(formData.get('enderecoBase')) || 'Sapezal MT',
      status: 'disponivel',
      cargaAtual: 0,
      concluidasHoje: 0,
      criadoEm: new Date().toISOString()
    };
    
    const savedDriver = await window.DogtopData.saveEntregador(driver);
    drivers.unshift(savedDriver);
    
    closeModal();
    renderDrivers();
    window.DogtopAudit?.log({
      modulo: 'Entregadores',
      acao: 'Entregador cadastrado',
      entidade: driver.nome,
      detalhe: `${driver.nome} cadastrado como entregador disponivel.`,
      dados: { entregadorId: driver.id }
    });
  });

  listElement.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-driver-action]');
    if (!button) return;
    const driver = drivers.find((item) => item.id === button.dataset.driverId);
    if (!driver) return;

    const action = button.dataset.driverAction;
    if (action === 'profile') {
      window.alert([
        `Entregador: ${driver.nome}`,
        `Telefone: ${driver.telefone || 'Nao informado'}`,
        `Veiculo: ${driver.veiculo || 'Nao informado'}`,
        `Placa: ${driver.placa || 'Nao informada'}`,
        `Zona: ${driver.zona || 'Nao informada'}`
      ].join('\n'));
      return;
    }

    if (action === 'map') {
      const query = [driver.nome, driver.enderecoBase || driver.zona || 'Sapezal MT'].filter(Boolean).join(' ');
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener');
      return;
    }

    if (action === 'dispatch') {
      driver.status = 'rota';
      driver.cargaAtual = Math.max(normalizeNumber(driver.cargaAtual), 1);
    }

    if (action === 'offline') {
      driver.status = 'offline';
      driver.cargaAtual = 0;
    }

    if (action === 'available') {
      driver.status = 'disponivel';
      driver.cargaAtual = 0;
    }

    driver.atualizadoEm = new Date().toISOString();
    await window.DogtopData.saveEntregador(driver);
    renderDrivers();
  });

  window.DogtopAudit?.log({
    modulo: 'Entregadores',
    acao: 'Acesso a tela',
    entidade: 'Entregadores',
    detalhe: 'Tela de entregadores aberta com persistencia local.',
    severidade: 'info'
  });

  window.addEventListener('storage', async (event) => {
    if ([ORDERS_STORAGE_KEY, STORAGE_KEY].includes(event.key)) {
      await loadDrivers();
      await syncDriversWithOrders();
      renderDrivers();
    }
  });

  loadDrivers().then(async () => {
    await syncDriversWithOrders();
    renderDrivers();
  });
})();
