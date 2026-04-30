document.body.dataset.page = 'produtos';

(() => {
  const STORAGE_KEY = 'dogtopProdutos';
  const LEGACY_STORAGE_KEY = 'produtosLanchonete';
  const INPUTS_KEY = window.DogtopStock?.keys?.inputs || 'dogtopInsumos';

  const form = document.getElementById('product-form');
  const tableBody = document.getElementById('product-table-body');
  const additionalTableBody = document.getElementById('additional-table-body');
  const additionalEmptyState = document.getElementById('additional-empty');
  const additionalTotal = document.getElementById('additional-total');
  const searchInput = document.getElementById('product-search');
  const categoryFilter = document.getElementById('product-category-filter');
  const emptyState = document.getElementById('product-empty');
  const clearButton = document.getElementById('product-clear');
  const formTitle = document.getElementById('product-form-title');
  const submitButton = document.getElementById('product-submit');
  const preview = document.getElementById('product-preview');
  const ingredientList = document.getElementById('ingredient-list');
  const openFormButton = document.getElementById('product-open-form');
  const formModal = document.getElementById('product-form-modal');
  const categoryTabs = document.getElementById('product-category-tabs');

  const totals = {
    total: document.getElementById('product-total'),
    available: document.getElementById('product-available'),
    lowStock: document.getElementById('product-low-stock'),
    stockValue: document.getElementById('product-stock-value')
  };

  if (!form || !tableBody) return;

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const categoryLabels = {
    lanche: 'Lanche',
    bebida: 'Bebida',
    sobremesa: 'Sobremesa',
    porcao: 'Porção',
    combo: 'Combo',
    promo: 'Combo',
    adicional: 'Adicional'
  };

  const statusLabels = {
    disponivel: 'Disponível',
    indisponivel: 'Indisponível',
    esgotado: 'Esgotado'
  };

  const statusClass = {
    disponivel: 'ok',
    indisponivel: 'pending',
    esgotado: 'pending'
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
  };
  const productImages = {
    hotdog: '../assets/img/produtos/hotdog.svg',
    adicional: '../assets/img/produtos/adicional.svg'
  };
  const illustrativeImages = {
    lanche: productImages.hotdog,
    bebida: productImages.hotdog,
    sobremesa: productImages.hotdog,
    porcao: productImages.hotdog,
    combo: productImages.hotdog,
    adicional: productImages.adicional
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
  const createId = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }

    return `prd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  let ingredientState = [];

  const readArray = (key) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getRegisteredInputs = () => {
    const source = window.DogtopStock?.ensureInputs?.() || readArray(INPUTS_KEY);
    return source
      .map((input) => ({
        id: normalizeText(input.id || input.nome),
        nome: normalizeText(input.nome),
        categoria: normalizeText(input.categoria),
        unidade: normalizeText(input.unidade || 'un'),
        estoque: normalizeNumber(input.estoque)
      }))
      .filter((input) => input.id && input.nome)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  };

  const normalizeIngredientList = (ingredients) => {
    const list = Array.isArray(ingredients) ? ingredients : normalizeText(ingredients).split(',');
    return list.map((ingredient) => {
      if (typeof ingredient === 'object' && ingredient !== null) return normalizeText(ingredient.nome || ingredient.name || ingredient.id);
      return normalizeText(ingredient);
    }).filter(Boolean);
  };

  const syncIngredientField = () => {
    const field = form.elements.namedItem('ingredientes');
    if (field) field.value = JSON.stringify(ingredientState);
  };

  const renderIngredientList = () => {
    if (!ingredientList) return;

    const registeredInputs = getRegisteredInputs();

    if (!registeredInputs.length) {
      ingredientList.innerHTML = '<div class="ingredient-empty">Nenhum insumo cadastrado. Cadastre primeiro na tela de Insumos.</div>';
      ingredientState = [];
      syncIngredientField();
      return;
    }

    const selected = new Set(ingredientState.map((ingredient) => ingredient.toLowerCase()));

    ingredientList.innerHTML = registeredInputs.map((input) => {
      const checked = selected.has(input.nome.toLowerCase()) ? 'checked' : '';
      const stockInfo = `${input.estoque} ${input.unidade}`;
      return `
        <label class="ingredient-item ingredient-item--checkbox">
          <input type="checkbox" name="ingredienteInsumo" value="${escapeHtml(input.nome)}" ${checked}>
          <span>
            <strong>${escapeHtml(input.nome)}</strong>
            <small>${escapeHtml(input.categoria || 'Sem categoria')} · Estoque: ${escapeHtml(stockInfo)}</small>
          </span>
        </label>
      `;
    }).join('');
    syncIngredientField();
  };

  const setIngredientState = (ingredients) => {
    const registeredInputs = getRegisteredInputs();
    const allowedNames = new Map(registeredInputs.map((input) => [input.nome.toLowerCase(), input.nome]));
    const uniqueIngredients = [];

    normalizeIngredientList(ingredients).forEach((ingredient) => {
      const registeredName = allowedNames.get(ingredient.toLowerCase());
      if (registeredName && !uniqueIngredients.some((current) => current.toLowerCase() === registeredName.toLowerCase())) {
        uniqueIngredients.push(registeredName);
      }
    });

    ingredientState = uniqueIngredients;
    renderIngredientList();
  };

  const normalizeProduct = (product) => {
    const categoria = product.categoria === 'promo' ? 'combo' : normalizeText(product.categoria);
    const status = product.status || product.disponibilidade || 'disponivel';

    return {
      id: String(product.id || createId()),
      codigo: normalizeText(product.codigo),
      nome: normalizeText(product.nome),
      categoria,
      preco: normalizeNumber(product.preco),
      precoPromocional: normalizeNumber(product.precoPromocional),
      estoque: Math.floor(normalizeNumber(product.estoque)),
      tempoPreparo: Math.floor(normalizeNumber(product.tempoPreparo || product.tempo)),
      status,
      ingredientes: normalizeIngredientList(product.ingredientes),
      tags: Array.isArray(product.tags)
        ? product.tags.map(normalizeText).filter(Boolean)
        : Array.isArray(product.alergenos) ? product.alergenos.map(normalizeText).filter(Boolean) : [],
      optionGroups: Array.isArray(product.optionGroups) ? product.optionGroups.map(normalizeText).filter(Boolean) : [],
      descricao: normalizeText(product.descricao),
      imagem: getProductImage(product, categoria),
      criadoEm: product.criadoEm || product.dataCadastro || new Date().toISOString(),
      atualizadoEm: product.atualizadoEm || new Date().toISOString()
    };
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
      tempoPreparo: 10,
      status: 'disponivel',
      ingredientes: ['Pão', 'molho especial', 'purê', 'salsicha', 'maionese', 'ketchup'],
      tags: ['gluten'],
      descricao: 'Pão, molho especial, purê, salsicha, maionese e ketchup.',
      imagem: productImages.hotdog,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-002',
      codigo: 'LAN-002',
      nome: 'Top Dog Tradicional',
      categoria: 'lanche',
      preco: 21,
      precoPromocional: 0,
      estoque: 50,
      tempoPreparo: 12,
      status: 'disponivel',
      ingredientes: ['Pão', 'molho especial', 'purê', 'salsicha', 'vinagrete', 'milho', 'ervilha', 'maionese', 'ketchup', 'mostarda'],
      tags: ['gluten'],
      descricao: 'Pão, molho especial, purê, salsicha, vinagrete, milho, ervilha, maionese, ketchup e mostarda.',
      imagem: productImages.hotdog,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-003',
      codigo: 'LAN-003',
      nome: 'Top Dog Completo',
      categoria: 'lanche',
      preco: 26,
      precoPromocional: 0,
      estoque: 50,
      tempoPreparo: 14,
      status: 'disponivel',
      ingredientes: ['Pão', 'molho especial', 'purê', 'salsicha', 'vinagrete', 'milho', 'ervilha', 'cheddar', 'requeijão cremoso', 'maionese', 'ketchup', 'mostarda', 'batata palha'],
      tags: ['gluten', 'lactose'],
      descricao: 'Pão, molho especial, purê, salsicha, vinagrete, milho, ervilha, cheddar, requeijão cremoso, maionese, ketchup, mostarda e batata palha.',
      imagem: productImages.hotdog,
      criadoEm: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-004',
      codigo: 'LAN-004',
      nome: 'Top Dog no Prato',
      categoria: 'lanche',
      preco: 35,
      precoPromocional: 0,
      estoque: 40,
      tempoPreparo: 18,
      status: 'disponivel',
      ingredientes: ['Molho especial', '2x purê', '2 salsichas', 'vinagrete', 'cheddar', 'requeijão cremoso', 'maionese', 'ketchup', 'mostarda', 'batata palha', 'bacon'],
      tags: ['gluten', 'lactose'],
      descricao: 'Molho especial, 2x purê, 2 salsichas, vinagrete, cheddar, requeijão cremoso, maionese, ketchup, mostarda, batata palha e bacon.',
      imagem: productImages.hotdog,
      criadoEm: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-005',
      codigo: 'LAN-005',
      nome: 'Top Dog - Kafta',
      categoria: 'lanche',
      preco: 38.9,
      precoPromocional: 0,
      estoque: 35,
      tempoPreparo: 20,
      status: 'disponivel',
      ingredientes: ['Pão', 'molho especial', 'creme de alho ou creme de milho', 'purê', 'kafta', 'vinagrete', 'milho', 'ervilha', 'cheddar', 'requeijão cremoso', 'maionese', 'ketchup', 'mostarda', 'batata palha'],
      tags: ['gluten', 'lactose'],
      descricao: 'Pão, molho especial, creme de alho ou de milho, purê, kafta, vinagrete, milho, ervilha, cheddar, requeijão cremoso, maionese, ketchup, mostarda e batata palha.',
      imagem: productImages.hotdog,
      criadoEm: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-006',
      codigo: 'ADC-001',
      nome: 'Adicional de milho',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      tempoPreparo: 1,
      status: 'disponivel',
      ingredientes: ['Milho'],
      tags: [],
      descricao: 'Porção extra de milho.',
      imagem: productImages.adicional,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-007',
      codigo: 'ADC-002',
      nome: 'Adicional de ervilha',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      tempoPreparo: 1,
      status: 'disponivel',
      ingredientes: ['Ervilha'],
      tags: [],
      descricao: 'Porção extra de ervilha.',
      imagem: productImages.adicional,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-008',
      codigo: 'ADC-003',
      nome: 'Adicional de salsicha',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      tempoPreparo: 1,
      status: 'disponivel',
      ingredientes: ['Salsicha'],
      tags: [],
      descricao: 'Salsicha extra.',
      imagem: productImages.adicional,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-009',
      codigo: 'ADC-004',
      nome: 'Adicional de purê',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      tempoPreparo: 1,
      status: 'disponivel',
      ingredientes: ['Purê'],
      tags: [],
      descricao: 'Porção extra de purê.',
      imagem: productImages.adicional,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-010',
      codigo: 'ADC-005',
      nome: 'Adicional de batata palha',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      tempoPreparo: 1,
      status: 'disponivel',
      ingredientes: ['Batata palha'],
      tags: [],
      descricao: 'Porção extra de batata palha.',
      imagem: productImages.adicional,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-011',
      codigo: 'ADC-006',
      nome: 'Adicional de vinagrete',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      tempoPreparo: 1,
      status: 'disponivel',
      ingredientes: ['Vinagrete'],
      tags: [],
      descricao: 'Porção extra de vinagrete.',
      imagem: productImages.adicional,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-012',
      codigo: 'ADC-007',
      nome: 'Adicional de cheddar',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      tempoPreparo: 1,
      status: 'disponivel',
      ingredientes: ['Cheddar'],
      tags: ['lactose'],
      descricao: 'Porção extra de cheddar.',
      imagem: productImages.adicional,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    },
    {
      id: 'prd-013',
      codigo: 'ADC-008',
      nome: 'Adicional de requeijão cremoso',
      categoria: 'adicional',
      preco: 2.5,
      precoPromocional: 0,
      estoque: 999,
      tempoPreparo: 1,
      status: 'disponivel',
      ingredientes: ['Requeijão cremoso'],
      tags: ['lactose'],
      descricao: 'Porção extra de requeijão cremoso.',
      imagem: productImages.adicional,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    }
  ];

  const mergeSampleProducts = (productList) => {
    const normalizedSamples = sampleProducts.map(normalizeProduct);
    const sampleIds = new Set(normalizedSamples.map((sample) => sample.id));
    const customProducts = productList.filter((product) => !sampleIds.has(product.id));

    return [...normalizedSamples, ...customProducts];
  };

  let products = [];

  const loadProducts = async () => {
    const data = await window.DogtopData.getProdutos();
    
    if (!data || data.length === 0) {
      products = sampleProducts.map(normalizeProduct);
    } else {
      products = mergeSampleProducts(data.map(normalizeProduct).filter((product) => product.nome));
    }

    products.forEach((product) => {
      if (!product.codigo) product.codigo = getNextCode(product.categoria);
    });
  };

  const getNextCode = (categoria) => {
    const prefix = (categoria || 'produto').slice(0, 3).toUpperCase();
    const nextNumber = products.reduce((max, product) => {
      const match = product.codigo.match(/-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

    return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
  };

  const saveProducts = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  };

  const setPreview = (imageSource) => {
    if (!preview) return;
    preview.innerHTML = imageSource
      ? `<img src="${escapeHtml(imageSource)}" alt="">`
      : 'Sem imagem';
  };

  const clearForm = () => {
    form.reset();
    form.elements.namedItem('id').value = '';
    form.elements.namedItem('imagem').value = '';
    setIngredientState([]);
    setPreview('');
    if (formTitle) formTitle.textContent = 'Cadastrar produto';
    if (submitButton) submitButton.textContent = 'Salvar produto';
  };

  const openForm = () => {
    if (!formModal) return;
    formModal.classList.remove('hidden');
    form.querySelector('[name="nome"]')?.focus();
  };

  const closeForm = () => {
    if (!formModal) return;
    formModal.classList.add('hidden');
  };

  const getFilteredProducts = () => {
    const term = normalizeText(searchInput?.value).toLowerCase();
    const selectedCategory = categoryFilter?.value || 'todos';

    return products.filter((product) => product.categoria !== 'adicional').filter((product) => {
      const categoryMatches = selectedCategory === 'todos' || product.categoria === selectedCategory;
      const textMatches = !term || [
        product.nome,
        product.codigo,
        categoryLabels[product.categoria],
        product.descricao,
        product.ingredientes.join(', ')
      ].some((value) => String(value || '').toLowerCase().includes(term));

      return categoryMatches && textMatches;
    });
  };

  const getFilteredAdditionals = () => {
    const term = normalizeText(searchInput?.value).toLowerCase();
    return products.filter((product) => product.categoria === 'adicional').filter((product) => {
      if (!term) return true;
      return [
        product.nome,
        product.codigo,
        product.descricao,
        product.ingredientes.join(', ')
      ].some((value) => String(value || '').toLowerCase().includes(term));
    });
  };

  const updateStats = () => {
    const totalStockValue = products.reduce((sum, product) => sum + product.preco * product.estoque, 0);

    if (totals.total) totals.total.textContent = String(products.length);
    if (totals.available) totals.available.textContent = String(products.filter((product) => product.status === 'disponivel').length);
    if (totals.lowStock) totals.lowStock.textContent = String(products.filter((product) => product.estoque <= 5).length);
    if (totals.stockValue) totals.stockValue.textContent = currencyFormatter.format(totalStockValue);
  };

  const renderTable = () => {
    const filteredProducts = getFilteredProducts();
    const filteredAdditionals = getFilteredAdditionals();

    tableBody.innerHTML = filteredProducts.map((product) => {
      const ingredients = product.ingredientes.slice(0, 3).join(', ');
      const hasPromotionalPrice = product.precoPromocional > 0;
      const priceHtml = hasPromotionalPrice
        ? `
          <div class="product-price-stack">
            <span class="product-price-original">${currencyFormatter.format(product.preco)}</span>
            <span class="product-price-promo">${currencyFormatter.format(product.precoPromocional)}</span>
          </div>
        `
        : currencyFormatter.format(product.preco);
      const thumb = product.imagem
        ? `<img src="${escapeHtml(product.imagem)}" alt="">`
        : escapeHtml(product.nome.slice(0, 2).toUpperCase() || 'PR');

      return `
        <tr data-product-id="${escapeHtml(product.id)}">
          <td>
            <div class="product-cell">
              <div class="product-thumb">${thumb}</div>
              <div class="product-name">
                <strong>${escapeHtml(product.nome)}</strong>
                <small>${escapeHtml(product.codigo || getNextCode(product.categoria))} - ${escapeHtml(ingredients || product.descricao || 'Sem ingredientes informados')}</small>
                <span class="badge ${statusClass[product.status] || 'info'}">${escapeHtml(statusLabels[product.status] || product.status)}</span>
              </div>
            </div>
          </td>
          <td><span class="badge info">${escapeHtml(categoryLabels[product.categoria] || product.categoria || 'Sem categoria')}</span></td>
          <td class="product-price">${priceHtml}</td>
          <td>${product.estoque} un</td>
          <td>
            <div class="product-actions">
              <button type="button" class="client-action-link" data-action="edit" data-product-id="${escapeHtml(product.id)}">Editar</button>
              <button type="button" class="client-action-link client-action-link--danger" data-action="delete" data-product-id="${escapeHtml(product.id)}">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (additionalTableBody) {
      additionalTableBody.innerHTML = filteredAdditionals.map((product) => {
        const thumb = product.imagem
          ? `<img src="${escapeHtml(product.imagem)}" alt="">`
          : escapeHtml(product.nome.slice(0, 2).toUpperCase() || 'AD');

        return `
          <tr data-product-id="${escapeHtml(product.id)}">
            <td>
              <div class="product-cell">
                <div class="product-thumb product-thumb--additional">${thumb}</div>
                <div class="product-name">
                  <strong>${escapeHtml(product.nome.replace(/^Adicional de\s*/i, ''))}</strong>
                  <small>${escapeHtml(product.codigo || getNextCode(product.categoria))} - ${escapeHtml(product.descricao || product.ingredientes.join(', ') || 'Item opcional')}</small>
                </div>
              </div>
            </td>
            <td class="product-price">${currencyFormatter.format(product.precoPromocional > 0 ? product.precoPromocional : product.preco)}</td>
            <td class="text-center">${product.estoque} un</td>
            <td class="text-center"><span class="badge ${statusClass[product.status] || 'info'}">${escapeHtml(statusLabels[product.status] || product.status)}</span></td>
            <td>
              <div class="product-actions justify-end">
                <button type="button" class="client-action-link" data-action="edit" data-product-id="${escapeHtml(product.id)}">Editar</button>
                <button type="button" class="client-action-link client-action-link--danger" data-action="delete" data-product-id="${escapeHtml(product.id)}">Excluir</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (emptyState) {
      emptyState.style.display = filteredProducts.length ? 'none' : 'block';
    }
    if (additionalEmptyState) {
      additionalEmptyState.style.display = filteredAdditionals.length ? 'none' : 'flex';
    }
    if (additionalTotal) {
      additionalTotal.textContent = `${filteredAdditionals.length} ${filteredAdditionals.length === 1 ? 'adicional' : 'adicionais'}`;
    }

    updateStats();
  };

  const populateForm = (product) => {
    form.elements.namedItem('id').value = product.id;
    form.elements.namedItem('codigo').value = product.codigo;
    form.elements.namedItem('nome').value = product.nome;
    form.elements.namedItem('categoria').value = product.categoria;
    form.elements.namedItem('preco').value = product.preco;
    form.elements.namedItem('precoPromocional').value = product.precoPromocional || '';
    form.elements.namedItem('estoque').value = product.estoque;
    form.elements.namedItem('tempoPreparo').value = product.tempoPreparo || '';
    form.elements.namedItem('status').value = product.status;
    setIngredientState(product.ingredientes);
    form.elements.namedItem('descricao').value = product.descricao;
    form.elements.namedItem('imagem').value = product.imagem;

    form.querySelectorAll('input[name="tags"]').forEach((checkbox) => {
      checkbox.checked = product.tags.includes(checkbox.value);
    });
    form.querySelectorAll('input[name="optionGroups"]').forEach((checkbox) => {
      checkbox.checked = product.optionGroups.includes(checkbox.value);
    });

    setPreview(product.imagem);
    if (formTitle) formTitle.textContent = 'Editar produto';
    if (submitButton) submitButton.textContent = 'Atualizar produto';
    openForm();
  };

  const readFormProduct = () => {
    const formData = new FormData(form);
    const id = normalizeText(formData.get('id'));
    const categoria = normalizeText(formData.get('categoria'));
    const existingProduct = products.find((product) => product.id === id);
    const imagem = normalizeText(formData.get('imagem'));

    return normalizeProduct({
      id: id || createId(),
      codigo: normalizeText(formData.get('codigo')) || existingProduct?.codigo || getNextCode(categoria),
      nome: formData.get('nome'),
      categoria,
      preco: formData.get('preco'),
      precoPromocional: formData.get('precoPromocional'),
      estoque: formData.get('estoque'),
      tempoPreparo: formData.get('tempoPreparo'),
      status: formData.get('status'),
      ingredientes: [...ingredientState],
      tags: formData.getAll('tags'),
      optionGroups: formData.getAll('optionGroups'),
      descricao: formData.get('descricao'),
      imagem,
      criadoEm: existingProduct?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    });
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const productData = readFormProduct();
    
    try {
      const product = await window.DogtopData.saveProduto(productData);
      const productIndex = products.findIndex((item) => item.id === product.id);

      if (productIndex >= 0) {
        products[productIndex] = product;
        window.DogtopAudit?.log({
          modulo: 'Produtos',
          acao: 'Produto atualizado',
          entidade: product.codigo || product.id,
          detalhe: `${product.nome} atualizado com preco ${currencyFormatter.format(product.preco)} e estoque ${product.estoque}.`,
          dados: { id: product.id, codigo: product.codigo, categoria: product.categoria, status: product.status }
        });
      } else {
        products.unshift(product);
        window.DogtopAudit?.log({
          modulo: 'Produtos',
          acao: 'Produto cadastrado',
          entidade: product.codigo || product.id,
          detalhe: `${product.nome} cadastrado com preco ${currencyFormatter.format(product.preco)} e estoque ${product.estoque}.`,
          dados: { id: product.id, codigo: product.codigo, categoria: product.categoria, status: product.status }
        });
      }

      saveProducts();
      clearForm();
      closeForm();
      renderTable();
    } catch (e) {
      console.error('Falha ao salvar produto', e);
      window.alert('Ocorreu um erro ao salvar o produto.');
    }
  });

  form.elements.namedItem('arquivoImagem')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      form.elements.namedItem('imagem').value = '';
      setPreview('');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      form.elements.namedItem('imagem').value = reader.result;
      setPreview(reader.result);
    });
    reader.readAsDataURL(file);
  });

  ingredientList?.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[name="ingredienteInsumo"]');
    if (!checkbox) return;

    ingredientState = [...ingredientList.querySelectorAll('input[name="ingredienteInsumo"]:checked')]
      .map((input) => normalizeText(input.value))
      .filter(Boolean);
    syncIngredientField();
  });

  window.addEventListener('dogtop:stock-updated', () => {
    setIngredientState(ingredientState);
  });

  const handleTableAction = (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const productId = actionButton.dataset.productId;
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    if (actionButton.dataset.action === 'edit') {
      populateForm(product);
      return;
    }

    if (actionButton.dataset.action === 'delete') {
      const shouldDelete = window.confirm(`Deseja excluir o produto ${product.nome}?`);
      if (!shouldDelete) return;

      products = products.filter((item) => item.id !== productId);
      saveProducts();
      window.DogtopAudit?.log({
        modulo: 'Produtos',
        acao: 'Produto excluido',
        entidade: product.codigo || product.id,
        detalhe: `${product.nome} foi excluido da tabela de produtos.`,
        dados: { id: product.id, codigo: product.codigo, categoria: product.categoria }
      });
      clearForm();
      renderTable();
    }
  };

  tableBody.addEventListener('click', handleTableAction);
  additionalTableBody?.addEventListener('click', handleTableAction);

  searchInput?.addEventListener('input', renderTable);
  categoryFilter?.addEventListener('change', () => {
    categoryTabs?.querySelectorAll('[data-category-tab]').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.categoryTab === categoryFilter.value);
    });
    renderTable();
  });
  categoryTabs?.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-category-tab]');
    if (!tab || !categoryFilter) return;
    categoryFilter.value = tab.dataset.categoryTab;
    categoryTabs.querySelectorAll('[data-category-tab]').forEach((button) => {
      button.classList.toggle('active', button === tab);
    });
    renderTable();
  });
  clearButton?.addEventListener('click', clearForm);
  openFormButton?.addEventListener('click', () => {
    clearForm();
    openForm();
  });
  document.querySelectorAll('[data-close-product-form]').forEach((button) => {
    button.addEventListener('click', closeForm);
  });

  // Inicialização assíncrona
  loadProducts().then(() => {
    saveProducts();
    renderTable();
  });
})();
