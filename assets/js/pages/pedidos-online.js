(() => {
  const PRODUCTS_STORAGE_KEY = 'dogtopProdutos';
  const LEGACY_PRODUCTS_STORAGE_KEY = 'produtosLanchonete';
  const DRAFT_STORAGE_KEY = 'dogtopPedidoRascunho';
  const FEATURE_ROTATION_MS = 5000;

  const tabsElement = document.getElementById('online-category-tabs');
  const categoryListElement = document.getElementById('online-category-list');
  const emptyElement = document.getElementById('online-empty');
  const productCountElement = document.getElementById('online-product-count');
  const cartCountElement = document.getElementById('online-cart-count');
  const featureProductCountElement = document.getElementById('online-feature-product-count');
  const featureCartCountElement = document.getElementById('online-feature-cart-count');
  const featureSlidesElement = document.getElementById('online-feature-slides');
  const featureDotsElement = document.getElementById('online-feature-dots');
  const cartItemsElement = document.getElementById('online-cart-items');
  const cartSubtotalElement = document.getElementById('online-cart-subtotal');
  const cartTotalElement = document.getElementById('online-cart-total');
  const feedbackElement = document.getElementById('online-feedback');
  const goPaymentButton = document.getElementById('online-go-payment');
  const customizeModal = document.getElementById('online-customize-modal');
  const customizeTitle = document.getElementById('online-customize-title');
  const customizePrice = document.getElementById('online-customize-price');
  const customizeQuantity = document.getElementById('online-customize-quantity');
  const customizeAdditionals = document.getElementById('online-customize-additionals');
  const customizeAdditionalSection = document.getElementById('online-customize-additional-section');
  const customizeConfirm = document.getElementById('online-customize-confirm');
  const customizeDecrease = document.getElementById('online-customize-decrease');
  const customizeIncrease = document.getElementById('online-customize-increase');
  const customizeNote = document.getElementById('online-customize-note');

  const categoryOrder = ['lanche', 'adicional', 'bebida', 'sobremesa', 'porcao', 'combo'];
  const categoryLabels = {
    lanche: 'Lanches',
    adicional: 'Adicionais',
    bebida: 'Bebidas',
    sobremesa: 'Sobremesas',
    porcao: 'Porcoes',
    combo: 'Combos',
    promo: 'Combos'
  };

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
  const normalizeKey = (value) => normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
  };
  const productImages = {
    hotdog: '../assets/img/produtos/hotdog.svg',
    adicional: '../assets/img/produtos/adicional.svg'
  };
  const illustrativeImages = {
    lanche: productImages.hotdog,
    adicional: productImages.adicional,
    bebida: productImages.hotdog,
    sobremesa: productImages.hotdog,
    porcao: productImages.hotdog,
    combo: productImages.hotdog
  };
  const getIllustrativeImage = (product) => {
    const name = normalizeText(product.nome).toLowerCase();
    if (name.includes('adicional')) return productImages.adicional;
    if (name.includes('dog') || name.includes('kafta') || name.includes('bacon')) return productImages.hotdog;
    return illustrativeImages[product.categoria] || illustrativeImages.lanche;
  };
  const hasBrokenIllustrativeImage = (imageSource) => {
    const source = normalizeText(imageSource);
    return source.includes('1612392062126') || source.includes('source.unsplash.com');
  };
  const getProductImage = (product, categoria) => {
    const imageSource = normalizeText(product.imagem);
    return imageSource && !hasBrokenIllustrativeImage(imageSource)
      ? imageSource
      : getIllustrativeImage({ ...product, categoria });
  };

  const sampleProducts = [
    {
      id: 'prd-003',
      codigo: 'LAN-002',
      nome: 'Dogtop completo',
      categoria: 'lanche',
      preco: 28.9,
      precoPromocional: 24.9,
      estoque: 25,
      tempoPreparo: 14,
      status: 'disponivel',
      ingredientes: ['Pao', 'salsicha', 'pure', 'milho', 'batata palha', 'molho especial'],
      descricao: 'Hot dog completo com pure cremoso, milho, batata palha e molho da casa.',
      imagem: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=80'
    },
    {
      id: 'prd-004',
      codigo: 'LAN-003',
      nome: 'X-bacon artesanal',
      categoria: 'lanche',
      preco: 32.9,
      precoPromocional: 27.9,
      estoque: 16,
      tempoPreparo: 18,
      status: 'disponivel',
      ingredientes: ['Pao brioche', 'hamburguer', 'bacon', 'cheddar', 'cebola caramelizada'],
      descricao: 'Hamburguer artesanal com bacon crocante, cheddar e cebola caramelizada.',
      imagem: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80'
    },
    {
      id: 'prd-005',
      codigo: 'LAN-004',
      nome: 'Dog frango catupiry',
      categoria: 'lanche',
      preco: 26.9,
      precoPromocional: 22.9,
      estoque: 20,
      tempoPreparo: 13,
      status: 'disponivel',
      ingredientes: ['Pao', 'frango desfiado', 'catupiry', 'milho', 'batata palha'],
      descricao: 'Hot dog de frango desfiado com catupiry, milho e batata palha.',
      imagem: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=80'
    }
  ];

  const mergeSampleProducts = (productList) => {
    const currentIds = new Set(productList.map((product) => String(product.id || product.codigo || product.nome)));
    const missingSamples = sampleProducts.filter((sample) => !currentIds.has(sample.id));
    return [...productList, ...missingSamples];
  };

  const loadProducts = () => {
    const source = localStorage.getItem(PRODUCTS_STORAGE_KEY) || localStorage.getItem(LEGACY_PRODUCTS_STORAGE_KEY);
    if (!source) return sampleProducts;

    try {
      const parsed = JSON.parse(source);
      return Array.isArray(parsed) ? mergeSampleProducts(parsed) : sampleProducts;
    } catch {
      return sampleProducts;
    }
  };

  const normalizeOrderProduct = (product) => {
    const category = normalizeKey(product.categoria) === 'promo' ? 'combo' : normalizeKey(product.categoria || 'lanche');
      const promotionalPrice = normalizeNumber(product.precoPromocional);
      const price = normalizeNumber(product.preco);
    const status = normalizeKey(product.status || product.disponibilidade || 'disponivel') || 'disponivel';

      return {
        id: String(product.id || product.codigo || product.nome),
        codigo: normalizeText(product.codigo),
        nome: normalizeText(product.nome),
        categoria: category,
        descricao: normalizeText(product.descricao),
        ingredientes: Array.isArray(product.ingredientes)
          ? product.ingredientes.map(normalizeText).filter(Boolean)
          : normalizeText(product.ingredientes).split(',').map(normalizeText).filter(Boolean),
        preco: price,
        precoPromocional: promotionalPrice,
        precoPedido: promotionalPrice || price,
        imagem: getProductImage(product, category),
      status
      };
  };

  const normalizedProducts = loadProducts()
    .map(normalizeOrderProduct)
    .filter((product) => product.nome && product.precoPedido > 0 && !['indisponivel', 'esgotado'].includes(product.status));
  const products = normalizedProducts.length
    ? normalizedProducts
    : sampleProducts.map(normalizeOrderProduct);

  let activeCategory = 'todos';
  let activeFeatureIndex = 0;
  let featureInterval = null;
  let featureProducts = [];
  let selectedProduct = null;
  let selectedQuantity = 1;
  const cart = new Map();
  const mainProducts = products.filter((product) => product.categoria !== 'adicional');
  const additionalProducts = products.filter((product) => product.categoria === 'adicional');

  const getCategories = () => {
    const availableCategories = [...new Set(mainProducts.map((product) => product.categoria).filter(Boolean))];
    return availableCategories.sort((first, second) => {
      const firstIndex = categoryOrder.indexOf(first);
      const secondIndex = categoryOrder.indexOf(second);
      return (firstIndex === -1 ? 99 : firstIndex) - (secondIndex === -1 ? 99 : secondIndex);
    });
  };

  const getVisibleProducts = () => (
    activeCategory === 'todos'
      ? mainProducts
      : mainProducts.filter((product) => product.categoria === activeCategory)
  );

  const getCartOriginalSubtotal = () => [...cart.values()].reduce((total, item) => total + ((item.product.preco + item.additionalTotal) * item.quantity), 0);
  const getCartSubtotal = () => [...cart.values()].reduce((total, item) => total + ((item.product.precoPedido + item.additionalTotal) * item.quantity), 0);
  const getCartDiscount = () => Math.max(getCartOriginalSubtotal() - getCartSubtotal(), 0);
  const getCartCount = () => [...cart.values()].reduce((total, item) => total + item.quantity, 0);
  const getFeatureProducts = () => {
    const featuredBase = mainProducts;
    const promotionalProducts = featuredBase.filter((product) => product.precoPromocional > 0);
    const otherProducts = featuredBase.filter((product) => !promotionalProducts.some((promo) => promo.id === product.id));
    return [...promotionalProducts, ...otherProducts].slice(0, 6);
  };

  const renderTabs = () => {
    const categories = getCategories();
    const allTabs = ['todos', ...categories];

    tabsElement.innerHTML = allTabs.map((category) => {
      const label = category === 'todos' ? 'Todos' : categoryLabels[category] || category;
      return `
        <button class="online-category-tab ${category === activeCategory ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}">
          ${escapeHtml(label)}
        </button>
      `;
    }).join('');
  };

  const renderProductCard = (product) => {
    const image = product.imagem
      ? `<img src="${escapeHtml(product.imagem)}" alt="">`
      : escapeHtml(product.nome.slice(0, 2).toUpperCase() || 'PR');
    const description = product.descricao || product.ingredientes.slice(0, 4).join(', ') || 'Produto disponivel para pedido.';
    const price = product.precoPromocional > 0
      ? `
        <span class="online-price-original">${currencyFormatter.format(product.preco)}</span>
        <strong class="online-price-promo">${currencyFormatter.format(product.precoPromocional)}</strong>
      `
      : `<strong class="online-price">${currencyFormatter.format(product.preco)}</strong>`;

    return `
      <article class="online-product">
        <div class="online-product__image">${image}</div>
        <div class="online-product__content">
          <h3>${escapeHtml(product.nome)}</h3>
          <p>${escapeHtml(description)}</p>
          <div class="online-price-row">${price}</div>
          <button class="online-add" type="button" data-product-id="${escapeHtml(product.id)}">Escolher</button>
        </div>
      </article>
    `;
  };

  const renderFeatureCarousel = () => {
    if (!featureSlidesElement || !featureDotsElement) return;

    featureProducts = getFeatureProducts();
    if (!featureProducts.length) {
      featureSlidesElement.innerHTML = `
        <div class="online-feature__empty">
          <span>Nenhuma promocao cadastrada</span>
          <strong>Cadastre produtos disponiveis para exibir destaques.</strong>
        </div>
      `;
      featureDotsElement.innerHTML = '';
      return;
    }

    activeFeatureIndex = Math.min(activeFeatureIndex, featureProducts.length - 1);
    featureSlidesElement.innerHTML = featureProducts.map((product, index) => {
      const hasPromotion = product.precoPromocional > 0;
      const image = product.imagem
        ? `<img src="${escapeHtml(product.imagem)}" alt="${escapeHtml(product.nome)}">`
        : '';
      const oldPrice = hasPromotion
        ? `<span class="online-feature__old-price">${currencyFormatter.format(product.preco)}</span>`
        : '';
      const promoPrice = currencyFormatter.format(product.precoPedido);
      const tag = hasPromotion ? 'Promocao da semana' : 'Destaque do cardapio';

      return `
        <article class="online-feature__slide ${index === activeFeatureIndex ? 'active' : ''}" data-feature-index="${index}">
          ${image}
          <div class="online-feature__content">
            <span class="online-feature__tag">${tag}</span>
            <h2>${escapeHtml(product.nome)}</h2>
            <div class="online-feature__price">
              ${oldPrice}
              <strong class="online-feature__promo-price">${promoPrice}</strong>
            </div>
            <button class="online-feature__cta" type="button" data-product-id="${escapeHtml(product.id)}">Peca agora</button>
          </div>
        </article>
      `;
    }).join('');

    featureDotsElement.innerHTML = featureProducts.map((product, index) => `
      <button
        class="online-feature__dot ${index === activeFeatureIndex ? 'active' : ''}"
        type="button"
        data-feature-dot="${index}"
        aria-label="Ver destaque ${index + 1}: ${escapeHtml(product.nome)}"
      ></button>
    `).join('');

    startFeatureRotation();
  };

  const updateFeatureCarousel = () => {
    if (!featureSlidesElement || !featureDotsElement) return;
    featureSlidesElement.querySelectorAll('.online-feature__slide').forEach((slide, index) => {
      slide.classList.toggle('active', index === activeFeatureIndex);
      slide.setAttribute('aria-hidden', index === activeFeatureIndex ? 'false' : 'true');
    });
    featureDotsElement.querySelectorAll('.online-feature__dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === activeFeatureIndex);
    });
  };

  const nextFeatureSlide = () => {
    if (featureProducts.length <= 1) return;
    activeFeatureIndex = (activeFeatureIndex + 1) % featureProducts.length;
    updateFeatureCarousel();
  };

  const startFeatureRotation = () => {
    if (featureInterval) clearInterval(featureInterval);
    if (featureProducts.length <= 1) return;
    featureInterval = setInterval(nextFeatureSlide, FEATURE_ROTATION_MS);
  };

  const groupProductsByCategory = (productList) => productList.reduce((groups, product) => {
    const category = product.categoria || 'outros';
    if (!groups[category]) groups[category] = [];
    groups[category].push(product);
    return groups;
  }, {});

  const renderProducts = () => {
    const visibleProducts = getVisibleProducts();
    const groupedProducts = groupProductsByCategory(visibleProducts);
    const categories = Object.keys(groupedProducts).sort((first, second) => {
      const firstIndex = categoryOrder.indexOf(first);
      const secondIndex = categoryOrder.indexOf(second);
      return (firstIndex === -1 ? 99 : firstIndex) - (secondIndex === -1 ? 99 : secondIndex);
    });

    categoryListElement.innerHTML = categories.map((category) => `
      <section class="online-category" id="categoria-${escapeHtml(category)}">
        <div class="online-category-title">
          <h2>${escapeHtml(categoryLabels[category] || category)}</h2>
          <span>${groupedProducts[category].length} itens</span>
        </div>
        <div class="online-products ${category === 'adicional' ? 'online-products--additional' : ''}">
          ${groupedProducts[category].map(renderProductCard).join('')}
        </div>
      </section>
    `).join('');

    emptyElement.style.display = visibleProducts.length ? 'none' : 'block';
    if (productCountElement) productCountElement.textContent = `${mainProducts.length} ${mainProducts.length === 1 ? 'produto' : 'produtos'}`;
  };

  const renderCart = () => {
    const items = [...cart.values()];

    if (!items.length) {
      cartItemsElement.innerHTML = '<div class="online-cart__empty">Nenhum item adicionado.</div>';
    } else {
      cartItemsElement.innerHTML = items.map(({ key, product, quantity, additionals, additionalTotal, note }) => {
        const unitTotal = product.precoPedido + additionalTotal;
        const additionalText = additionals.length
          ? `<small>+ ${additionals.map((item) => escapeHtml(item.nome.replace(/^Adicional de\s*/i, ''))).join(', ')}</small>`
          : '';
        const noteText = note ? `<small class="online-cart-note">Obs: ${escapeHtml(note)}</small>` : '';
        return `
        <div class="online-cart-item">
          <div>
            <strong>${escapeHtml(product.nome)}</strong>
            <small>${quantity} x ${currencyFormatter.format(unitTotal)}</small>
            ${additionalText}
            ${noteText}
          </div>
          <div class="online-qty">
            <button type="button" data-cart-action="decrease" data-cart-key="${escapeHtml(key)}">-</button>
            <strong>${quantity}</strong>
            <button type="button" data-cart-action="increase" data-cart-key="${escapeHtml(key)}">+</button>
          </div>
        </div>
      `;
      }).join('');
    }

    const itemCount = getCartCount();
    const productCountText = `${mainProducts.length} ${mainProducts.length === 1 ? 'produto' : 'produtos'}`;
    const cartCountText = `${itemCount} ${itemCount === 1 ? 'item no pedido' : 'itens no pedido'}`;
    if (productCountElement) productCountElement.textContent = productCountText;
    if (cartCountElement) cartCountElement.textContent = cartCountText;
    if (featureProductCountElement) featureProductCountElement.textContent = productCountText;
    if (featureCartCountElement) featureCartCountElement.textContent = cartCountText;
    cartSubtotalElement.textContent = currencyFormatter.format(getCartSubtotal());
    cartTotalElement.textContent = currencyFormatter.format(getCartSubtotal());
    renderProducts();
  };

  const getCartKey = (product, additionals, note = '') => {
    const additionalIds = additionals.map((item) => item.id).sort().join('|');
    return `${product.id}::${additionalIds}::${normalizeKey(note)}`;
  };

  const addConfiguredProductToCart = (product, quantity, additionals = [], note = '') => {
    const normalizedNote = normalizeText(note);
    const key = getCartKey(product, additionals, normalizedNote);
    const currentItem = cart.get(key);
    const additionalTotal = additionals.reduce((total, item) => total + item.precoPedido, 0);
    cart.set(key, {
      key,
      product,
      additionals,
      additionalTotal,
      note: normalizedNote,
      quantity: currentItem ? currentItem.quantity + quantity : quantity
    });

    renderCart();
    window.DogtopAudit?.log({
      modulo: 'Pedidos Online',
      acao: 'Item adicionado ao carrinho',
      entidade: product.codigo || product.id,
      detalhe: `${product.nome} adicionado ao carrinho por ${currencyFormatter.format(product.precoPedido + additionalTotal)}.`
    });
  };

  const openCustomizeModal = (productId) => {
    const product = mainProducts.find((item) => item.id === productId);
    if (!product) return;

    selectedProduct = product;
    selectedQuantity = 1;
    customizeTitle.textContent = product.nome;
    customizePrice.textContent = currencyFormatter.format(product.precoPedido);
    customizeQuantity.textContent = String(selectedQuantity);
    if (customizeNote) customizeNote.value = '';

    if (additionalProducts.length) {
      customizeAdditionalSection.classList.remove('hidden');
      customizeAdditionals.innerHTML = additionalProducts.map((additional) => `
        <label class="online-additional-choice">
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

  const updateCartQuantity = (cartKey, delta) => {
    const currentItem = cart.get(cartKey);
    if (!currentItem) return;

    const nextQuantity = currentItem.quantity + delta;
    if (nextQuantity <= 0) {
      cart.delete(cartKey);
    } else {
      currentItem.quantity = nextQuantity;
      cart.set(cartKey, currentItem);
    }

    renderCart();
  };

  const saveDraftAndGoToPayment = () => {
    feedbackElement.textContent = '';
    feedbackElement.className = 'online-feedback';

    if (!cart.size) {
      feedbackElement.textContent = 'Adicione pelo menos um item ao pedido.';
      feedbackElement.classList.add('error');
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
      quantidade: quantity,
      precoVenda: product.preco,
      precoPromocional: product.precoPromocional,
      adicionais: additionals.map((additional) => ({
        id: additional.id,
        nome: additional.nome,
        preco: additional.precoPedido
      })),
      observacao: note || '',
      observacoes: observationParts.join(' | '),
      precoUnitario: product.precoPedido + additionalTotal,
      subtotalVenda: (product.preco + additionalTotal) * quantity,
      desconto: Math.max((product.preco - product.precoPedido) * quantity, 0),
      subtotal: (product.precoPedido + additionalTotal) * quantity
    };
    });

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      itens: items,
      subtotalOriginal: getCartOriginalSubtotal(),
      desconto: getCartDiscount(),
      subtotal: getCartSubtotal(),
      criadoEm: new Date().toISOString()
    }));

    window.DogtopAudit?.log({
      modulo: 'Pedidos Online',
      acao: 'Carrinho enviado ao pagamento',
      entidade: 'Rascunho de pedido',
      detalhe: `${items.length} tipo(s) de item enviados para pagamento. Subtotal: ${currencyFormatter.format(getCartSubtotal())}.`,
      dados: { quantidadeItens: getCartCount(), subtotal: getCartSubtotal(), desconto: getCartDiscount() }
    });

    window.location.href = './pagamento-pedido.html';
  };

  tabsElement.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;

    activeCategory = button.dataset.category;
    renderTabs();
    renderProducts();
  });

  categoryListElement.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-id]');
    if (!button) return;
    openCustomizeModal(button.dataset.productId);
  });

  featureSlidesElement?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-id]');
    if (!button) return;
    openCustomizeModal(button.dataset.productId);
  });

  featureDotsElement?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-feature-dot]');
    if (!button) return;
    activeFeatureIndex = Number(button.dataset.featureDot) || 0;
    updateFeatureCarousel();
    startFeatureRotation();
  });

  cartItemsElement.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;

    updateCartQuantity(button.dataset.cartKey, button.dataset.cartAction === 'increase' ? 1 : -1);
  });

  goPaymentButton.addEventListener('click', saveDraftAndGoToPayment);
  document.querySelectorAll('[data-close-customize-modal]').forEach((button) => {
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
      .map((input) => additionalProducts.find((additional) => additional.id === input.value))
      .filter(Boolean);
    addConfiguredProductToCart(selectedProduct, selectedQuantity, selectedAdditionals, customizeNote?.value || '');
    closeCustomizeModal();
  });

  applyCompanyBrand();
  renderTabs();
  renderFeatureCarousel();
  renderProducts();
  renderCart();
})();
