(() => {
  const ONLINE_ORDERS_STORAGE_KEY = 'dogtopPedidosOnline';

  const currencyFormatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const getOrders = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(ONLINE_ORDERS_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const params = new URLSearchParams(window.location.search);
  const getOrderId = () => params.get('id');
  const orderId = getOrderId();
  const backTargets = {
    historico: { href: './historico.html', label: 'Voltar ao histórico' },
    'segunda-via': { href: './segunda-via.html', label: 'Voltar à 2ª via' },
    pedidos: { href: './pedidos.html', label: 'Voltar aos pedidos' },
    online: { href: './pedidos-online.html', label: 'Nova compra' }
  };
  const backLink = document.getElementById('track-back-link');
  const backTarget = backTargets[params.get('voltar')] || backTargets.online;
  if (backLink) {
    backLink.href = backTarget.href;
    backLink.setAttribute('aria-label', backTarget.label);
    backLink.setAttribute('title', backTarget.label);
  }
  const orders = getOrders();
  const order = orders.find((item) => String(item.id) === String(orderId));
  const company = window.DogtopConfig?.getCompany?.() || {
    nome: 'Dogtop',
    nomeRecibo: 'DOGTOP',
    endereco: 'Avenida Modesto Paludo, 2440NW',
    email: 'dogtopspz@gmail.com',
    whatsapp: '+55 65 99361-2193',
    telefone: '+55 (65) 99361-2193'
  };
  const config = window.DogtopConfig?.load?.() || {};
  const receiptPrefs = config.recibo || window.DogtopConfig?.defaults?.recibo || {
    loja: { logotipo: true, nome: true, documento: true, telefone: true, whatsapp: true, endereco: true },
    cliente: { nome: true, telefone: true, endereco: true }
  };

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const setHidden = (element, hidden) => {
    if (!element) return;
    element.hidden = hidden;
    element.classList.toggle('hidden', hidden);
  };
  const statusLabels = {
    recebido: 'Pedido enviado!',
    preparo: 'Pedido em preparo',
    saiu_entrega: 'Saiu para entrega',
    concluido: 'Pedido concluído',
    cancelado: 'Pedido cancelado'
  };

  if (!order) {
    document.querySelector('.order-track').innerHTML = `
      <section class="track-card track-empty">
        <div class="track-section-title">Pedido nao encontrado</div>
        <p class="track-muted">Confira o link recebido ou inicie uma nova compra.</p>
        <a class="track-new-order" href="./pedidos-online.html">Iniciar nova compra</a>
      </section>
    `;
    return;
  }

  const orderCode = String(order.id || '').slice(-6).toUpperCase();
  const createdAt = order.criadoEm ? new Date(order.criadoEm).toLocaleString('pt-BR') : 'Data nao informada';
  const deliveryFee = Number(order.taxaEntrega) || 0;
  const subtotal = Number(order.subtotal) || Math.max((Number(order.total) || 0) - deliveryFee, 0);
  const originalSubtotal = Number(order.subtotalOriginal) || subtotal;
  const discount = Number(order.desconto) || Math.max(originalSubtotal - subtotal, 0);
  const orderTotal = Number(order.total) || 0;
  const changeFor = order.formaPagamento === 'Dinheiro' ? Number(order.trocoPara) || 0 : 0;
  const changeValue = Number(order.trocoDevolver) || Math.max(changeFor - orderTotal, 0);
  const paymentChange = '';
  const receiptChangeRows = changeFor > 0
    ? `
      <div class="receipt-row"><span>Troco</span><strong>${currencyFormatter.format(changeValue)}</strong></div>
    `
    : '';
  const receiptLogo = receiptPrefs.loja?.logotipo && company.logotipo
    ? `<div class="receipt-logo receipt-logo--image"><img src="${company.logotipo}" alt="Logotipo ${escapeHtml(company.nome || 'Dogtop')}"></div>`
    : '<div class="receipt-logo">DT</div>';
  const receiptHeader = company.cabecalhoRecibo
    ? `<p>${escapeHtml(company.cabecalhoRecibo)}</p>`
    : '';
  const receiptFooter = company.rodapeRecibo || 'Obrigado pela preferencia!';
  const receiptStoreRows = [
    receiptPrefs.loja?.nome ? `<h1>${escapeHtml(company.nomeRecibo || company.nome)}</h1>` : '',
    receiptPrefs.loja?.documento && company.documento ? `<p>${escapeHtml(company.documento)}</p>` : '',
    receiptPrefs.loja?.endereco ? `<p>${escapeHtml([company.endereco, company.complemento].filter(Boolean).join(' - '))}</p>` : '',
    receiptPrefs.loja?.telefone ? `<p>Telefone: ${escapeHtml(company.telefone)}</p>` : '',
    receiptPrefs.loja?.whatsapp ? `<p>WhatsApp: ${escapeHtml(company.whatsapp)}</p>` : ''
  ].filter(Boolean).join('');
  const receiptClientRows = [
    receiptPrefs.cliente?.nome ? `<div class="left"><strong>Cliente:</strong> ${escapeHtml(order.cliente || 'Nao informado')}</div>` : '',
    receiptPrefs.cliente?.telefone ? `<div class="left"><strong>Telefone:</strong> ${escapeHtml(order.telefoneCompleto || order.telefone || 'Nao informado')}</div>` : '',
    receiptPrefs.cliente?.endereco ? `<div class="left"><strong>Endereco:</strong> ${escapeHtml(order.enderecoEntrega || 'Nao informado')}</div>` : '',
    `<div class="left"><strong>Referência:</strong> ${escapeHtml(order.pontoReferencia || 'Não informado')}</div>`
  ].filter(Boolean).join('');
  const receiptItems = (order.itens || []).map((item) => {
    const hasDiscount = Number(item.desconto) > 0;
    const prices = hasDiscount
      ? `<div class="receipt-prices"><span>${currencyFormatter.format(item.precoVenda)}</span><strong>${currencyFormatter.format(item.precoUnitario)}</strong></div>`
      : `<strong>${currencyFormatter.format(item.precoUnitario)}</strong>`;

    return `
      <div class="receipt-item">
        <div>
          <strong>${escapeHtml(item.quantidade)}x ${escapeHtml(item.nome)}</strong>
          ${prices}
        </div>
        <strong>${currencyFormatter.format(item.subtotal)}</strong>
      </div>
    `;
  }).join('');

  document.title = `Andamento do Pedido #${orderCode} - DOGTOP`;
  setText('track-title', `Andamento do pedido #${orderCode}`);
  setText('track-status-title', statusLabels[order.status] || 'Pedido enviado!');
  setText('track-date', createdAt);
  setText('track-delivery-type', order.tipoEntrega === 'Delivery' ? 'Entrega - Taxa de entrega' : 'Retirada');
  setText('track-delivery-fee', currencyFormatter.format(deliveryFee));
  setText('track-payment', `${order.formaPagamento || 'Pagamento nao informado'}${paymentChange}`);
  setText('track-change-value', currencyFormatter.format(changeValue));
  setText('track-original-subtotal', currencyFormatter.format(originalSubtotal));
  setText('track-discount', `- ${currencyFormatter.format(discount)}`);
  setText('track-subtotal', currencyFormatter.format(subtotal));
  setText('track-total', currencyFormatter.format(orderTotal));
  setText('track-client', order.cliente || 'Nao informado');
  setText('track-phone', order.telefoneCompleto || order.telefone || 'Nao informado');
  setText('track-address', order.enderecoEntrega || 'Nao informado');
  setText('track-reference', order.pontoReferencia || 'Nao informado');

  const itemsElement = document.getElementById('track-items');
  if (itemsElement) {
    itemsElement.innerHTML = (order.itens || []).map((item) => {
      const hasDiscount = Number(item.desconto) > 0;

      return `
        <div class="track-item">
          <div class="track-item__info">
            <span class="track-item__qty">${escapeHtml(item.quantidade)}x</span>
            <span>${escapeHtml(item.nome)}</span>
            ${hasDiscount ? `
              <small>
                <span class="track-old-price">${currencyFormatter.format(item.precoVenda)}</span>
                <strong class="track-promo-price">${currencyFormatter.format(item.precoUnitario)}</strong>
              </small>
            ` : ''}
          </div>
          <span class="track-item__price">${currencyFormatter.format(item.subtotal)}</span>
        </div>
      `;
    }).join('');
  }

  const discountRow = document.getElementById('track-discount-row');
  setHidden(discountRow, discount <= 0);
  const changeValueRow = document.getElementById('track-change-value-row');
  setHidden(changeValueRow, changeFor <= 0);

  const contactItems = document.querySelectorAll('.track-contact li');
  if (contactItems.length) {
    contactItems[0].textContent = `WhatsApp: ${company.whatsapp}`;
    contactItems[1].textContent = `Email: ${company.email}`;
    contactItems[2].textContent = `Telefone: ${company.telefone}`;
    contactItems[3].textContent = `Endereco: ${company.endereco}`;
  }

  const copyButton = document.getElementById('copy-track-link');
  const copyFeedback = document.getElementById('copy-track-feedback');
  const cancelButton = document.getElementById('cancel-track-order');
  if (cancelButton) {
    cancelButton.hidden = ['cancelado', 'concluido'].includes(order.status);
    cancelButton.addEventListener('click', () => {
      if (!window.confirm('Deseja cancelar este pedido?')) return;
      order.status = 'cancelado';
      order.canceladoEm = new Date().toISOString();
      localStorage.setItem(ONLINE_ORDERS_STORAGE_KEY, JSON.stringify(orders));
      window.DogtopAudit?.log({
        modulo: 'Pedidos Online',
        acao: 'Pedido cancelado',
        entidade: String(order.id || orderCode),
        detalhe: `Pedido #${orderCode} cancelado pela tela de acompanhamento.`,
        severidade: 'alerta',
        dados: { pedidoId: order.id, total: orderTotal }
      });
      setText('track-status-title', statusLabels.cancelado);
      cancelButton.hidden = true;
      if (copyFeedback) copyFeedback.textContent = 'Pedido cancelado.';
    });
  }
  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      if (copyFeedback) copyFeedback.textContent = 'Link copiado.';
    } catch {
      if (copyFeedback) copyFeedback.textContent = window.location.href;
    }
  });

  document.getElementById('print-track-receipt')?.addEventListener('click', () => {
    window.DogtopAudit?.log({
      modulo: 'Pedidos Online',
      acao: 'Recibo impresso',
      entidade: String(order.id || orderCode),
      detalhe: `Recibo do pedido #${orderCode} enviado para impressao. Total: ${currencyFormatter.format(orderTotal)}.`,
      dados: { pedidoId: order.id, total: orderTotal, formaPagamento: order.formaPagamento }
    });

    const receiptWindow = window.open('', '_blank', 'width=420,height=700');
    if (!receiptWindow) return;

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Recibo ${escapeHtml(company.nome)} #${escapeHtml(orderCode)}</title>
        <style>
          body { margin: 0; background: #f4f4f4; font-family: "Courier New", monospace; }
          .receipt { width: 80mm; min-height: 100vh; margin: 0 auto; padding: 14px; background: #fff; color: #111; }
          .receipt-logo { width: 48px; height: 48px; margin: 0 auto 8px; display: grid; place-items: center; border: 2px solid #111; border-radius: 50%; font-weight: 900; overflow: hidden; }
          .receipt-logo--image { border-radius: 6px; border: 0; width: 70px; height: 70px; }
          .receipt-logo img { width: 100%; height: 100%; object-fit: contain; }
          h1, p { margin: 0; text-align: center; }
          h1 { font-size: 18px; }
          p, div { font-size: 12px; line-height: 1.35; }
          .line { border-top: 1px dashed #111; margin: 12px 0; }
          .receipt-row, .receipt-item { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
          .receipt-item > div { flex: 1; }
          .receipt-prices span { margin-right: 8px; color: #666; text-decoration: line-through; }
          .receipt-prices strong { color: #111; }
          .total { font-size: 15px; font-weight: 900; }
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
          ${receiptStoreRows}
          ${receiptHeader}
          <div class="line"></div>
          <div class="receipt-row"><span>Pedido</span><strong>#${escapeHtml(orderCode)}</strong></div>
          <div class="receipt-row"><span>Data</span><strong>${escapeHtml(createdAt)}</strong></div>
          <div class="line"></div>
          ${receiptItems}
          <div class="line"></div>
          <div class="receipt-row"><span>Somatoria itens</span><strong>${currencyFormatter.format(originalSubtotal)}</strong></div>
          <div class="receipt-row"><span>Desconto</span><strong>${currencyFormatter.format(discount)}</strong></div>
          <div class="receipt-row"><span>Subtotal</span><strong>${currencyFormatter.format(subtotal)}</strong></div>
          <div class="receipt-row"><span>Taxa entrega</span><strong>${currencyFormatter.format(deliveryFee)}</strong></div>
          <div class="receipt-row total"><span>Total</span><strong>${currencyFormatter.format(orderTotal)}</strong></div>
          <div class="line"></div>
          <div class="left"><strong>Pagamento:</strong> ${escapeHtml(order.formaPagamento || 'Nao informado')}${escapeHtml(paymentChange)}</div>
          ${receiptChangeRows}
          ${receiptClientRows}
          <div class="line"></div>
          <p>${escapeHtml(receiptFooter)}</p>
        </main>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `);
    receiptWindow.document.close();
  });
})();
