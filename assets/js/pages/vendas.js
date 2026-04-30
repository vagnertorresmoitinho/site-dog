document.body.dataset.page = 'vendas';

(() => {
  const DRAFT_STORAGE_KEY = 'dogtopPedidoRascunho';

  const productList = document.getElementById('pdv-product-list');
  const emptyState = document.getElementById('pdv-empty');
  const searchInput = document.getElementById('pdv-search');
  const categoryFilter = document.getElementById('pdv-category');
  const categoryTabs = document.getElementById('pdv-category-tabs');
  const refreshButton = document.getElementById('pdv-refresh');
  const cartItemsElement = document.getElementById('pdv-cart-items');
  const clientInput = document.getElementById('pdv-client');
  const clientList = document.getElementById('pdv-client-list');
  const itemCountElement = document.getElementById('pdv-item-count');
  const subtotalElement = document.getElementById('pdv-subtotal');
  const totalElement = document.getElementById('pdv-total');
  const discountButton = document.getElementById('pdv-discount');
  const discountRow = document.getElementById('pdv-discount-row');
  const discountValueElement = document.getElementById('pdv-discount-value');
  const clearButton = document.getElementById('pdv-clear');
  const checkoutButton = document.getElementById('pdv-checkout');
  const feedback = document.getElementById('pdv-feedback');
  const customizeModal = document.getElementById('pdv-customize-modal');
  const customizeTitle = document.getElementById('pdv-customize-title');
  const customizePrice = document.getElementById('pdv-customize-price');
  const customizeQuantity = document.getElementById('pdv-customize-quantity');
  const customizeAdditionals = document.getElementById('pdv-customize-additionals');
  const customizeAdditionalSection = document.getElementById('pdv-customize-additional-section');
  const customizeConfirm = document.getElementById('pdv-customize-confirm');
  const customizeDecrease = document.getElementById('pdv-customize-decrease');
  const customizeIncrease = document.getElementById('pdv-customize-increase');
  const customizeNote = document.getElementById('pdv-customize-note');

  if (!productList || !cartItemsElement) return;

  const currencyFormatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const categoryLabels = {
    todos: 'Todos',
    lanche: 'Lanche',
    adicional: 'Adicional',
    bebida: 'Bebida',
    sobremesa: 'Sobremesa',
    porcao: 'Porcao',
    combo: 'Combo',
    promo: 'Combo'
  };

  const illustrativeImages = {
    lanche: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    bebida: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80',
    sobremesa: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80',
    porcao: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80',
    combo: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=80'
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
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
  };
  const createId = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
    return `pdv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getIllustrativeImage = (product) => {
    const name = normalizeText(product.nome).toLowerCase();
    if (name.includes('dog')) return illustrativeImages.combo;
    if (name.includes('bacon') || name.includes('x-')) return illustrativeImages.lanche;
    return illustrativeImages[product.categoria] || illustrativeImages.lanche;
  };

  const getProductImage = (product, categoria) => {
    const imageSource = normalizeText(product.imagem);
    return imageSource && !imageSource.includes('1612392062126')
      ? imageSource
      : getIllustrativeImage({ ...product, categoria });
  };

  const normalizeProduct = (product) => {
    const categoria = product.categoria === 'promo' ? 'combo' : normalizeText(product.categoria || 'lanche');
    const preco = normalizeNumber(product.preco);
    const precoPromocional = normalizeNumber(product.precoPromocional);
    const promoValid = precoPromocional > 0 && precoPromocional < preco;

    return {
      id: String(product.id || createId()),
      codigo: normalizeText(product.codigo),
      nome: normalizeText(product.nome) || 'Produto sem nome',
      categoria,
      preco,
      precoPromocional: promoValid ? precoPromocional : 0,
      precoPedido: promoValid ? precoPromocional : preco,
      estoque: Math.floor(normalizeNumber(product.estoque)),
      status: product.status || product.disponibilidade || 'disponivel',
      descricao: normalizeText(product.descricao),
      ingredientes: Array.isArray(product.ingredientes)
        ? product.ingredientes.map(normalizeText).filter(Boolean)
        : normalizeText(product.ingredientes).split(',').map(normalizeText).filter(Boolean),
      imagem: getProductImage(product, categoria)
    };
  };

  const sampleProducts = [
    { id: 'pdv-001', codigo: 'LAN-001', nome: 'Dog bacon especial', categoria: 'lanche', preco: 24.9, precoPromocional: 22, estoque: 18, status: 'disponivel', descricao: 'Pao, salsicha, bacon e molho especial.' },
    { id: 'pdv-002', codigo: 'BEB-001', nome: 'Refrigerante lata', categoria: 'bebida', preco: 6.5, estoque: 42, status: 'disponivel', descricao: 'Bebida gelada em lata.' },
    { id: 'pdv-003', codigo: 'LAN-002', nome: 'Dogtop completo', categoria: 'lanche', preco: 28.9, precoPromocional: 24.9, estoque: 25, status: 'disponivel', descricao: 'Pao, salsicha, pure, milho e batata palha.' }
  ];

  let products = [];
  let manualDiscount = 0;
  let selectedProduct = null;
  let selectedQuantity = 1;
  const cart = new Map();
  const getMainProducts = () => products.filter((product) => product.categoria !== 'adicional');
  const getAdditionalProducts = () => products.filter((product) => product.categoria === 'adicional');

  const loadProducts = async () => {
    const data = await window.DogtopData.getProdutos();
    const source = data && data.length > 0 ? data : sampleProducts;
    products = source.map(normalizeProduct).filter((product) => product.status === 'disponivel' && product.preco > 0);
  };

  const loadClients = async () => {
    const clients = await window.DogtopData.getClientes();
    clientList.innerHTML = (clients || []).map((client) => `
      <option value="${escapeHtml(client.nome || '')}" label="${escapeHtml(client.telefoneCelular || client.telefone || '')}"></option>
    `).join('');
  };

  const getFilteredProducts = () => {
    const search = normalizeKey(searchInput?.value);
    const category = categoryFilter?.value || 'todos';
    return getMainProducts().filter((product) => {
      const matchesCategory = category === 'todos' || product.categoria === category;
      const haystack = normalizeKey([product.nome, product.codigo, product.categoria].join(' '));
      return matchesCategory && (!search || haystack.includes(search));
    });
  };

  const getSubtotalOriginal = () => [...cart.values()].reduce((sum, item) => sum + ((item.product.preco + item.additionalTotal) * item.quantity), 0);
  const getSubtotal = () => [...cart.values()].reduce((sum, item) => sum + ((item.product.precoPedido + item.additionalTotal) * item.quantity), 0);
  const getItemCount = () => [...cart.values()].reduce((sum, item) => sum + item.quantity, 0);
  const getTotal = () => Math.max(getSubtotal() - manualDiscount, 0);

  const getCategoryOptions = () => {
    const availableCategories = new Set(getMainProducts().map((product) => product.categoria).filter(Boolean));
    const order = ['todos', 'lanche', 'bebida', 'combo', 'porcao', 'sobremesa'];
    return order
      .filter((category) => category === 'todos' || availableCategories.has(category))
      .concat([...availableCategories].filter((category) => !order.includes(category)));
  };

  const setFeedback = (message, isError = false) => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle('error', isError);
  };

  const renderProducts = () => {
    const list = getFilteredProducts();
    if (emptyState) emptyState.hidden = list.length > 0;

    productList.innerHTML = list.map((product) => {
      const cartQuantity = [...cart.values()]
        .filter((item) => item.product.id === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      const priceHtml = product.precoPromocional
        ? `<span class="pdv-old-price">${currencyFormatter.format(product.preco)}</span><span class="pdv-promo-price">${currencyFormatter.format(product.precoPromocional)}</span>`
        : currencyFormatter.format(product.preco);
      const stockClass = product.estoque <= 0 ? 'danger' : product.estoque <= 5 ? 'warning' : '';

      return `
        <button class="pdv-product-item" type="button" data-product-id="${escapeHtml(product.id)}" ${product.estoque <= 0 ? 'disabled' : ''}>
          <span class="pdv-product-info">
            <span class="pdv-product-img"><img src="${escapeHtml(product.imagem)}" alt="${escapeHtml(product.nome)}"></span>
            <span>
              <span class="pdv-product-name">${cartQuantity ? `${cartQuantity}x ` : ''}${escapeHtml(product.nome)}</span>
              <small class="pdv-product-meta">${escapeHtml(product.codigo || categoryLabels[product.categoria] || product.categoria)}${product.descricao ? ` - ${escapeHtml(product.descricao)}` : ''}</small>
              <span class="pdv-product-status">${product.estoque > 0 ? 'Disponivel' : 'Esgotado'}</span>
            </span>
          </span>
          <span class="pdv-category-name">${escapeHtml(categoryLabels[product.categoria] || product.categoria || 'Sem categoria')}</span>
          <span class="pdv-price">${priceHtml}</span>
          <span class="pdv-stock ${stockClass}">${product.estoque} un</span>
          <span class="pdv-add-button">Adicionar</span>
        </button>
      `;
    }).join('');
  };

  const renderCategoryTabs = () => {
    if (!categoryTabs) return;
    const current = categoryFilter?.value || 'todos';
    categoryTabs.innerHTML = getCategoryOptions().map((category) => `
      <button type="button" class="${current === category ? 'active' : ''}" data-pdv-category="${escapeHtml(category)}">
        ${escapeHtml(categoryLabels[category] || category)}
      </button>
    `).join('');
  };

  const renderCart = () => {
    const items = [...cart.values()];
    const subtotal = getSubtotal();
    const totalDiscount = Math.min(manualDiscount, subtotal);
    manualDiscount = totalDiscount;

    if (!items.length) {
      cartItemsElement.innerHTML = '<div class="pdv-cart-empty">Nenhum item adicionado.</div>';
    } else {
      cartItemsElement.innerHTML = items.map(({ key, product, quantity, additionals, additionalTotal, note }) => {
        const unitTotal = product.precoPedido + additionalTotal;
        const additionalText = additionals.length
          ? `<small class="pdv-cart-special">+ ${additionals.map((item) => escapeHtml(item.nome.replace(/^Adicional de\s*/i, ''))).join(', ')}</small>`
          : '';
        const noteText = note ? `<small class="pdv-cart-special">Obs: ${escapeHtml(note)}</small>` : '';
        return `
        <div class="pdv-cart-item">
          <span class="pdv-cart-qty">
            <button type="button" data-cart-action="decrease" data-cart-key="${escapeHtml(key)}">-</button>
            <span>${quantity}</span>
            <button type="button" data-cart-action="increase" data-cart-key="${escapeHtml(key)}">+</button>
          </span>
          <span class="pdv-cart-item-name">
            ${escapeHtml(product.nome)}
            <small>${quantity} x ${currencyFormatter.format(unitTotal)}</small>
            ${additionalText}
            ${noteText}
          </span>
          <span class="pdv-cart-price">${currencyFormatter.format(unitTotal * quantity)}</span>
          <button class="pdv-remove" type="button" data-cart-action="remove" data-cart-key="${escapeHtml(key)}">x</button>
        </div>
      `;
      }).join('');
    }

    const itemCount = getItemCount();
    const promotionalDiscount = Math.max(getSubtotalOriginal() - subtotal, 0);
    const fullDiscount = promotionalDiscount + manualDiscount;
    itemCountElement.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`;
    subtotalElement.textContent = currencyFormatter.format(subtotal);
    totalElement.textContent = currencyFormatter.format(getTotal());
    discountValueElement.textContent = currencyFormatter.format(manualDiscount);
    if (discountRow) discountRow.hidden = manualDiscount <= 0;
    checkoutButton.disabled = itemCount <= 0;
    clearButton.disabled = itemCount <= 0;
    discountButton.disabled = itemCount <= 0;
    if (fullDiscount > 0) {
      discountButton.textContent = `Desconto total: ${currencyFormatter.format(fullDiscount)}`;
    } else {
      discountButton.textContent = 'Dar desconto';
    }
  };

  const getCartKey = (product, additionals, note = '') => {
    const additionalIds = additionals.map((item) => item.id).sort().join('|');
    return `${product.id}::${additionalIds}::${normalizeKey(note)}`;
  };

  const addConfiguredProductToCart = (product, quantity = 1, additionals = [], note = '') => {
    if (!product || product.estoque <= 0) return;
    const normalizedNote = normalizeText(note);
    const key = getCartKey(product, additionals, normalizedNote);
    const current = cart.get(key);
    const currentProductQuantity = [...cart.values()]
      .filter((item) => item.product.id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    const availableQuantity = Math.max(product.estoque - currentProductQuantity, 0);
    const quantityToAdd = Math.min(quantity, availableQuantity);
    const additionalTotal = additionals.reduce((sum, item) => sum + item.precoPedido, 0);

    if (quantityToAdd <= 0) {
      setFeedback(`Estoque esgotado para ${product.nome}.`, true);
      return;
    }

    cart.set(key, {
      key,
      product,
      additionals,
      additionalTotal,
      note: normalizedNote,
      quantity: current ? current.quantity + quantityToAdd : quantityToAdd
    });
    setFeedback(`${product.nome} adicionado.`);
    window.DogtopAudit?.log({
      modulo: 'Vendas',
      acao: 'Item adicionado no PDV',
      entidade: product.id,
      detalhe: `${product.nome} adicionado ao carrinho do vendedor por ${currencyFormatter.format(product.precoPedido + additionalTotal)}.`,
      severidade: 'info'
    });
    renderProducts();
    renderCart();
  };

  const addToCart = (productId) => {
    const product = products.find((item) => item.id === productId);
    addConfiguredProductToCart(product, 1, [], '');
  };

  const openCustomizeModal = (productId) => {
    const product = getMainProducts().find((item) => item.id === productId);
    if (!product) return;

    selectedProduct = product;
    selectedQuantity = 1;
    customizeTitle.textContent = product.nome;
    customizePrice.textContent = currencyFormatter.format(product.precoPedido);
    customizeQuantity.textContent = String(selectedQuantity);
    if (customizeNote) customizeNote.value = '';

    const additionals = getAdditionalProducts();
    if (additionals.length) {
      customizeAdditionalSection.classList.remove('hidden');
      customizeAdditionals.innerHTML = additionals.map((additional) => `
        <label class="pdv-additional-choice">
          <input type="checkbox" value="${escapeHtml(additional.id)}">
          <span>
            <strong>${escapeHtml(additional.nome.replace(/^Adicional de\s*/i, ''))}</strong>
            <small>+ ${currencyFormatter.format(additional.precoPedido)}</small>
          </span>
        </label>
      `).join('');
    } else {
      customizeAdditionalSection.classList.add('hidden');
      customizeAdditionals.innerHTML = '';
    }

    customizeModal.classList.remove('hidden');
    customizeModal.classList.add('flex');
    customizeModal.setAttribute('aria-hidden', 'false');
  };

  const closeCustomizeModal = () => {
    customizeModal.classList.add('hidden');
    customizeModal.classList.remove('flex');
    customizeModal.setAttribute('aria-hidden', 'true');
    selectedProduct = null;
    selectedQuantity = 1;
  };

  const updateCartQuantity = (cartKey, action) => {
    const current = cart.get(cartKey);
    if (!current) return;
    if (action === 'remove') {
      cart.delete(cartKey);
    } else {
      const nextQuantity = action === 'increase' ? current.quantity + 1 : current.quantity - 1;
      if (nextQuantity <= 0) cart.delete(cartKey);
      else current.quantity = Math.min(nextQuantity, current.product.estoque);
    }
    renderProducts();
    renderCart();
  };

  const askManualDiscount = () => {
    if (!cart.size) return;
    const value = window.prompt('Informe o desconto em reais:', String(manualDiscount.toFixed(2)).replace('.', ','));
    if (value === null) return;
    const normalized = normalizeNumber(String(value).replace(',', '.'));
    manualDiscount = Math.min(normalized, getSubtotal());
    renderCart();
  };

  const clearCart = () => {
    if (!cart.size) return;
    if (!window.confirm('Limpar todos os itens do carrinho?')) return;
    cart.clear();
    manualDiscount = 0;
    setFeedback('Carrinho limpo.');
    renderProducts();
    renderCart();
  };

  const goToPayment = () => {
    if (!cart.size) {
      setFeedback('Adicione pelo menos um item para continuar.', true);
      return;
    }
    const items = [...cart.values()].map(({ product, quantity, additionals, additionalTotal, note }) => {
      const additionalNames = additionals.map((additional) => additional.nome.replace(/^Adicional de\s*/i, ''));
      const observationParts = [
        additionalNames.length ? `Adicionais: ${additionalNames.join(', ')}` : '',
        note ? `Obs: ${note}` : ''
      ].filter(Boolean);

      return {
      id: product.id,
      codigo: product.codigo,
      nome: product.nome,
      categoria: product.categoria,
      quantidade: quantity,
      precoVenda: product.preco,
      precoUnitario: product.precoPedido + additionalTotal,
      precoPromocional: product.precoPromocional,
      adicionais: additionals.map((additional) => ({
        id: additional.id,
        nome: additional.nome,
        preco: additional.precoPedido
      })),
      observacao: note || '',
      observacoes: observationParts.join(' | '),
      desconto: Math.max(product.preco - product.precoPedido, 0) * quantity,
      subtotal: (product.precoPedido + additionalTotal) * quantity
    };
    });
    const subtotalOriginal = getSubtotalOriginal();
    const subtotalProducts = getSubtotal();
    const draft = {
      origem: 'pdv',
      cliente: normalizeText(clientInput?.value),
      itens: items,
      subtotalOriginal,
      desconto: Math.max(subtotalOriginal - subtotalProducts, 0) + manualDiscount,
      descontoManual: manualDiscount,
      subtotal: getTotal(),
      criadoEm: new Date().toISOString()
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    window.DogtopAudit?.log({
      modulo: 'Vendas',
      acao: 'Venda enviada ao pagamento',
      entidade: 'Rascunho PDV',
      detalhe: `${items.length} item(ns) enviados para pagamento. Total: ${currencyFormatter.format(draft.subtotal)}.`,
      severidade: 'info',
      dados: { total: draft.subtotal, desconto: draft.desconto }
    });
    window.location.href = './pagamento-pedido.html';
  };

  productList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-id]');
    if (!button) return;
    const product = products.find((item) => item.id === button.dataset.productId);
    if (!product) return;
    if (product.categoria === 'lanche' || product.categoria === 'combo') {
      openCustomizeModal(product.id);
      return;
    }
    addToCart(product.id);
  });
  cartItemsElement.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;
    updateCartQuantity(button.dataset.cartKey, button.dataset.cartAction);
  });
  searchInput?.addEventListener('input', renderProducts);
  categoryFilter?.addEventListener('change', () => {
    renderCategoryTabs();
    renderProducts();
  });
  categoryTabs?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pdv-category]');
    if (!button || !categoryFilter) return;
    categoryFilter.value = button.dataset.pdvCategory;
    renderCategoryTabs();
    renderProducts();
  });
  refreshButton?.addEventListener('click', async () => {
    await loadProducts();
    renderCategoryTabs();
    renderProducts();
    setFeedback('Produtos atualizados.');
  });
  discountButton?.addEventListener('click', askManualDiscount);
  clearButton?.addEventListener('click', clearCart);
  checkoutButton?.addEventListener('click', goToPayment);
  document.querySelectorAll('[data-close-pdv-customize]').forEach((button) => {
    button.addEventListener('click', closeCustomizeModal);
  });
  customizeModal?.addEventListener('click', (event) => {
    if (event.target === customizeModal) closeCustomizeModal();
  });
  customizeDecrease?.addEventListener('click', () => {
    selectedQuantity = Math.max(1, selectedQuantity - 1);
    customizeQuantity.textContent = String(selectedQuantity);
  });
  customizeIncrease?.addEventListener('click', () => {
    selectedQuantity += 1;
    customizeQuantity.textContent = String(selectedQuantity);
  });
  customizeConfirm?.addEventListener('click', () => {
    if (!selectedProduct) return;
    const selectedAdditionals = [...customizeAdditionals.querySelectorAll('input:checked')]
      .map((input) => getAdditionalProducts().find((additional) => additional.id === input.value))
      .filter(Boolean);
    addConfiguredProductToCart(selectedProduct, selectedQuantity, selectedAdditionals, customizeNote?.value || '');
    closeCustomizeModal();
  });

  // Inicialização assíncrona do PDV
  Promise.all([loadProducts(), loadClients()]).then(() => {
    renderCategoryTabs();
    renderProducts();
    renderCart();
  });
})();
