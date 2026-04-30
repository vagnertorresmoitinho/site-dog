document.body.dataset.page = 'segunda-via';

(() => {
  const ORDERS_STORAGE_KEY = 'dogtopPedidosOnline';
  const form = document.getElementById('receipt-copy-form');
  const orderInput = document.getElementById('receipt-copy-order');
  const clientInput = document.getElementById('receipt-copy-client');
  const dateInput = document.getElementById('receipt-copy-date');
  const result = document.getElementById('receipt-copy-result');

  if (!form || !orderInput || !clientInput || !dateInput || !result) return;

  const formatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  const company = window.DogtopConfig?.getCompany?.() || {};
  const config = window.DogtopConfig?.load?.() || {};
  const receiptPrefs = config.recibo || window.DogtopConfig?.defaults?.recibo || {};

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');
  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };
  const statusLabels = {
    recebido: 'Recebido',
    preparo: 'Em preparo',
    saiu_entrega: 'Saiu para entrega',
    concluido: 'Concluido',
    cancelado: 'Cancelado'
  };
  const statusClasses = {
    concluido: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelado: 'bg-red-100 text-red-700 border-red-200',
    preparo: 'bg-amber-100 text-amber-700 border-amber-200',
    saiu_entrega: 'bg-blue-100 text-blue-700 border-blue-200',
    recebido: 'bg-slate-100 text-slate-700 border-slate-200'
  };
  const setLabelFor = () => {
    document.querySelector('label + #receipt-copy-order')?.previousElementSibling?.setAttribute('for', 'receipt-copy-order');
    document.querySelector('label + #receipt-copy-client')?.previousElementSibling?.setAttribute('for', 'receipt-copy-client');
    document.querySelector('label + #receipt-copy-date')?.previousElementSibling?.setAttribute('for', 'receipt-copy-date');
  };
  const getOrderCode = (order) => String(order.id || '').slice(-6).toUpperCase();
  const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : 'Data não informada';
  };
  const readOrders = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const matchesOrder = (order, query) => {
    const search = normalizeText(query).toLowerCase();
    if (!search) return true;
    const digits = onlyDigits(search);
    const phone = onlyDigits(order.telefoneCompleto || order.telefone);
      const code = getOrderCode(order).toLowerCase();
      return String(order.id || '').toLowerCase() === search
        || code === search
        || code.endsWith(search)
        || (digits && phone.endsWith(digits));
  };
  const matchesClient = (order, query) => {
    const search = normalizeText(query);
    if (!search) return true;
    const normalizedSearch = search.toLowerCase();
    const digits = onlyDigits(search);
    const phone = onlyDigits(order.telefoneCompleto || order.telefone);
    return normalizeText(order.cliente).toLowerCase().includes(normalizedSearch)
      || (digits && phone.includes(digits));
  };
  const matchesDate = (order, query) => {
    if (!query) return true;
    const date = order.criadoEm ? new Date(order.criadoEm) : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    return date.toISOString().slice(0, 10) === query;
  };
  const findOrders = () => {
    const orderQuery = orderInput.value;
    const clientQuery = clientInput.value;
    const dateQuery = dateInput.value;
    return readOrders()
      .filter((order) => matchesOrder(order, orderQuery))
      .filter((order) => matchesClient(order, clientQuery))
      .filter((order) => matchesDate(order, dateQuery))
      .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
  };

  const buildReceiptHtml = (order) => {
    const code = getOrderCode(order);
    const createdAt = formatDate(order.criadoEm);
    const deliveryFee = normalizeNumber(order.taxaEntrega);
    const subtotal = normalizeNumber(order.subtotal) || Math.max(normalizeNumber(order.total) - deliveryFee, 0);
    const originalSubtotal = normalizeNumber(order.subtotalOriginal) || subtotal;
    const discount = normalizeNumber(order.desconto) || Math.max(originalSubtotal - subtotal, 0);
    const total = normalizeNumber(order.total);
    const status = order.status || 'recebido';
    const isCanceled = status === 'cancelado';
    const changeFor = order.formaPagamento === 'Dinheiro' ? normalizeNumber(order.trocoPara) : 0;
    const changeValue = normalizeNumber(order.trocoDevolver) || Math.max(changeFor - total, 0);
    const receiptLogo = receiptPrefs.loja?.logotipo && company.logotipo
      ? `<div class="receipt-logo receipt-logo--image"><img src="${company.logotipo}" alt="Logotipo ${escapeHtml(company.nome || 'loja')}"></div>`
      : '<div class="receipt-logo">DT</div>';
    const storeRows = [
      receiptPrefs.loja?.nome !== false ? `<h1>${escapeHtml(company.nomeRecibo || company.nome || 'Dogtop')}</h1>` : '',
      receiptPrefs.loja?.documento && company.documento ? `<p>${escapeHtml(company.documento)}</p>` : '',
      receiptPrefs.loja?.endereco !== false ? `<p>${escapeHtml([company.endereco, company.complemento].filter(Boolean).join(' - '))}</p>` : '',
      receiptPrefs.loja?.telefone !== false ? `<p>Telefone: ${escapeHtml(company.telefone || '')}</p>` : '',
      receiptPrefs.loja?.whatsapp !== false ? `<p>WhatsApp: ${escapeHtml(company.whatsapp || '')}</p>` : ''
    ].filter(Boolean).join('');
    const items = (order.itens || []).map((item) => `
      <div class="receipt-item">
        <div class="min-w-0">
          <strong>${escapeHtml(item.quantidade)}x ${escapeHtml(item.nome)}</strong>
          <small>${formatter.format(normalizeNumber(item.precoUnitario))}</small>
        </div>
        <strong>${formatter.format(normalizeNumber(item.subtotal))}</strong>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>2ª via recibo #${escapeHtml(code)}</title>
        <style>
          body { margin: 0; background: #f4f4f4; font-family: "Courier New", monospace; }
          .receipt { width: 80mm; min-height: 100vh; margin: 0 auto; padding: 14px; background: #fff; color: #111; }
          .receipt-logo { width: 48px; height: 48px; margin: 0 auto 8px; display: grid; place-items: center; border: 2px solid #111; border-radius: 50%; font-weight: 900; overflow: hidden; }
          .receipt-logo--image { width: 70px; height: 70px; border: 0; border-radius: 6px; }
          .receipt-logo img { width: 100%; height: 100%; object-fit: contain; }
          h1, p { margin: 0; text-align: center; }
          h1 { font-size: 18px; }
          p, div, small { font-size: 12px; line-height: 1.35; }
          small { display: block; color: #555; }
          .line { border-top: 1px dashed #111; margin: 12px 0; }
          .receipt-row, .receipt-item { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
          .receipt-item > div { flex: 1; }
          .total { font-size: 15px; font-weight: 900; }
          .status { border: 2px solid #111; padding: 8px; text-align: center; font-weight: 900; margin-bottom: 8px; text-transform: uppercase; }
          .status.cancelado { border-color: #b91c1c; color: #b91c1c; }
          .left { text-align: left; }
          @media print {
            body { background: #fff; }
            .receipt { width: 80mm; margin: 0; box-shadow: none; }
            @page { size: 80mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        <main class="receipt">
          ${receiptLogo}
          ${storeRows}
          ${company.cabecalhoRecibo ? `<p>${escapeHtml(company.cabecalhoRecibo)}</p>` : ''}
          <div class="line"></div>
          ${isCanceled ? '<div class="status cancelado">Pedido cancelado</div>' : ''}
          <div class="receipt-row"><span>Status</span><strong>${escapeHtml(statusLabels[status] || status)}</strong></div>
          <div class="receipt-row"><span>2ª via</span><strong>#${escapeHtml(code)}</strong></div>
          <div class="receipt-row"><span>Data</span><strong>${escapeHtml(createdAt)}</strong></div>
          <div class="line"></div>
          ${items}
          <div class="line"></div>
          <div class="receipt-row"><span>Somatória itens</span><strong>${formatter.format(originalSubtotal)}</strong></div>
          <div class="receipt-row"><span>Desconto</span><strong>${formatter.format(discount)}</strong></div>
          <div class="receipt-row"><span>Subtotal</span><strong>${formatter.format(subtotal)}</strong></div>
          <div class="receipt-row"><span>Taxa entrega</span><strong>${formatter.format(deliveryFee)}</strong></div>
          <div class="receipt-row total"><span>Total</span><strong>${formatter.format(total)}</strong></div>
          <div class="line"></div>
          <div class="left"><strong>Pagamento:</strong> ${escapeHtml(order.formaPagamento || 'Não informado')}</div>
          ${changeFor > 0 ? `<div class="receipt-row"><span>Troco</span><strong>${formatter.format(changeValue)}</strong></div>` : ''}
          ${receiptPrefs.cliente?.nome !== false ? `<div class="left"><strong>Cliente:</strong> ${escapeHtml(order.cliente || 'Não informado')}</div>` : ''}
          ${receiptPrefs.cliente?.telefone !== false ? `<div class="left"><strong>Telefone:</strong> ${escapeHtml(order.telefoneCompleto || order.telefone || 'Não informado')}</div>` : ''}
          ${receiptPrefs.cliente?.endereco !== false ? `<div class="left"><strong>Endereço:</strong> ${escapeHtml(order.enderecoEntrega || 'Não informado')}</div>` : ''}
          <div class="line"></div>
          <p>${escapeHtml(company.rodapeRecibo || 'Obrigado pela preferência!')}</p>
        </main>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `;
  };

  const printReceipt = (order) => {
    const receiptWindow = window.open('', '_blank', 'width=420,height=700');
    if (!receiptWindow) return;
    receiptWindow.document.write(buildReceiptHtml(order));
    receiptWindow.document.close();
    window.DogtopAudit?.log({
      modulo: 'Recibos',
      acao: 'Segunda via impressa',
      entidade: String(order.id || getOrderCode(order)),
      detalhe: `2ª via do pedido #${getOrderCode(order)} enviada para impressão.`,
      severidade: 'info',
      dados: { pedidoId: order.id, total: order.total, status: order.status || 'recebido' }
    });
  };

  const renderOrders = (orders) => {
    if (!orders.length) {
      result.innerHTML = '<div class="w-full rounded-xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">Nenhum pedido encontrado com os filtros informados.</div>';
      return;
    }

    result.innerHTML = orders.map((order) => {
      const code = getOrderCode(order);
      const status = order.status || 'recebido';
      const statusClass = statusClasses[status] || statusClasses.recebido;
      const isCanceled = status === 'cancelado';
      return `
      <div class="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-bold text-slate-800">Pedido #${escapeHtml(code)}</h3>
            <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClass}">${escapeHtml(statusLabels[status] || status)}</span>
          </div>
          <p>${escapeHtml(order.cliente || 'Cliente não informado')} | ${escapeHtml(formatDate(order.criadoEm))}</p>
          <p class="text-sm text-slate-600 mt-1">Total: <strong class="text-slate-800">${formatter.format(normalizeNumber(order.total))}</strong>${isCanceled ? ' | Recibo marcado como cancelado' : ''}</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <a class="inline-flex justify-center px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500" href="./andamento-pedido.html?id=${encodeURIComponent(order.id || '')}&voltar=segunda-via">Abrir</a>
          <button class="inline-flex justify-center px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" type="button" data-print-order="${escapeHtml(order.id || '')}">${isCanceled ? 'Imprimir cancelado' : 'Imprimir recibo'}</button>
        </div>
      </div>
    `;
    }).join('');
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const hasAnyFilter = [orderInput.value, clientInput.value, dateInput.value].some((value) => normalizeText(value));
    if (!hasAnyFilter) {
      result.innerHTML = '<div class="w-full rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-700">Informe pelo menos um filtro: pedido, cliente ou data.</div>';
      return;
    }
    renderOrders(findOrders());
  });

  result.addEventListener('click', (event) => {
    const button = event.target.closest('[data-print-order]');
    if (!button) return;
    const order = readOrders().find((item) => String(item.id) === String(button.dataset.printOrder));
    if (order) printReceipt(order);
  });

  const params = new URLSearchParams(window.location.search);
  const pedidoParam = params.get('pedido');
  setLabelFor();
  if (pedidoParam) {
    orderInput.value = pedidoParam;
    renderOrders(findOrders());
  }
})();
