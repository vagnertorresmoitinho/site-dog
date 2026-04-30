document.body.dataset.page = 'cozinha';

(() => {
  const board = document.getElementById('kitchen-board');
  const empty = document.getElementById('kitchen-empty');
  const refreshButton = document.getElementById('kitchen-refresh');
  if (!board) return;

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const statusLabels = {
    recebido: 'Recebido',
    preparo: 'Em preparo',
    saiu_entrega: 'Pronto / despacho',
    concluido: 'Concluido',
    cancelado: 'Cancelado'
  };

  const kitchenColumns = [
    {
      id: 'recebido',
      title: 'Recebidos',
      subtitle: 'Aguardando inicio',
      dotClass: 'kds-dot--waiting',
      columnClass: 'kds-column--waiting',
      empty: 'Nenhum pedido recebido.'
    },
    {
      id: 'preparo',
      title: 'Em preparo',
      subtitle: 'Na chapa / montagem',
      dotClass: 'kds-dot--preparing',
      columnClass: 'kds-column--preparing',
      empty: 'Nenhum lanche em preparo.'
    },
    {
      id: 'saiu_entrega',
      title: 'Prontos / despacho',
      subtitle: 'Entrega ou retirada',
      dotClass: 'kds-dot--ready',
      columnClass: 'kds-column--ready',
      empty: 'Nenhum pedido pronto.'
    }
  ];

  let orders = [];

  const normalizeStatus = (status) => {
    const normalized = String(status || 'recebido').trim().toLowerCase();
    if (['pendente', 'confirmado', 'pago', 'recebido'].includes(normalized)) return 'recebido';
    if (['preparo', 'em_producao', 'em producao', 'em preparo'].includes(normalized)) return 'preparo';
    if (['saiu_entrega', 'pronto', 'pronto_retirada', 'pronto_para_retirar', 'pronto / despacho'].includes(normalized)) return 'saiu_entrega';
    if (['concluido', 'concluído'].includes(normalized)) return 'concluido';
    if (['cancelado'].includes(normalized)) return 'cancelado';
    return 'recebido';
  };

  const getActiveOrders = () => orders
    .map((order) => ({ ...order, status: normalizeStatus(order.status) }))
    .filter((order) => !['cancelado', 'concluido'].includes(order.status))
    .sort((a, b) => new Date(a.criadoEm || 0) - new Date(b.criadoEm || 0));

  const nextStatus = (order) => {
    const currentStatus = normalizeStatus(order.status);
    if (currentStatus === 'recebido') return 'preparo';
    if (currentStatus === 'preparo') return 'saiu_entrega';
    if (currentStatus === 'saiu_entrega') return 'concluido';
    return currentStatus;
  };

  const getActionLabel = (order, next) => {
    if (next === 'preparo') return 'Iniciar preparo';
    if (next === 'saiu_entrega') return 'Marcar pronto';
    if (next === 'concluido') return order.tipoEntrega === 'Delivery' ? 'Saiu para entrega' : 'Cliente retirou';
    return `Avancar para ${statusLabels[next] || next}`;
  };

  const getOrderMinutes = (order) => {
    const createdAt = new Date(order.criadoEm || order.atualizadoEm || Date.now()).getTime();
    if (!Number.isFinite(createdAt)) return '--';
    return Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  };

  const formatOrderTime = (order) => {
    const date = new Date(order.criadoEm || order.atualizadoEm || Date.now());
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getItemNotes = (item) => [
    item.observacao,
    item.observacoes,
    item.adicionaisTexto,
    Array.isArray(item.adicionais) ? item.adicionais.map((extra) => extra.nome || extra).join(', ') : ''
  ].map((value) => String(value || '').trim()).filter(Boolean);

  const hasSpecialAttention = (order) => {
    const orderNotes = String(order.observacoes || '').trim();
    const items = Array.isArray(order.itens) ? order.itens : [];
    return Boolean(orderNotes) || items.some((item) => getItemNotes(item).length > 0);
  };

  const renderItems = (order) => {
    const items = Array.isArray(order.itens) ? order.itens : [];
    if (!items.length) {
      return '<li class="kds-item kds-item--empty">Itens nao informados.</li>';
    }

    return items.map((item) => {
      const notes = getItemNotes(item);
      return `
      <li class="kds-item ${notes.length ? 'kds-item--special' : ''}">
        <span class="kds-item__qty">${escapeHtml(item.quantidade || 1)}x</span>
        <div class="kds-item__content">
          <strong>${escapeHtml(item.nome || 'Item sem nome')}</strong>
          ${notes.map((note) => `<small>${escapeHtml(note)}</small>`).join('')}
        </div>
        <span class="kds-item__price">${currencyFormatter.format(Number(item.subtotal) || 0)}</span>
      </li>
    `;
    }).join('');
  };

  const renderCard = (order) => {
    const code = String(order.id || '').slice(-6).toUpperCase() || 'PEDIDO';
    const next = nextStatus(order);
    const minutes = getOrderMinutes(order);
    const currentStatus = normalizeStatus(order.status);
    const specialAttention = hasSpecialAttention(order);

    return `
      <article class="kds-card ${specialAttention ? 'kds-card--special' : ''}" data-order-id="${escapeHtml(order.id)}" draggable="true">
        <header class="kds-card__header">
          <div>
            <span class="kds-card__eyebrow">Pedido</span>
            <h3>#${escapeHtml(code)}</h3>
          </div>
          <div class="kds-card__top">
            <div class="kds-card__time">
              <strong>${escapeHtml(String(minutes))} min</strong>
              <span>${escapeHtml(formatOrderTime(order))}</span>
            </div>
            <div class="kds-actions kds-actions--top">
              ${next !== currentStatus ? `<button class="kds-button kds-button--primary" type="button" data-action="next">${escapeHtml(getActionLabel(order, next))}</button>` : ''}
              <button class="kds-button kds-button--print" type="button" data-action="print">Imprimir</button>
              ${currentStatus === 'recebido' ? '<button class="kds-button kds-button--ghost" type="button" data-action="cancel">Cancelar</button>' : ''}
            </div>
          </div>
        </header>

        ${specialAttention ? '<div class="kds-special-banner">Atenção: adicional ou retirada neste pedido</div>' : ''}

        <div class="kds-card__meta">
          <span>${escapeHtml(order.tipoEntrega || 'Entrega nao informada')}</span>
          <strong>${escapeHtml(order.cliente || 'Cliente nao informado')}</strong>
        </div>

        ${order.enderecoEntrega ? `<p class="kds-card__address">${escapeHtml(order.enderecoEntrega)}</p>` : ''}
        ${order.observacoes ? `<p class="kds-card__note">${escapeHtml(order.observacoes)}</p>` : ''}

        <ul class="kds-items">${renderItems(order)}</ul>

        <footer class="kds-card__footer">
          <strong>Total ${currencyFormatter.format(Number(order.total) || 0)}</strong>
        </footer>
      </article>
    `;
  };

  const render = async () => {
    orders = (await window.DogtopData.getPedidos()) || [];
    const activeOrders = getActiveOrders();

    board.innerHTML = kitchenColumns.map((column) => {
      const columnOrders = activeOrders.filter((order) => order.status === column.id);

      return `
        <section class="kds-column ${column.columnClass}" data-drop-status="${escapeHtml(column.id)}" aria-label="${escapeHtml(column.title)}">
          <header class="kds-column__header">
            <div>
              <h2><span class="kds-dot ${column.dotClass}"></span>${escapeHtml(column.title)}</h2>
              <p>${escapeHtml(column.subtitle)}</p>
            </div>
            <span>${columnOrders.length}</span>
          </header>
          <div class="kds-column__body">
            ${columnOrders.length ? columnOrders.map(renderCard).join('') : `<div class="kds-empty-column">${escapeHtml(column.empty)}</div>`}
          </div>
        </section>
      `;
    }).join('');

    board.classList.toggle('hidden', activeOrders.length === 0);
    if (empty) {
      empty.classList.toggle('hidden', activeOrders.length > 0);
      empty.style.display = activeOrders.length ? 'none' : 'flex';
    }
  };

  const updateOrderStatus = async (order, next, actionLabel = 'Status atualizado') => {
    const previousStatus = normalizeStatus(order.status);
    const nextNormalizedStatus = normalizeStatus(next);

    if (previousStatus === nextNormalizedStatus) return;

    order.status = nextNormalizedStatus;
    order.atualizadoEm = new Date().toISOString();
    
    await window.DogtopData.savePedido(order);
    window.DogtopAudit?.log({
      modulo: 'Cozinha',
      acao: actionLabel,
      entidade: String(order.id),
      detalhe: `Pedido saiu de ${statusLabels[previousStatus] || previousStatus} para ${statusLabels[order.status] || order.status}.`,
      severidade: order.status === 'cancelado' ? 'alerta' : 'info',
      dados: { pedidoId: order.id, statusAnterior: previousStatus, statusAtual: order.status }
    });
    await render();
  };

  board.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    const card = event.target.closest('[data-order-id]');
    if (!button || !card) return;
    const order = orders.find((item) => String(item.id) === String(card.dataset.orderId));
    if (!order) return;

    if (button.dataset.action === 'cancel' && !window.confirm('Cancelar este pedido?')) return;

    if (button.dataset.action === 'print') {
      if (window.DogtopThermalPrint?.printKitchenTicket?.(order, { reprint: true })) {
        window.DogtopAudit?.log({
          modulo: 'Cozinha',
          acao: 'Comanda reimpressa',
          entidade: String(order.id),
          detalhe: `Comanda de cozinha do pedido #${String(order.id).slice(-6).toUpperCase()} reimpressa pelo KDS.`,
          dados: { pedidoId: order.id, status: order.status || 'recebido' }
        });
      }
      return;
    }

    await updateOrderStatus(
      order,
      button.dataset.action === 'cancel' ? 'cancelado' : nextStatus(order),
      button.dataset.action === 'cancel' ? 'Pedido cancelado' : 'Status atualizado'
    );
  });

  board.addEventListener('dragstart', (event) => {
    const card = event.target.closest('[data-order-id]');
    if (!card) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.orderId);
    card.classList.add('is-dragging');
  });

  board.addEventListener('dragend', (event) => {
    event.target.closest('[data-order-id]')?.classList.remove('is-dragging');
    board.querySelectorAll('.is-drag-over').forEach((column) => column.classList.remove('is-drag-over'));
  });

  board.addEventListener('dragover', (event) => {
    const column = event.target.closest('[data-drop-status]');
    if (!column) return;
    event.preventDefault();
    column.classList.add('is-drag-over');
  });

  board.addEventListener('dragleave', (event) => {
    const column = event.target.closest('[data-drop-status]');
    if (!column || column.contains(event.relatedTarget)) return;
    column.classList.remove('is-drag-over');
  });

  board.addEventListener('drop', async (event) => {
    const column = event.target.closest('[data-drop-status]');
    if (!column) return;
    event.preventDefault();
    column.classList.remove('is-drag-over');

    const orderId = event.dataTransfer.getData('text/plain');
    const order = orders.find((item) => String(item.id) === String(orderId));
    if (!order) return;

    await updateOrderStatus(order, column.dataset.dropStatus, 'Status movido no KDS');
  });

  refreshButton?.addEventListener('click', async () => await render());
  render();
})();
