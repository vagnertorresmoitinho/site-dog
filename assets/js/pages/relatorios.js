document.body.dataset.page = 'relatorios';

(() => {
  const ORDERS_STORAGE_KEY = 'dogtopPedidosOnline';
  const PAYABLES_STORAGE_KEY = 'dogtopContasPagar';

  const body = document.getElementById('driver-report-body');
  const refreshButton = document.getElementById('driver-report-refresh');
  const payablesButton = document.getElementById('driver-report-payables');
  const feedback = document.getElementById('driver-report-feedback');

  if (!body) return;

  const formatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

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
  const readJsonArray = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const writeJsonArray = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const getOrderCode = (order) => String(order.id || '').slice(-6).toUpperCase() || '-';
  const getDriverName = (order) => normalizeText(
    order.entregadorNome
    || order.entregador
    || order.motoboy
    || order.driverName
    || order.deliveryPerson
    || order.entregadorId
  ) || 'Sem entregador';
  const isDeliveryOrder = (order) => normalizeText(order.tipoEntrega).toLowerCase() === 'delivery'
    || normalizeNumber(order.taxaEntrega) > 0;
  const isPayableOrder = (order) => !['cancelado'].includes(order.status || '') && isDeliveryOrder(order);
  const createId = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `conta-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };
  const dueDate = () => new Date().toISOString().slice(0, 10);
  const setFeedback = (message, type = 'info') => {
    if (!feedback) return;
    feedback.hidden = false;
    feedback.classList.remove('hidden', 'text-emerald-700', 'text-amber-700', 'text-red-700', 'bg-emerald-50', 'bg-amber-50', 'bg-red-50');
    feedback.classList.add(
      type === 'success' ? 'text-emerald-700' : type === 'error' ? 'text-red-700' : 'text-amber-700',
      type === 'success' ? 'bg-emerald-50' : type === 'error' ? 'bg-red-50' : 'bg-amber-50'
    );
    feedback.textContent = message;
  };

  const getDriverReport = () => {
    const groups = new Map();
    readJsonArray(ORDERS_STORAGE_KEY)
      .filter(isPayableOrder)
      .forEach((order) => {
        const driver = getDriverName(order);
        const current = groups.get(driver) || {
          driver,
          orders: [],
          total: 0
        };
        current.orders.push(order);
        current.total += normalizeNumber(order.taxaEntrega) || window.DogtopConfig?.getDeliveryFee?.() || 0;
        groups.set(driver, current);
      });

    return [...groups.values()]
      .sort((first, second) => {
        if (first.driver === 'Sem entregador') return 1;
        if (second.driver === 'Sem entregador') return -1;
        return second.total - first.total;
      });
  };

  const updateSummary = (report) => {
    const assigned = report.filter((item) => item.driver !== 'Sem entregador');
    const totalOrders = report.reduce((sum, item) => sum + item.orders.length, 0);
    const totalBalance = assigned.reduce((sum, item) => sum + item.total, 0);
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };
    setText('driver-report-count', String(assigned.length));
    setText('driver-report-orders', String(totalOrders));
    setText('driver-report-total', formatter.format(totalBalance));
  };

  const renderReport = () => {
    const report = getDriverReport();
    updateSummary(report);

    if (!report.length) {
      body.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-sm text-slate-500">Nenhum pedido de entrega encontrado.</td></tr>';
      return report;
    }

    body.innerHTML = report.map((item) => {
      const unassigned = item.driver === 'Sem entregador';
      const codes = item.orders.slice(0, 5).map((order) => `#${getOrderCode(order)}`).join(', ');
      const extra = item.orders.length > 5 ? ` +${item.orders.length - 5}` : '';
      const financeStatus = unassigned ? 'Atribuir entregador' : 'Pronto para lançar';

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-6 py-4">
            <strong class="block text-sm text-slate-800">${escapeHtml(item.driver)}</strong>
            <span class="text-xs ${unassigned ? 'text-amber-600' : 'text-slate-500'}">${unassigned ? 'Pedidos sem responsável' : 'Entregador vinculado'}</span>
          </td>
          <td class="px-6 py-4 text-center">
            <strong class="text-sm text-slate-800">${item.orders.length}</strong>
          </td>
          <td class="px-6 py-4 text-sm text-slate-500">${escapeHtml(codes || '-')}${escapeHtml(extra)}</td>
          <td class="px-6 py-4 text-right">
            <strong class="text-sm font-black ${unassigned ? 'text-slate-400' : 'text-brand-600'}">${formatter.format(unassigned ? 0 : item.total)}</strong>
          </td>
          <td class="px-6 py-4 text-center">
            <span class="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${unassigned ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
              ${escapeHtml(financeStatus)}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return report;
  };

  const insertPayables = () => {
    const report = getDriverReport().filter((item) => item.driver !== 'Sem entregador' && item.total > 0);
    if (!report.length) {
      setFeedback('Nenhum entregador com saldo disponível para lançar em contas a pagar.', 'error');
      return;
    }

    const payables = readJsonArray(PAYABLES_STORAGE_KEY);
    let created = 0;

    report.forEach((item) => {
      const sourceKey = `${dueDate()}-${item.driver}-${item.orders.map((order) => order.id).join('|')}`;
      const alreadyExists = payables.some((payable) => payable.origem === 'relatorio-entregadores' && payable.sourceKey === sourceKey);
      if (alreadyExists) return;

      payables.unshift({
        id: createId(),
        origem: 'relatorio-entregadores',
        sourceKey,
        descricao: `Pagamento entregador - ${item.driver}`,
        vencimento: dueDate(),
        categoria: 'Logistica',
        valor: Number(item.total.toFixed(2)),
        status: 'Pendente',
        entregador: item.driver,
        pedidos: item.orders.map((order) => order.id),
        quantidadePedidos: item.orders.length,
        criadoEm: new Date().toISOString()
      });
      created += 1;
    });

    writeJsonArray(PAYABLES_STORAGE_KEY, payables);
    setFeedback(created
      ? `${created} conta(s) a pagar inserida(s) no financeiro.`
      : 'As contas a pagar deste relatório já foram inseridas.',
      created ? 'success' : 'info');

    window.DogtopAudit?.log({
      modulo: 'Relatorios',
      acao: 'Contas de entregadores geradas',
      entidade: PAYABLES_STORAGE_KEY,
      detalhe: `${created} conta(s) a pagar criada(s) a partir do relatório de entregadores.`,
      dados: { contasCriadas: created }
    });
  };

  refreshButton?.addEventListener('click', () => {
    renderReport();
    setFeedback('Relatório de entregadores atualizado.', 'success');
  });
  payablesButton?.addEventListener('click', insertPayables);

  renderReport();
})();
