document.body.dataset.page = 'historico';

(() => {

  const searchInput = document.getElementById('history-search');
  const statusFilter = document.getElementById('history-status');
  const periodFilter = document.getElementById('history-period');
  const exportButton = document.getElementById('history-export');
  const tableBody = document.getElementById('history-table-body');
  const emptyState = document.getElementById('history-empty');

  if (!tableBody) return;

  const currencyFormatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const statusLabels = {
    recebido: 'Recebido',
    preparo: 'Em preparo',
    saiu_entrega: 'Saiu para entrega',
    concluido: 'Concluido',
    cancelado: 'Cancelado',
    pendente: 'Pendente',
    pronto: 'Pronto'
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
  const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : 'Data nao informada';
  };
  const formatDateParts = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return { date: 'Data nao informada', time: '' };
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };
  const getOrderCode = (order) => String(order.id || '').slice(-6).toUpperCase() || '-';

  let orders = [];

  const isInsidePeriod = (order) => {
    const period = periodFilter?.value || 'todos';
    if (period === 'todos') return true;
    const date = order.criadoEm ? new Date(order.criadoEm) : null;
    if (!date || Number.isNaN(date.getTime())) return false;

    const now = new Date();
    if (period === 'hoje') return date.toDateString() === now.toDateString();

    const days = Number(period);
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return date >= start;
  };

  const getFilteredOrders = () => {
    const search = normalizeKey(searchInput?.value);
    const status = statusFilter?.value || 'todos';

    return orders
      .filter((order) => status === 'todos' || order.status === status)
      .filter(isInsidePeriod)
      .filter((order) => {
        if (!search) return true;
        const itemsText = Array.isArray(order.itens) ? order.itens.map((item) => item.nome).join(' ') : '';
        const haystack = normalizeKey([
          getOrderCode(order),
          order.cliente,
          order.telefone,
          order.telefoneCompleto,
          order.formaPagamento,
          order.tipoEntrega,
          order.status,
          itemsText
        ].join(' '));
        return haystack.includes(search);
      })
      .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
  };

  const updateSummary = (list) => {
    const validSales = list.filter((order) => order.status !== 'cancelado');
    const totalSales = validSales.reduce((sum, order) => sum + normalizeNumber(order.total), 0);
    const totalDiscount = validSales.reduce((sum, order) => sum + normalizeNumber(order.desconto), 0);
    const averageTicket = validSales.length ? totalSales / validSales.length : 0;

    document.getElementById('history-total-sales').textContent = currencyFormatter.format(totalSales);
    document.getElementById('history-total-orders').textContent = String(list.length);
    document.getElementById('history-average-ticket').textContent = currencyFormatter.format(averageTicket);
    document.getElementById('history-total-discount').textContent = currencyFormatter.format(totalDiscount);
  };

  const renderTable = () => {
    const list = getFilteredOrders();
    updateSummary(list);
    if (emptyState) emptyState.hidden = list.length > 0;

    tableBody.innerHTML = list.map((order) => {
      const items = Array.isArray(order.itens) ? order.itens : [];
      const itemCount = items.reduce((sum, item) => sum + normalizeNumber(item.quantidade), 0);
      const firstItems = items.slice(0, 2).map((item) => `${item.quantidade}x ${item.nome}`).join(', ');
      const remaining = items.length > 2 ? ` +${items.length - 2}` : '';
      const status = order.status || 'recebido';
      const orderCode = getOrderCode(order);
      const dateParts = formatDateParts(order.criadoEm);
      const deliveryFee = normalizeNumber(order.taxaEntrega);
      const trackUrl = `./andamento-pedido.html?id=${encodeURIComponent(order.id || '')}&voltar=historico`;
      const receiptUrl = `./segunda-via.html?pedido=${encodeURIComponent(orderCode)}`;

      return `
        <tr class="history-row">
          <td class="history-primary-cell">
            <span class="history-code">#${escapeHtml(orderCode)}</span>
            <span class="history-origin">${escapeHtml(order.origem === 'pdv' ? 'PDV' : 'Online')}</span>
            <strong class="history-client">${escapeHtml(order.cliente || 'Cliente nao informado')}</strong>
            <span class="history-muted">${escapeHtml(order.telefoneCompleto || order.telefone || 'Telefone nao informado')}</span>
            <span class="history-muted">${escapeHtml(dateParts.date)}${dateParts.time ? ` as ${escapeHtml(dateParts.time)}` : ''}</span>
          </td>
          <td class="history-items">
            <strong>${itemCount} ${itemCount === 1 ? 'item' : 'itens'}</strong>
            <span class="history-muted">${escapeHtml(firstItems || 'Sem itens')}${escapeHtml(remaining)}</span>
            <span class="history-muted">${escapeHtml(order.tipoEntrega || 'Nao informado')}${deliveryFee ? ` - ${currencyFormatter.format(deliveryFee)}` : ''}</span>
          </td>
          <td>
            <strong>${escapeHtml(order.formaPagamento || 'Nao informado')}</strong>
            <span class="history-muted">Desconto ${currencyFormatter.format(normalizeNumber(order.desconto))}</span>
          </td>
          <td><span class="history-status ${escapeHtml(status)}">${escapeHtml(statusLabels[status] || status)}</span></td>
          <td class="history-total-cell"><span class="history-total">${currencyFormatter.format(normalizeNumber(order.total))}</span></td>
          <td class="history-actions-cell">
            <span class="history-actions">
              <a href="${trackUrl}">Abrir</a>
              <a href="${receiptUrl}">2a via</a>
              ${status !== 'cancelado' && status !== 'concluido' ? `<button type="button" data-cancel-order="${escapeHtml(order.id)}">Cancelar</button>` : ''}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  };

  const loadOrders = async () => {
    orders = (await window.DogtopData.getPedidos()) || [];
    renderTable();
  };

  const exportCsv = () => {
    const list = getFilteredOrders();
    const header = ['Pedido', 'Data', 'Cliente', 'Telefone', 'Entrega', 'Pagamento', 'Status', 'Subtotal', 'Desconto', 'Taxa', 'Total'];
    const rows = list.map((order) => [
      getOrderCode(order),
      formatDate(order.criadoEm),
      order.cliente || '',
      order.telefoneCompleto || order.telefone || '',
      order.tipoEntrega || '',
      order.formaPagamento || '',
      statusLabels[order.status] || order.status || '',
      normalizeNumber(order.subtotal).toFixed(2),
      normalizeNumber(order.desconto).toFixed(2),
      normalizeNumber(order.taxaEntrega).toFixed(2),
      normalizeNumber(order.total).toFixed(2)
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    window.DogtopAudit?.log({
      modulo: 'Historico',
      acao: 'Historico exportado',
      entidade: 'dogtopPedidosOnline',
      detalhe: `${list.length} registro(s) exportado(s) em CSV.`,
      severidade: 'info'
    });
  };

  tableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cancel-order]');
    if (!button) return;
    const order = orders.find((item) => String(item.id) === String(button.dataset.cancelOrder));
    if (!order || !window.confirm(`Cancelar pedido #${getOrderCode(order)}?`)) return;
    const previousStatus = order.status;
    order.status = 'cancelado';
    order.canceladoEm = new Date().toISOString();
    
    await window.DogtopData.savePedido(order);
    window.DogtopAudit?.log({
      modulo: 'Historico',
      acao: 'Pedido cancelado pelo historico',
      entidade: String(order.id),
      detalhe: `Pedido #${getOrderCode(order)} alterado de ${previousStatus || 'sem status'} para cancelado.`,
      severidade: 'alerta',
      dados: { pedidoId: order.id, statusAnterior: previousStatus, statusAtual: order.status }
    });
    renderTable();
  });

  [searchInput, statusFilter, periodFilter].forEach((element) => {
    element?.addEventListener('input', renderTable);
    element?.addEventListener('change', renderTable);
  });
  exportButton?.addEventListener('click', exportCsv);

  // Inicialização assíncrona
  loadOrders();
})();
