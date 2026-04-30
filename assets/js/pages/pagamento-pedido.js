(() => {
  const DRAFT_STORAGE_KEY = 'dogtopPedidoRascunho';
  const CLIENT_PHONE_SESSION_KEY = 'dogtopClienteTelefoneAtual';
  const DELIVERY_FEE = window.DogtopConfig?.getDeliveryFee?.() ?? 8;

  const form = document.getElementById('payment-form');
  const feedback = document.getElementById('payment-feedback');
  const itemsElement = document.getElementById('payment-items');
  const clientListElement = document.getElementById('payment-client-list');
  const deliveryFeeField = document.getElementById('payment-delivery-fee-field');
  const deliveryFeeRow = document.getElementById('payment-delivery-fee-row');
  const discountRow = document.getElementById('payment-discount-row');
  const changeField = document.getElementById('payment-change-field');

  const currencyFormatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const applyCompanyBrand = () => {
    const company = window.DogtopConfig?.getCompany?.();
    if (!company) return;
    const badge = document.querySelector('.online-logo__badge');
    const title = document.querySelector('.online-logo strong');
    if (title) title.textContent = company.nome || 'Dogtop';
    if (badge && company.logotipo) {
      badge.innerHTML = `<img src="${company.logotipo}" alt="Logotipo ${company.nome || 'Dogtop'}">`;
      badge.classList.add('online-logo__badge--image');
    }
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const normalizeText = (value) => String(value ?? '').trim();
  const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
  };
  const formatFullPhone = (value) => {
    const digits = onlyDigits(value);
    if (!digits) return '';
    const withoutCountry = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
    const ddd = withoutCountry.slice(0, 2);
    const number = withoutCountry.slice(2);
    return ddd && number ? `+55 (${ddd}) ${number}` : `+55 ${withoutCountry}`;
  };
  const createId = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
    return `pedido-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const loadDraft = () => {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  };
  const loadClients = async () => {
    const data = await window.DataManager.getClientes();
    return Array.isArray(data) ? data : [];
  };
  const normalizeClient = (client) => ({
    id: String(client.id || ''),
    nome: normalizeText(client.nome) || 'Cliente sem nome',
    cpfCnpj: client.cpfCnpj || '',
    observacoes: client.observacoes || '',
    email: client.email || '',
    telefoneCelular: client.telefoneCelular || client.telefone || '',
    telefone: client.telefone || '',
    endereco: client.endereco || '',
    bairro: client.bairro || '',
    tipoEndereco: client.tipoEndereco || '',
    numero: client.numero || '',
    complemento: client.complemento || '',
    cep: client.cep || '',
    pontoReferencia: client.pontoReferencia || '',
    status: client.status || 'Ativo',
    pedidosHistorico: Array.isArray(client.pedidosHistorico) ? client.pedidosHistorico : []
  });
  const getNextClientId = (clients) => String(clients.reduce((max, client) => {
    const numericId = Number.parseInt(client.id, 10);
    return Number.isNaN(numericId) ? max : Math.max(max, numericId);
  }, 0) + 1).padStart(3, '0');
  const getClientAddress = (client) => [client.tipoEndereco, client.endereco, client.numero, client.bairro, client.complemento]
    .map(normalizeText).filter(Boolean).join(', ');
  const isSamePhone = (left, right) => {
    const leftDigits = onlyDigits(left);
    const rightDigits = onlyDigits(right);
    if (!leftDigits || !rightDigits) return false;
    return leftDigits === rightDigits || leftDigits.endsWith(rightDigits) || rightDigits.endsWith(leftDigits);
  };
  const findClientByPhone = (clients, phone) => {
    return clients.find((client) => isSamePhone(client.telefoneCelular, phone) || isSamePhone(client.telefone, phone)) || null;
  };
  const findClientByName = (clients, name) => {
    const targetName = normalizeText(name).toLowerCase();
    if (!targetName) return null;
    return clients.find((client) => normalizeText(client.nome).toLowerCase() === targetName) || null;
  };

  const draft = loadDraft();
  if (!draft || !Array.isArray(draft.itens) || !draft.itens.length) {
    (document.querySelector('.online-main') || document.querySelector('main')).innerHTML = `
      <section class="online-cart">
        <h2>Nenhum pedido em andamento</h2>
        <p class="online-feedback error">Volte ao cardápio e selecione os produtos antes do pagamento.</p>
        <a class="online-completed__track" href="./pedidos-online.html">Abrir cardápio</a>
      </section>
    `;
    return;
  }

  if (draft.cliente && form.elements.namedItem('cliente')) {
    form.elements.namedItem('cliente').value = draft.cliente;
  }

  const getDraftObservations = () => {
    const observations = [];
    if (draft.observacoes) observations.push(normalizeText(draft.observacoes));

    draft.itens.forEach((item) => {
      const itemNotes = [];
      if (Array.isArray(item.adicionais) && item.adicionais.length) {
        itemNotes.push(`Adicionais: ${item.adicionais.map((additional) => additional.nome.replace(/^Adicional de\s*/i, '')).join(', ')}`);
      }
      if (item.observacao) itemNotes.push(`Obs: ${item.observacao}`);
      if (!itemNotes.length && item.observacoes) itemNotes.push(normalizeText(item.observacoes));
      if (itemNotes.length) {
        observations.push(`${item.quantidade || 1}x ${item.nome}: ${itemNotes.join(' | ')}`);
      }
    });

    return [...new Set(observations.filter(Boolean))].join('\n');
  };

  const fillDraftObservations = () => {
    const observationsField = form.elements.namedItem('observacoes');
    if (!observationsField || observationsField.value) return;
    observationsField.value = getDraftObservations();
  };

  fillDraftObservations();

  const isDeliverySelected = () => form.elements.namedItem('tipoEntrega')?.value === 'Delivery';
  const getDeliveryFee = () => isDeliverySelected() ? DELIVERY_FEE : 0;
  const getTotal = () => draft.subtotal + getDeliveryFee();

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const setHidden = (element, hidden) => {
    if (!element) return;
    element.hidden = hidden;
    element.classList.toggle('hidden', hidden);
  };
  const getChangeFor = () => {
    const isCash = form.elements.namedItem('formaPagamento')?.value === 'Dinheiro';
    return isCash ? normalizeNumber(form.elements.namedItem('trocoPara')?.value) : 0;
  };
  const getChangeReturned = () => Math.max(getChangeFor() - getTotal(), 0);

  const renderClientOptions = async () => {
    const clients = (await loadClients()).map(normalizeClient);
    clientListElement.innerHTML = clients.map((client) => `
      <option value="${escapeHtml(client.nome)}" label="${escapeHtml(client.telefoneCelular || client.telefone || 'Sem telefone')}"></option>
    `).join('');
  };

  const renderPaymentMethods = () => {
    const select = form.elements.namedItem('formaPagamento');
    if (!select) return;
    const methods = window.DogtopConfig?.getPaymentMethods?.() || [
      { value: 'Pix', label: 'Pix' },
      { value: 'Cartao de credito', label: 'Cartão de crédito' },
      { value: 'Cartao de debito', label: 'Cartão de débito' },
      { value: 'Dinheiro', label: 'Dinheiro' }
    ];
    select.innerHTML = '<option value="">Selecione</option>' + methods
      .map((method) => `<option value="${escapeHtml(method.value)}">${escapeHtml(method.label)}</option>`)
      .join('');
  };

  const updatePaymentSummary = () => {
    const clientName = normalizeText(form.elements.namedItem('cliente')?.value);
    const phone = normalizeText(form.elements.namedItem('telefone')?.value);
    const address = normalizeText(form.elements.namedItem('enderecoEntrega')?.value);
    const reference = normalizeText(form.elements.namedItem('pontoReferencia')?.value);
    setText('payment-client-summary', clientName || 'Nao informado');
    setText('payment-phone-summary', formatFullPhone(phone) || 'Nao informado');
    setText('payment-address-summary', address || 'Nao informado');
    setText('payment-reference-summary', reference || 'Nao informado');
  };

  const fillClientFields = (client) => {
    if (!client) return;
    form.elements.namedItem('cliente').value = client.nome;
    form.elements.namedItem('telefone').value = client.telefoneCelular || client.telefone || '';
    form.elements.namedItem('enderecoEntrega').value = getClientAddress(client);
    form.elements.namedItem('pontoReferencia').value = client.pontoReferencia || '';
    updatePaymentSummary();
  };

  const updateDeliveryState = () => {
    const deliverySelected = isDeliverySelected();
    const feeInput = form.elements.namedItem('taxaEntrega');
    const addressInput = form.elements.namedItem('enderecoEntrega');
    const referenceInput = form.elements.namedItem('pontoReferencia');

    setHidden(deliveryFeeField, !deliverySelected);
    setHidden(deliveryFeeRow, !deliverySelected);
    if (feeInput) feeInput.value = deliverySelected ? currencyFormatter.format(DELIVERY_FEE) : '';
    if (addressInput) addressInput.required = deliverySelected;
    if (referenceInput) referenceInput.required = deliverySelected;
    renderTotals();
  };

  const updatePaymentMethodState = () => {
    const isCash = form.elements.namedItem('formaPagamento')?.value === 'Dinheiro';
    const changeInput = form.elements.namedItem('trocoPara');
    setHidden(changeField, !isCash);
    if (changeInput) {
      changeInput.required = isCash;
      changeInput.disabled = !isCash;
      if (!isCash) changeInput.value = '';
    }
    renderTotals();
  };

  const renderTotals = () => {
    const discount = Number(draft.desconto) || 0;
    setText('payment-item-count', `${draft.itens.reduce((sum, item) => sum + item.quantidade, 0)} itens`);
    setText('payment-total-hero', currencyFormatter.format(getTotal()));
    setText('payment-original-subtotal', currencyFormatter.format(draft.subtotalOriginal || draft.subtotal));
    setText('payment-discount', `- ${currencyFormatter.format(discount)}`);
    setText('payment-subtotal', currencyFormatter.format(draft.subtotal));
    setText('payment-delivery-fee', `+ ${currencyFormatter.format(getDeliveryFee())}`);
    setText('payment-total', currencyFormatter.format(getTotal()));
    setText('payment-change-for', currencyFormatter.format(getChangeFor()));
    setText('payment-change-returned', currencyFormatter.format(getChangeReturned()));
    setHidden(discountRow, discount <= 0);
    setHidden(document.getElementById('payment-change-summary-row'), getChangeFor() <= 0);
    setHidden(document.getElementById('payment-change-returned-row'), getChangeFor() <= 0);
  };

  const renderItems = () => {
    itemsElement.innerHTML = draft.itens.map((item) => {
      const specialNotes = [
        Array.isArray(item.adicionais) && item.adicionais.length
          ? `Adicionais: ${item.adicionais.map((additional) => additional.nome.replace(/^Adicional de\s*/i, '')).join(', ')}`
          : '',
        item.observacao ? `Obs: ${item.observacao}` : ''
      ].filter(Boolean);

      return `
        <div class="online-cart-item">
          <div>
            <strong>${escapeHtml(item.nome)}</strong>
            <small>
              ${item.desconto > 0 ? `<span class="online-price-original">${currencyFormatter.format(item.precoVenda)}</span> ` : ''}
              ${item.quantidade} x ${currencyFormatter.format(item.precoUnitario)}
            </small>
            ${specialNotes.length ? `<small class="online-cart-special">${escapeHtml(specialNotes.join(' | '))}</small>` : ''}
          </div>
          <strong>${currencyFormatter.format(item.subtotal)}</strong>
        </div>
      `;
    }).join('');
  };

  const upsertClientWithOrder = async (order) => {
    const clients = (await loadClients()).map(normalizeClient);
    let client = findClientByPhone(clients, order.telefone) || findClientByName(clients, order.cliente);

    if (!client) {
      client = normalizeClient({
        id: getNextClientId(clients),
        nome: order.cliente,
        telefoneCelular: order.telefone,
        endereco: order.enderecoEntrega,
        bairro: order.bairro || '',
        pontoReferencia: order.pontoReferencia,
        status: 'Ativo',
        observacoes: 'Cliente cadastrado automaticamente pelo pedido online.',
        pedidosHistorico: []
      });
      clients.unshift(client);
    } else {
      client.nome = client.nome || order.cliente;
      client.telefoneCelular = client.telefoneCelular || order.telefone;
      client.endereco = client.endereco || order.enderecoEntrega;
      client.bairro = client.bairro || order.bairro || '';
      client.pontoReferencia = client.pontoReferencia || order.pontoReferencia;
      client.pedidosHistorico = Array.isArray(client.pedidosHistorico) ? client.pedidosHistorico : [];
    }

    client.pedidosHistorico.unshift({
      id: order.id,
      tipoEntrega: order.tipoEntrega,
      taxaEntrega: order.taxaEntrega,
      subtotal: order.subtotal,
      subtotalOriginal: order.subtotalOriginal,
      desconto: order.desconto,
      telefoneCompleto: order.telefoneCompleto,
      enderecoEntrega: order.enderecoEntrega,
      pontoReferencia: order.pontoReferencia,
      formaPagamento: order.formaPagamento,
      trocoPara: order.trocoPara,
      trocoDevolver: order.trocoDevolver,
      observacoes: order.observacoes,
      itens: order.itens,
      total: order.total,
      status: order.status,
      criadoEm: order.criadoEm
    });

    await window.DataManager.saveCliente(client);
    return client;
  };

  form.elements.namedItem('telefone')?.addEventListener('blur', async (event) => {
    const clients = (await loadClients()).map(normalizeClient);
    const client = findClientByPhone(clients, event.target.value);
    if (client) fillClientFields(client);
    if (event.target.value) localStorage.setItem(CLIENT_PHONE_SESSION_KEY, onlyDigits(event.target.value));
    updatePaymentSummary();
  });
  form.elements.namedItem('cliente')?.addEventListener('change', async (event) => {
    const clients = (await loadClients()).map(normalizeClient);
    const client = findClientByName(clients, event.target.value);
    if (client) fillClientFields(client);
    updatePaymentSummary();
  });
  form.elements.namedItem('tipoEntrega')?.addEventListener('change', updateDeliveryState);
  form.elements.namedItem('formaPagamento')?.addEventListener('change', updatePaymentMethodState);
  form.elements.namedItem('trocoPara')?.addEventListener('input', renderTotals);
  ['cliente', 'telefone', 'enderecoEntrega', 'pontoReferencia'].forEach((fieldName) => {
    form.elements.namedItem(fieldName)?.addEventListener('input', updatePaymentSummary);
  });
  form.elements.namedItem('telefone')?.addEventListener('input', (event) => {
    if (event.target.value) localStorage.setItem(CLIENT_PHONE_SESSION_KEY, onlyDigits(event.target.value));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.textContent = '';
    feedback.className = 'online-feedback';
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const formaPagamento = normalizeText(formData.get('formaPagamento'));
    const trocoPara = formaPagamento === 'Dinheiro' ? normalizeNumber(formData.get('trocoPara')) : 0;
    const trocoDevolver = Math.max(trocoPara - getTotal(), 0);
    const order = {
      id: createId(),
      cliente: normalizeText(formData.get('cliente')),
      telefone: normalizeText(formData.get('telefone')),
      telefoneCompleto: formatFullPhone(formData.get('telefone')),
      tipoEntrega: normalizeText(formData.get('tipoEntrega')),
      taxaEntrega: getDeliveryFee(),
      subtotalOriginal: draft.subtotalOriginal,
      desconto: draft.desconto,
      subtotal: draft.subtotal,
      enderecoEntrega: normalizeText(formData.get('enderecoEntrega')),
      bairro: '',
      pontoReferencia: normalizeText(formData.get('pontoReferencia')),
      formaPagamento,
      trocoPara,
      trocoDevolver,
      observacoes: normalizeText(formData.get('observacoes')),
      itens: draft.itens,
      total: getTotal(),
      status: 'recebido',
      criadoEm: new Date().toISOString()
    };

    const linkedClient = await upsertClientWithOrder(order);
    order.clienteId = linkedClient.id;
    localStorage.setItem(CLIENT_PHONE_SESSION_KEY, onlyDigits(order.telefone));

    const stockResult = await window.DogtopStock?.processOrder?.(order);
    if (stockResult?.ok) {
      order.estoqueProcessadoEm = new Date().toISOString();
      order.baixaEstoque = {
        itens: stockResult.applied || [],
        criticos: stockResult.critical || []
      };
      if (stockResult.critical?.length) {
        window.DogtopAudit?.log({
          modulo: 'Estoque',
          acao: 'Estoque critico apos venda',
          entidade: String(order.id),
          detalhe: `${stockResult.critical.length} insumo(s) ficaram no limite minimo apos o pedido #${String(order.id).slice(-6).toUpperCase()}.`,
          severidade: 'alerta',
          dados: { pedidoId: order.id, criticos: stockResult.critical }
        });
      }
    }

    await window.DataManager.savePedido(order);
    window.DogtopAudit?.log({
      modulo: 'Pedidos Online',
      acao: 'Pedido concluido',
      entidade: String(order.id),
      detalhe: `Pedido de ${order.cliente} concluido com pagamento ${order.formaPagamento}, entrega ${order.tipoEntrega} e total ${currencyFormatter.format(order.total)}.`,
      dados: {
        pedidoId: order.id,
        clienteId: order.clienteId,
        tipoEntrega: order.tipoEntrega,
        formaPagamento: order.formaPagamento,
        total: order.total,
        taxaEntrega: order.taxaEntrega,
        desconto: order.desconto,
        trocoPara: order.trocoPara,
        trocoDevolver: order.trocoDevolver
      }
    });
    if (window.DogtopThermalPrint?.printKitchenTicket?.(order)) {
      window.DogtopAudit?.log({
        modulo: 'Cozinha',
        acao: 'Comanda impressa',
        entidade: String(order.id),
        detalhe: `Comanda de cozinha do pedido #${String(order.id).slice(-6).toUpperCase()} enviada para impressao.`,
        dados: { pedidoId: order.id, origem: 'pagamento' }
      });
    }
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    window.setTimeout(() => {
      window.location.href = `./andamento-pedido.html?id=${encodeURIComponent(order.id)}`;
    }, 400);
  });

  applyCompanyBrand();
  renderPaymentMethods();
  renderItems();
  renderTotals();
  updateDeliveryState();
  updatePaymentMethodState();
  updatePaymentSummary();
  
  // Inicialização assíncrona
  renderClientOptions().then(async () => {
    const sessionPhone = localStorage.getItem(CLIENT_PHONE_SESSION_KEY) || '';
    if (sessionPhone && form.elements.namedItem('telefone') && !form.elements.namedItem('telefone').value) {
      form.elements.namedItem('telefone').value = sessionPhone;
      const clients = (await loadClients()).map(normalizeClient);
      const client = findClientByPhone(clients, sessionPhone);
      if (client) fillClientFields(client);
    }
  });
})();
