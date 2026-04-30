(() => {
  const PRODUCTS_STORAGE_KEY = 'dogtopProdutos';
  const LEGACY_PRODUCTS_STORAGE_KEY = 'produtosLanchonete';
  const DRAFT_STORAGE_KEY = 'dogtopPedidoRascunho';

  const storeName = document.getElementById('menu-store-name');
  const storeContact = document.getElementById('menu-store-contact');
  const logo = document.getElementById('menu-logo');
  const printButton = document.getElementById('menu-print');
  const searchInput = document.getElementById('menu-search');
  const tabsElement = document.getElementById('menu-tabs');
  const productsElement = document.getElementById('menu-products');
  const emptyElement = document.getElementById('menu-empty');
  const currentCategoryElement = document.getElementById('menu-current-category');
  const productCountElement = document.getElementById('menu-product-count');
  const cartBar = document.getElementById('cart-bar');
  const cartOpenButton = document.getElementById('cart-open');
  const cartCountElement = document.getElementById('cart-count');
  const cartPreviewElement = document.getElementById('cart-preview');
  const cartTotalElement = document.getElementById('cart-total');
  const cartModal = document.getElementById('cart-modal');
  const cartItemsElement = document.getElementById('cart-items');
  const cartModalTotalElement = document.getElementById('cart-modal-total');
  const cartCheckoutButton = document.getElementById('cart-checkout');
  const cartClearButton = document.getElementById('cart-clear');
  const cartFeedback = document.getElementById('cart-feedback');

  if (!productsElement || !tabsElement) return;

  const formatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const categoryOrder = ['todos', 'lanche', 'bebida', 'combo', 'porcao', 'sobremesa', 'adicional'];
  const categoryLabels = {
    todos: 'Todos',
    lanche: 'Lanches',
    bebida: 'Bebidas',
    combo: 'Combos',
    porcao: 'Porcoes',
    sobremesa: 'Sobremesas',
    adicional: 'Adicionais',
    promo: 'Combos',
    produto: 'Produtos'
  };

  const productImages = {
    hotdog: '../assets/img/produtos/hotdog.svg',
    adicional: '../assets/img/produtos/adicional.svg'
  };

  const sampleProducts = [
    {
      id: 'prd-001',
      codigo: 'LAN-001',
      nome: 'Top Dog Kids',
      categoria: 'lanche',
      preco: 15,
      precoPromocional: 0,
      estoque: 50,
      status: 'disponivel',
      descricao: 'Pao, molho especial, pure, salsicha, maionese e ketchup.',
      imagem: productImages.hotdog
    },
    {
      id: 'prd-002',
      codigo: 'LAN-002',
      nome: 'Top Dog Tradicional',
      categoria: 'lanche',
      preco: 21,
      precoPromocional: 0,
      estoque: 50,
      status: 'disponivel',
      descricao: 'Pao, molho especial, pure, salsicha, vinagrete, milho, ervilha, maionese, ketchup e mostarda.',
      imagem: productImages.hotdog
    },
    {
      id: 'prd-003',
      codigo: 'LAN-003',
      nome: 'Top Dog Completo',
      categoria: 'lanche',
      preco: 26,
      precoPromocional: 0,
      estoque: 50,
      status: 'disponivel',
      descricao: 'Pao, molho especial, pure, salsicha, vinagrete, milho, ervilha, cheddar, requeijao, maionese e batata palha.',
      imagem: productImages.hotdog
    },
    {
      id: 'prd-004',
      codigo: 'LAN-004',
      nome: 'Top Dog no Prato',
      categoria: 'lanche',
      preco: 35,
      precoPromocional: 0,
      estoque: 40,
      status: 'disponivel',
      descricao: 'Molho especial, 2x pure, 2 salsichas, vinagrete, cheddar, requeijao, maionese e batata palha.',
      imagem: productImages.hotdog
    },
    {
      id: 'prd-005',
      codigo: 'LAN-005',
      nome: 'Top Dog - Kafta',
      categoria: 'lanche',
      preco: 38.9,
      precoPromocional: 0,
      estoque: 35,
      status: 'disponivel',
      descricao: 'Pao, molho especial, creme de alho ou milho, pure, kafta, vinagrete, milho, ervilha, cheddar e batata palha.',
      imagem: productImages.hotdog
    },
    {
      id: 'prd-006',
      codigo: 'BEB-009',
      nome: 'Coca Cola Lata',
      categoria: 'bebida',
      preco: 5.5,
      precoPromocional: 0,
      estoque: 25,
      status: 'disponivel',
      descricao: 'Lata 350ml gelada.',
      imagem: productImages.hotdog
    },
    {
      id: 'prd-007',
      codigo: 'ADC-001',
      nome: 'Adicional de milho',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      status: 'disponivel',
      descricao: 'Porcao extra de milho.',
      imagem: productImages.adicional
    }
  ];

  const state = {
    products: [],
    inputs: [],
    recipes: {},
    activeCategory: 'todos',
    search: '',
    cart: new Map()
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
  const readArray = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const getProductImage = (product) => {
    const image = normalizeText(product.imagem);
    if (image && !image.includes('source.unsplash.com') && !image.includes('1612392062126')) return image;
    return normalizeKey(product.nome).includes('adicional') ? productImages.adicional : productImages.hotdog;
  };
  const getProductPrice = (product) => product.precoPromocional > 0 && product.precoPromocional < product.preco
    ? product.precoPromocional
    : product.preco;
  const resolveRecipe = (product) => {
    const keys = [product.codigo, product.id, normalizeKey(product.nome)].map(normalizeText).filter(Boolean);
    return keys.flatMap((key) => state.recipes[key] || []);
  };
  const getAvailability = (product) => {
    if (product.estoque <= 0 || product.status !== 'disponivel') return { available: false, reason: 'Esgotado' };
    const inputById = new Map(state.inputs.map((input) => [input.id, input]));
    const recipeItems = resolveRecipe(product);
    const missingInput = recipeItems.find((item) => !inputById.has(item.insumoId));
    if (missingInput) return { available: false, reason: 'Receita incompleta' };
    const outOfStock = recipeItems.find((item) => (Number(inputById.get(item.insumoId)?.estoque) || 0) < (Number(item.quantidade) || 0));
    if (outOfStock) return { available: false, reason: 'Esgotado' };
    return { available: true, reason: '' };
  };
  const getCartCount = () => [...state.cart.values()].reduce((total, item) => total + item.quantity, 0);
  const getCartTotal = () => [...state.cart.values()].reduce((total, item) => total + getProductPrice(item.product) * item.quantity, 0);

  const normalizeProduct = (product) => {
    const categoria = normalizeKey(product.categoria || 'lanche') === 'promo' ? 'combo' : normalizeKey(product.categoria || 'lanche');
    const preco = normalizeNumber(product.preco);
    const precoPromocional = normalizeNumber(product.precoPromocional);
    const ingredientes = Array.isArray(product.ingredientes)
      ? product.ingredientes.map(normalizeText).filter(Boolean)
      : normalizeText(product.ingredientes).split(',').map(normalizeText).filter(Boolean);

    return {
      id: String(product.id || product.codigo || product.nome),
      codigo: normalizeText(product.codigo),
      nome: normalizeText(product.nome) || 'Produto sem nome',
      categoria,
      preco,
      precoPromocional,
      estoque: Number(product.estoque) || 0,
      status: normalizeKey(product.status || product.disponibilidade || 'disponivel') || 'disponivel',
      descricao: normalizeText(product.descricao) || ingredientes.join(', ') || 'Produto disponivel no cardapio.',
      ingredientes,
      imagem: getProductImage(product)
    };
  };

  const loadProducts = () => {
    const stored = readArray(PRODUCTS_STORAGE_KEY);
    const legacy = stored.length ? [] : readArray(LEGACY_PRODUCTS_STORAGE_KEY);
    const source = stored.length ? stored : legacy;
    const base = source.length ? source : sampleProducts;
    const normalized = base.map(normalizeProduct).filter((product) => product.preco > 0);
    const sampleByCode = new Map(sampleProducts.map((product) => [product.codigo, normalizeProduct(product)]));

    normalized.forEach((product) => {
      if (product.codigo) sampleByCode.set(product.codigo, product);
    });

    return [...sampleByCode.values()].sort((a, b) => {
      const categoryA = categoryOrder.indexOf(a.categoria);
      const categoryB = categoryOrder.indexOf(b.categoria);
      return (categoryA === -1 ? 99 : categoryA) - (categoryB === -1 ? 99 : categoryB)
        || a.nome.localeCompare(b.nome);
    });
  };

  const applyCompany = () => {
    const company = window.DogtopConfig?.getCompany?.() || {};
    const contactParts = [company.whatsapp, company.endereco].map(normalizeText).filter(Boolean);
    if (storeName) storeName.textContent = company.nome || 'Dogtop';
    if (storeContact) storeContact.textContent = contactParts.join(' | ') || 'Delivery e retirada';
    if (logo && company.logotipo) {
      logo.innerHTML = `<img src="${escapeHtml(company.logotipo)}" alt="Logotipo ${escapeHtml(company.nome || 'Dogtop')}">`;
    }
  };

  const getCategories = () => {
    const categories = new Set(state.products.map((product) => product.categoria).filter(Boolean));
    return categoryOrder.filter((category) => category === 'todos' || categories.has(category))
      .concat([...categories].filter((category) => !categoryOrder.includes(category)));
  };

  const renderTabs = () => {
    tabsElement.innerHTML = getCategories().map((category) => `
      <button type="button" class="menu-tab ${state.activeCategory === category ? 'active' : ''}" data-category="${escapeHtml(category)}">
        ${escapeHtml(categoryLabels[category] || category)}
      </button>
    `).join('');
  };

  const getVisibleProducts = () => {
    return state.products.filter((product) => {
      const categoryMatches = state.activeCategory === 'todos' || product.categoria === state.activeCategory;
      const text = normalizeKey([product.nome, product.descricao, product.codigo, categoryLabels[product.categoria]].join(' '));
      return categoryMatches && (!state.search || text.includes(state.search));
    });
  };

  const getProductBadge = (product, index, availability) => {
    if (!availability.available) return availability.reason;
    if (product.precoPromocional > 0 && product.precoPromocional < product.preco) return 'Promo';
    if (index < 2 && product.categoria === 'lanche') return 'Mais pedido';
    if (product.categoria === 'adicional') return 'Extra';
    return '';
  };

  const renderPrice = (product) => {
    const price = getProductPrice(product);
    const oldPrice = product.precoPromocional > 0 && product.precoPromocional < product.preco
      ? `<small>${formatter.format(product.preco)}</small>`
      : '';
    return `<span class="product-price">${oldPrice}${formatter.format(price)}</span>`;
  };

  const renderProducts = () => {
    const visibleProducts = getVisibleProducts();
    productsElement.innerHTML = visibleProducts.map((product, index) => {
      const availability = getAvailability(product);
      const unavailable = !availability.available;
      const badge = getProductBadge(product, index, availability);
      return `
        <article class="product-card ${unavailable ? 'unavailable' : ''}">
          ${badge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ''}
          <img class="product-image" src="${escapeHtml(product.imagem)}" alt="${escapeHtml(product.nome)}">
          <div class="product-content">
            <h3 class="product-title">${escapeHtml(product.nome)}</h3>
            <p class="product-desc">${escapeHtml(product.descricao)}</p>
            <div class="product-meta">
              ${renderPrice(product)}
              <button type="button" class="product-add" data-add-product="${escapeHtml(product.id)}" ${unavailable ? 'disabled' : ''} aria-label="Adicionar ${escapeHtml(product.nome)}">+</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    const categoryLabel = categoryLabels[state.activeCategory] || state.activeCategory;
    currentCategoryElement.textContent = state.activeCategory === 'todos' ? 'Todos os itens' : categoryLabel;
    productCountElement.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? 'item encontrado' : 'itens encontrados'}`;
    emptyElement.classList.toggle('hidden', visibleProducts.length > 0);
  };

  const renderCart = () => {
    const items = [...state.cart.values()];
    const count = getCartCount();
    const total = getCartTotal();

    cartBar.classList.toggle('hidden', count === 0);
    cartCountElement.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
    cartPreviewElement.textContent = items[0]?.product.nome || 'Carrinho vazio';
    cartTotalElement.textContent = formatter.format(total);
    cartModalTotalElement.textContent = formatter.format(total);

    cartItemsElement.innerHTML = items.length
      ? items.map(({ product, quantity }) => `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(product.nome)}</strong>
            <small>${quantity} x ${formatter.format(getProductPrice(product))}</small>
          </div>
          <div class="cart-qty">
            <button type="button" data-cart-action="decrease" data-cart-id="${escapeHtml(product.id)}">-</button>
            <b>${quantity}</b>
            <button type="button" data-cart-action="increase" data-cart-id="${escapeHtml(product.id)}">+</button>
          </div>
        </div>
      `).join('')
      : '<div class="menu-empty"><strong>Carrinho vazio.</strong><span>Adicione um item para continuar.</span></div>';
  };

  const addToCart = (productId) => {
    const product = state.products.find((item) => item.id === productId);
    if (!product || !getAvailability(product).available) return;
    const current = state.cart.get(product.id) || { product, quantity: 0 };
    current.quantity += 1;
    state.cart.set(product.id, current);
    renderCart();
  };

  const updateCartQuantity = (productId, delta) => {
    const current = state.cart.get(productId);
    if (!current) return;
    current.quantity += delta;
    if (current.quantity <= 0) state.cart.delete(productId);
    else state.cart.set(productId, current);
    renderCart();
  };

  const openCart = () => {
    cartFeedback.textContent = '';
    cartModal.classList.remove('hidden');
    renderCart();
  };

  const closeCart = () => cartModal.classList.add('hidden');

  const saveDraftAndGoToPayment = () => {
    cartFeedback.textContent = '';
    if (!state.cart.size) {
      cartFeedback.textContent = 'Adicione pelo menos um item ao pedido.';
      return;
    }

    const items = [...state.cart.values()].map(({ product, quantity }) => {
      const price = getProductPrice(product);
      return {
        id: product.id,
        codigo: product.codigo,
        nome: product.nome,
        quantidade: quantity,
        precoVenda: product.preco,
        precoPromocional: product.precoPromocional,
        adicionais: [],
        observacao: '',
        observacoes: '',
        precoUnitario: price,
        subtotalVenda: product.preco * quantity,
        desconto: Math.max((product.preco - price) * quantity, 0),
        subtotal: price * quantity
      };
    });
    const subtotalOriginal = items.reduce((total, item) => total + item.subtotalVenda, 0);
    const subtotal = items.reduce((total, item) => total + item.subtotal, 0);

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      itens: items,
      subtotalOriginal,
      desconto: Math.max(subtotalOriginal - subtotal, 0),
      subtotal,
      origem: 'cardapio',
      criadoEm: new Date().toISOString()
    }));

    window.location.href = './pagamento-pedido.html';
  };

  const validateRecipes = () => {
    if (!window.DogtopStock) return;
    state.inputs = window.DogtopStock.ensureInputs?.() || [];
    state.recipes = window.DogtopStock.ensureRecipes?.() || {};
    const inputIds = new Set(state.inputs.map((input) => input.id));
    const errors = [];

    Object.entries(state.recipes).forEach(([productKey, recipeItems]) => {
      (recipeItems || []).forEach((recipeItem) => {
        if (!inputIds.has(recipeItem.insumoId)) {
          errors.push(`${productKey} usa insumo inexistente: ${recipeItem.insumoId}`);
        }
      });
    });

    if (errors.length) {
      console.warn('[Dogtop] Receitas com problemas:', errors);
    } else {
      console.info('[Dogtop] Receitas sincronizadas com os insumos.');
    }
  };

  const render = () => {
    renderTabs();
    renderProducts();
    renderCart();
  };

  printButton?.addEventListener('click', () => window.print());
  searchInput?.addEventListener('input', (event) => {
    state.search = normalizeKey(event.target.value);
    renderProducts();
  });
  tabsElement.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.activeCategory = button.dataset.category;
    renderTabs();
    renderProducts();
  });
  productsElement.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-product]');
    if (!button) return;
    addToCart(button.dataset.addProduct);
  });
  cartOpenButton?.addEventListener('click', openCart);
  cartCheckoutButton?.addEventListener('click', saveDraftAndGoToPayment);
  cartClearButton?.addEventListener('click', () => {
    state.cart.clear();
    renderCart();
    closeCart();
  });
  cartItemsElement?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;
    updateCartQuantity(button.dataset.cartId, button.dataset.cartAction === 'increase' ? 1 : -1);
  });
  document.querySelectorAll('[data-close-cart]').forEach((button) => button.addEventListener('click', closeCart));
  window.addEventListener('storage', (event) => {
    if ([PRODUCTS_STORAGE_KEY, LEGACY_PRODUCTS_STORAGE_KEY].includes(event.key)) {
      state.products = loadProducts();
      render();
    }
  });

  applyCompany();
  state.products = loadProducts();
  validateRecipes();
  render();
})();
