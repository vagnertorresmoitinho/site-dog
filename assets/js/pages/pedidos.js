document.body.dataset.page = 'pedidos';

(() => {
  const ORDERS_STORAGE_KEY = 'dogtopPedidosOnline';
  const DRIVERS_STORAGE_KEY = 'dogtopEntregadores';

  const tableBody = document.getElementById('pedidos-table-body');
  const searchInput = document.getElementById('orders-search');
  const statusFilter = document.getElementById('orders-status');
  const activeCount = document.getElementById('orders-active-count');
  const emptyState = document.getElementById('orders-empty');
  const exportButton = document.getElementById('orders-export');

  if (!tableBody) return;

  const currencyFormatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const statusLabels = {
    recebido: 'Recebido',
    preparo: 'Em preparo',
    saiu_entrega: 'Pronto / despacho',
    concluido: 'Concluido',
    cancelado: 'Cancelado',
    aguardando: 'Aguardando'
  };

  const statusClasses = {
    recebido: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    preparo: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    saiu_entrega: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    concluido: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    cancelado: 'bg-red-50 text-red-700 ring-red-600/20',
    aguardando: 'bg-slate-100 text-slate-700 ring-slate-500/20'
  };

  const dotClasses = {
    recebido: 'bg-slate-400',
    preparo: 'bg-amber-500 animate-pulse',
    saiu_entrega: 'bg-sky-500',
    concluido: 'bg-emerald-500',
    cancelado: 'bg-red-500',
    aguardando: 'bg-slate-400'
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeKey = (value) => normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const normalizeStatus = (status) => {
    const normalized = normalizeKey(status || 'recebido').replace(/\s+/g, '_');
    if (['pendente', 'confirmado', 'pago', 'recebido'].includes(normalized)) return 'recebido';
    if (['preparo', 'em_preparo', 'em_producao', 'separacao'].includes(normalized)) return 'preparo';
    if (['transito', 'saiu_entrega', 'pronto', 'pronto_retirada', 'pronto_para_retirar'].includes(normalized)) return 'saiu_entrega';
    if (['concluido'].includes(normalized)) return 'concluido';
    if (['cancelado'].includes(normalized)) return 'cancelado';
    if (['aguardando'].includes(normalized)) return 'aguardando';
    return 'recebido';
  };

  const readDrivers = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRIVERS_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const saveDrivers = (drivers) => localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
  const getOrderCode = (order) => String(order.id || '').slice(-6).toUpperCase() || 'PEDIDO';
  const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  let orders = [];

  const isDeliveryOrder = (order) => normalizeKey(order.tipoEntrega) === 'delivery';
  const isClosedStatus = (status) => ['concluido', 'cancelado'].includes(normalizeStatus(status));

  const syncDriverLoads = () => {
    const drivers = readDrivers();
    if (!drivers.length) return;

    const activeLoads = orders.reduce((acc, order) => {
      if (!order.entregadorId || !isDeliveryOrder(order) || isClosedStatus(order.status)) return acc;
      acc[order.entregadorId] = (acc[order.entregadorId] || 0) + 1;
      return acc;
    }, {});

    let changed = false;
    const syncedDrivers = drivers.map((driver) => {
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

    if (changed) saveDrivers(syncedDrivers);
  };

  const getAvailableDrivers = () => readDrivers()
    .filter((driver) => driver.status !== 'offline')
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

  const getFilteredOrders = () => {
    const search = normalizeKey(searchInput?.value);
    const status = statusFilter?.value || 'todos';

    return orders
      .map((order) => ({ ...order, status: normalizeStatus(order.status) }))
      .filter((order) => status === 'todos' || order.status === status)
      .filter((order) => {
        if (!search) return true;
        const items = Array.isArray(order.itens) ? order.itens.map((item) => item.nome).join(' ') : '';
        const haystack = normalizeKey([
          getOrderCode(order),
          order.cliente,
          order.telefone,
          order.telefoneCompleto,
          order.formaPagamento,
          order.tipoEntrega,
          order.enderecoEntrega,
          order.entregadorNome,
          order.entregadorId,
          order.status,
          items
        ].join(' '));
        return haystack.includes(search);
      })
      .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
  };

  const getNextStatus = (status) => {
    if (status === 'recebido' || status === 'aguardando') return 'preparo';
    if (status === 'preparo') return 'saiu_entrega';
    if (status === 'saiu_entrega') return 'concluido';
    return status;
  };

  const getActionLabel = (status, order) => {
    const next = getNextStatus(status);
    if (next === status) return 'Abrir';
    if (next === 'preparo') return 'Iniciar';
    if (next === 'saiu_entrega') return 'Pronto';
    if (next === 'concluido') return order.tipoEntrega === 'Delivery' ? 'Finalizar' : 'Retirou';
    return 'Avancar';
  };

  const renderStatus = (status) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${statusClasses[status] || statusClasses.recebido}">
      <span class="w-1.5 h-1.5 rounded-full ${dotClasses[status] || dotClasses.recebido}"></span>
      ${escapeHtml(statusLabels[status] || status)}
    </span>
  `;

  const renderDriverSelect = (order, status) => {
    if (!isDeliveryOrder(order)) {
      return '<span class="text-xs font-semibold text-slate-400">Retirada</span>';
    }

    if (isClosedStatus(status)) {
      return `<span class="block text-sm font-semibold text-slate-700">${escapeHtml(order.entregadorNome || 'Nao atribuido')}</span>`;
    }

    const drivers = getAvailableDrivers();
    const currentDriverMissing = order.entregadorId && !drivers.some((driver) => String(driver.id) === String(order.entregadorId));
    const options = [
      '<option value="">Sem entregador</option>',
      currentDriverMissing
        ? `<option value="${escapeHtml(order.entregadorId)}" selected>${escapeHtml(order.entregadorNome || 'Entregador atual')} (indisponivel)</option>`
        : '',
      ...drivers.map((driver) => `
        <option value="${escapeHtml(driver.id)}" ${String(order.entregadorId || '') === String(driver.id) ? 'selected' : ''}>
          ${escapeHtml(driver.nome)}${normalizeNumber(driver.cargaAtual) ? ` - ${normalizeNumber(driver.cargaAtual)} em rota` : ''}
        </option>
      `)
    ].join('');

    return `
      <select data-action="assign-driver" data-order-id="${escapeHtml(order.id)}" class="w-full min-w-[150px] px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none">
        ${options}
      </select>
    `;
  };

  const renderOrders = async () => {
    orders = (await window.DogtopData.getPedidos()) || [];
    syncDriverLoads();
    const list = getFilteredOrders();
    const active = orders.filter((order) => !['concluido', 'cancelado'].includes(normalizeStatus(order.status))).length;
    if (activeCount) activeCount.textContent = `${active} ${active === 1 ? 'ativo' : 'ativos'}`;
    if (emptyState) {
      emptyState.classList.toggle('hidden', list.length > 0);
      emptyState.style.display = list.length ? 'none' : 'flex';
    }

    tableBody.innerHTML = list.map((order) => {
      const status = normalizeStatus(order.status);
      const code = getOrderCode(order);
      const itemCount = Array.isArray(order.itens)
        ? order.itens.reduce((sum, item) => sum + normalizeNumber(item.quantidade || 1), 0)
        : 0;
      const next = getNextStatus(status);
      const canAdvance = next !== status;

      return `
        <tr class="hover:bg-slate-50 transition-colors group">
          <td class="px-6 py-4">
            <span class="block font-mono text-sm font-bold text-slate-700">#${escapeHtml(code)}</span>
            <span class="block text-xs text-slate-400">${escapeHtml(formatDate(order.criadoEm))}</span>
          </td>
          <td class="px-6 py-4">
            <strong class="block text-sm text-slate-800">${escapeHtml(order.cliente || 'Cliente nao informado')}</strong>
            <span class="block text-xs text-slate-500">${escapeHtml(order.telefoneCompleto || order.telefone || 'Sem telefone')}</span>
            <span class="block text-xs text-slate-400">${itemCount} ${itemCount === 1 ? 'item' : 'itens'}</span>
          </td>
          <td class="px-6 py-4 text-sm text-slate-600">
            <span class="block">${escapeHtml(order.formaPagamento || 'Nao informado')}</span>
            <strong class="text-slate-800">${currencyFormatter.format(normalizeNumber(order.total))}</strong>
          </td>
          <td class="px-6 py-4 text-sm text-slate-600">
            <span class="block">${escapeHtml(order.tipoEntrega || 'Nao informado')}</span>
            <span class="block text-xs text-slate-400 max-w-[220px] truncate">${escapeHtml(order.enderecoEntrega || order.pontoReferencia || '')}</span>
          </td>
          <td class="px-6 py-4">${renderDriverSelect(order, status)}</td>
          <td class="px-6 py-4 text-center">${renderStatus(status)}</td>
          <td class="px-6 py-4 text-right">
            <div class="inline-flex items-center gap-2">
              ${canAdvance ? `<button type="button" class="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-md text-xs font-bold" data-action="advance" data-order-id="${escapeHtml(order.id)}">${escapeHtml(getActionLabel(status, order))}</button>` : ''}
              ${status !== 'cancelado' && status !== 'concluido' ? `<button type="button" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold" data-action="cancel" data-order-id="${escapeHtml(order.id)}">Cancelar</button>` : ''}
              <a href="./andamento-pedido.html?id=${encodeURIComponent(order.id || '')}&voltar=pedidos" class="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Detalhes" aria-label="Ver detalhes do pedido">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const updateOrderStatus = async (orderId, nextStatus) => {
    const order = orders.find((item) => String(item.id) === String(orderId));
    if (!order) return;
    const previousStatus = normalizeStatus(order.status);
    order.status = normalizeStatus(nextStatus);
    order.atualizadoEm = new Date().toISOString();
    if (order.status === 'cancelado') order.canceladoEm = order.atualizadoEm;
    if (order.status === 'concluido') {
      order.concluidoEm = order.atualizadoEm;
      if (order.entregadorId && !order.entregadorConcluidoEm && previousStatus !== 'concluido') {
        order.entregadorConcluidoEm = order.atualizadoEm;
        const drivers = readDrivers();
        const driver = drivers.find((item) => String(item.id) === String(order.entregadorId));
        if (driver) {
          driver.concluidasHoje = normalizeNumber(driver.concluidasHoje) + 1;
          driver.atualizadoEm = order.atualizadoEm;
          saveDrivers(drivers);
        }
      }
    }
    
    await window.DogtopData.savePedido(order);
    syncDriverLoads();
    window.DogtopAudit?.log?.({
      modulo: 'Pedidos',
      acao: 'Status do pedido atualizado',
      entidade: String(order.id),
      detalhe: `Pedido #${getOrderCode(order)} saiu de ${statusLabels[previousStatus]} para ${statusLabels[order.status]}.`,
      dados: { pedidoId: order.id, statusAnterior: previousStatus, statusAtual: order.status }
    });
    await renderOrders();
  };

  const assignDriver = async (orderId, driverId) => {
    const order = orders.find((item) => String(item.id) === String(orderId));
    if (!order || !isDeliveryOrder(order) || isClosedStatus(order.status)) return;

    const drivers = readDrivers();
    const driver = drivers.find((item) => String(item.id) === String(driverId));
    order.entregadorId = driver ? driver.id : '';
    order.entregadorNome = driver ? driver.nome : '';
    order.atualizadoEm = new Date().toISOString();
    
    await window.DogtopData.savePedido(order);
    syncDriverLoads();

    window.DogtopAudit?.log?.({
      modulo: 'Pedidos',
      acao: driver ? 'Entregador atribuido' : 'Entregador removido',
      entidade: String(order.id),
      detalhe: driver
        ? `Pedido #${getOrderCode(order)} atribuido para ${driver.nome}.`
        : `Pedido #${getOrderCode(order)} ficou sem entregador atribuido.`,
      dados: { pedidoId: order.id, entregadorId: order.entregadorId, entregadorNome: order.entregadorNome }
    });

    await renderOrders();
  };

  const exportCsv = () => {
    const list = getFilteredOrders();
    const header = ['Pedido', 'Data', 'Cliente', 'Telefone', 'Pagamento', 'Entrega', 'Entregador', 'Status', 'Total'];
    const rows = list.map((order) => [
      getOrderCode(order),
      formatDate(order.criadoEm),
      order.cliente || '',
      order.telefoneCompleto || order.telefone || '',
      order.formaPagamento || '',
      order.tipoEntrega || '',
      order.entregadorNome || '',
      statusLabels[normalizeStatus(order.status)] || order.status || '',
      normalizeNumber(order.total).toFixed(2)
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fila-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  tableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const order = orders.find((item) => String(item.id) === String(button.dataset.orderId));
    if (!order) return;
    const current = normalizeStatus(order.status);
    if (button.dataset.action === 'advance') await updateOrderStatus(order.id, getNextStatus(current));
    if (button.dataset.action === 'cancel' && window.confirm(`Cancelar pedido #${getOrderCode(order)}?`)) {
      await updateOrderStatus(order.id, 'cancelado');
    }
  });

  tableBody.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-action="assign-driver"]');
    if (!select) return;
    await assignDriver(select.dataset.orderId, select.value);
  });

  searchInput?.addEventListener('input', renderOrders);
  statusFilter?.addEventListener('change', renderOrders);
  exportButton?.addEventListener('click', exportCsv);
  window.addEventListener('storage', (event) => {
    if ([ORDERS_STORAGE_KEY, DRIVERS_STORAGE_KEY].includes(event.key)) renderOrders();
  });
  window.setInterval(renderOrders, 5000);

  renderOrders();
})();
