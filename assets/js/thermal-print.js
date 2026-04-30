(() => {
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const getOrderCode = (order) => String(order?.id || '').slice(-6).toUpperCase() || 'PEDIDO';
  const formatDate = (value) => {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? 'Data nao informada' : date.toLocaleString('pt-BR');
  };

  const buildKitchenTicketHtml = (order, options = {}) => {
    const company = window.DogtopConfig?.getCompany?.() || {};
    const code = getOrderCode(order);
    const createdAt = formatDate(order?.criadoEm);
    const title = options.reprint ? 'REIMPRESSAO COZINHA' : 'COMANDA COZINHA';
    const items = Array.isArray(order?.itens) ? order.itens : [];
    const itemRows = items.length ? items.map((item) => {
      const notes = [
        item.observacao,
        item.observacoes,
        item.adicionaisTexto,
        Array.isArray(item.adicionais) ? item.adicionais.map((extra) => extra.nome || extra).join(', ') : ''
      ].filter(Boolean).join(' | ');

      return `
        <div class="item">
          <div class="item-main">
            <strong>${escapeHtml(item.quantidade || 1)}x ${escapeHtml(item.nome || 'Item sem nome')}</strong>
          </div>
          ${notes ? `<div class="note">OBS: ${escapeHtml(notes)}</div>` : ''}
        </div>
      `;
    }).join('') : '<div class="item"><strong>Itens nao informados</strong></div>';

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)} #${escapeHtml(code)}</title>
        <style>
          body { margin: 0; background: #f4f4f4; font-family: "Courier New", monospace; }
          .ticket { width: 80mm; min-height: 100vh; margin: 0 auto; padding: 12px; background: #fff; color: #000; }
          h1, h2, p { margin: 0; text-align: center; }
          h1 { font-size: 19px; font-weight: 900; }
          h2 { margin-top: 6px; font-size: 22px; font-weight: 900; }
          p, div { font-size: 13px; line-height: 1.35; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
          .left { text-align: left; }
          .big { font-size: 16px; font-weight: 900; text-transform: uppercase; }
          .item { padding: 8px 0; border-bottom: 1px dashed #999; }
          .item-main strong { display: block; font-size: 17px; line-height: 1.25; }
          .note { margin-top: 4px; font-size: 13px; font-weight: 900; text-transform: uppercase; }
          .attention { border: 2px solid #000; padding: 7px; text-align: center; font-weight: 900; margin-top: 8px; }
          @media print {
            body { background: #fff; }
            .ticket { width: 80mm; margin: 0; box-shadow: none; }
            @page { size: 80mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        <main class="ticket">
          <h1>${escapeHtml(company.nomeRecibo || company.nome || 'DOGTOP')}</h1>
          <p>${escapeHtml(title)}</p>
          <h2>#${escapeHtml(code)}</h2>
          <div class="line"></div>
          <div class="row"><span>Data</span><strong>${escapeHtml(createdAt)}</strong></div>
          <div class="row"><span>Tipo</span><strong>${escapeHtml(order?.tipoEntrega || 'Nao informado')}</strong></div>
          <div class="row"><span>Cliente</span><strong>${escapeHtml(order?.cliente || 'Nao informado')}</strong></div>
          ${order?.telefoneCompleto || order?.telefone ? `<div class="row"><span>Telefone</span><strong>${escapeHtml(order.telefoneCompleto || order.telefone)}</strong></div>` : ''}
          ${order?.enderecoEntrega ? `<div class="left"><strong>Endereco:</strong> ${escapeHtml(order.enderecoEntrega)}</div>` : ''}
          ${order?.pontoReferencia ? `<div class="left"><strong>Referencia:</strong> ${escapeHtml(order.pontoReferencia)}</div>` : ''}
          <div class="line"></div>
          <div class="big">Itens para producao</div>
          ${itemRows}
          ${order?.observacoes ? `<div class="attention">OBS PEDIDO: ${escapeHtml(order.observacoes)}</div>` : ''}
          <div class="line"></div>
          <p>Conferir itens antes do despacho</p>
        </main>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `;
  };

  const printKitchenTicket = (order, options = {}) => {
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) return false;
    printWindow.document.write(buildKitchenTicketHtml(order, options));
    printWindow.document.close();
    return true;
  };

  window.DogtopThermalPrint = {
    buildKitchenTicketHtml,
    printKitchenTicket
  };
})();
