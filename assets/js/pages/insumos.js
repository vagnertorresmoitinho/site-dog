document.body.dataset.page = 'insumos';

(() => {
  const INPUTS_KEY = window.DogtopStock?.keys?.inputs || 'dogtopInsumos';
  const RECIPES_KEY = window.DogtopStock?.keys?.recipes || 'dogtopReceitas';
  const MOVEMENTS_KEY = window.DogtopStock?.keys?.movements || 'dogtopMovimentosEstoque';
  const PRODUCTS_KEY = 'dogtopProdutos';

  const tableBody = document.getElementById('input-table-body');
  const emptyState = document.getElementById('input-empty');
  const searchInput = document.getElementById('input-search');
  const categoryFilter = document.getElementById('input-category');
  const openFormButton = document.getElementById('input-open-form');
  const modal = document.getElementById('input-modal');
  const form = document.getElementById('input-form');
  const formTitle = document.getElementById('input-form-title');
  const recipeProduct = document.getElementById('recipe-product');
  const recipeInput = document.getElementById('recipe-input');
  const recipeQuantity = document.getElementById('recipe-quantity');
  const recipeAddButton = document.getElementById('recipe-add');
  const recipeTableBody = document.getElementById('recipe-table-body');
  const recipeEmpty = document.getElementById('recipe-empty');

  if (!tableBody || !form) return;

  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeKey = (value) => normalizeText(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
  };
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const createId = () => `ins-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const formatQuantity = (value) => {
    const numberValue = normalizeNumber(value);
    return Number.isInteger(numberValue) ? String(numberValue) : String(Number(numberValue.toFixed(3))).replace('.', ',');
  };

  let inputs = [];
  let recipes = {};
  let products = [];

  const loadData = async () => {
    const [dataInsumos, dataReceitas, dataProdutos] = await Promise.all([
      window.DogtopData.getInsumos(),
      window.DogtopData.getReceitas(),
      window.DogtopData.getProdutos()
    ]);
    inputs = dataInsumos || [];
    recipes = dataReceitas || {};
    products = dataProdutos || [];
    
    if (!inputs.length && window.DogtopStock) {
      inputs = window.DogtopStock.ensureInputs?.() || [];
      for (const i of inputs) await window.DogtopData.saveInsumo(i);
    }
    if (Object.keys(recipes).length === 0 && window.DogtopStock) {
      recipes = window.DogtopStock.ensureRecipes?.() || {};
      for (const [k, v] of Object.entries(recipes)) await window.DogtopData.saveReceita(k, v);
    }
  };

  const fallbackRecipeProducts = [
    { codigo: 'LAN-001', nome: 'Top Dog Kids', categoria: 'lanche' },
    { codigo: 'LAN-002', nome: 'Top Dog Tradicional', categoria: 'lanche' },
    { codigo: 'LAN-003', nome: 'Top Dog Completo', categoria: 'lanche' },
    { codigo: 'LAN-004', nome: 'Top Dog no Prato', categoria: 'lanche' },
    { codigo: 'BEB-009', nome: 'Coca Cola Lata', categoria: 'bebida' },
    { codigo: 'ADC-001', nome: 'Adicional de milho', categoria: 'adicional' },
    { codigo: 'ADC-002', nome: 'Adicional de ervilha', categoria: 'adicional' },
    { codigo: 'ADC-003', nome: 'Adicional de salsicha', categoria: 'adicional' },
    { codigo: 'ADC-004', nome: 'Adicional de pure', categoria: 'adicional' },
    { codigo: 'ADC-005', nome: 'Adicional de batata palha', categoria: 'adicional' },
    { codigo: 'ADC-006', nome: 'Adicional de vinagrete', categoria: 'adicional' },
    { codigo: 'ADC-007', nome: 'Adicional de cheddar', categoria: 'adicional' },
    { codigo: 'ADC-008', nome: 'Adicional de requeijao cremoso', categoria: 'adicional' }
  ];

  const getStatus = (input) => {
    const stock = normalizeNumber(input.estoque);
    const min = normalizeNumber(input.minimo);
    if (stock <= 0) return { key: 'zero', label: 'Zerado' };
    if (stock <= min) return { key: 'low', label: 'Crítico' };
    return { key: 'normal', label: 'Normal' };
  };

  const getFilteredInputs = () => {
    const search = normalizeKey(searchInput?.value);
    const category = categoryFilter?.value || 'todos';

    return inputs.filter((input) => {
      const categoryMatches = category === 'todos' || input.categoria === category;
      const text = normalizeKey([input.nome, input.categoria, input.unidade].join(' '));
      return categoryMatches && (!search || text.includes(search));
    });
  };

  const renderCategories = () => {
    const selected = categoryFilter.value || 'todos';
    const categories = [...new Set(inputs.map((input) => input.categoria).filter(Boolean))].sort();
    categoryFilter.innerHTML = '<option value="todos">Todas categorias</option>' + categories
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join('');
    categoryFilter.value = categories.includes(selected) ? selected : 'todos';
  };

  const getProductKey = (product) => normalizeText(product?.codigo || product?.id || product?.nome);
  const getRecipeProducts = () => {
    const source = products.length ? products : fallbackRecipeProducts;
    const byKey = new Map();
    source.forEach((product) => {
      const key = getProductKey(product);
      if (key) byKey.set(key, product);
    });

    Object.keys(recipes).forEach((key) => {
      if (!byKey.has(key)) byKey.set(key, { codigo: key, nome: key, categoria: 'produto' });
    });

    return [...byKey.values()];
  };

  const renderRecipeSelectors = () => {
    if (!recipeProduct || !recipeInput) return;
    const selectedProduct = recipeProduct.value;
    const selectedInput = recipeInput.value;
    const recipeProducts = getRecipeProducts()
      .sort((a, b) => normalizeText(a.nome).localeCompare(normalizeText(b.nome)));

    recipeProduct.innerHTML = recipeProducts.length
      ? recipeProducts.map((product) => {
        const key = getProductKey(product);
        return `<option value="${escapeHtml(key)}">${escapeHtml(product.nome)}${product.codigo ? ` (${escapeHtml(product.codigo)})` : ''}</option>`;
      }).join('')
      : '<option value="">Cadastre produtos primeiro</option>';
    if ([...recipeProduct.options].some((option) => option.value === selectedProduct)) recipeProduct.value = selectedProduct;

    recipeInput.innerHTML = inputs
      .slice()
      .sort((a, b) => normalizeText(a.nome).localeCompare(normalizeText(b.nome)))
      .map((input) => `<option value="${escapeHtml(input.id)}">${escapeHtml(input.nome)} (${escapeHtml(input.unidade)})</option>`)
      .join('');
    if ([...recipeInput.options].some((option) => option.value === selectedInput)) recipeInput.value = selectedInput;
  };

  const updateStats = () => {
    const low = inputs.filter((input) => getStatus(input).key === 'low').length;
    const zero = inputs.filter((input) => getStatus(input).key === 'zero').length;
    document.getElementById('input-total').textContent = String(inputs.length);
    document.getElementById('input-low').textContent = String(low);
    document.getElementById('input-zero').textContent = String(zero);
  };

  const renderTable = () => {
    const list = getFilteredInputs();

    tableBody.innerHTML = list.map((input) => {
      const status = getStatus(input);
      const stock = normalizeNumber(input.estoque);
      const min = normalizeNumber(input.minimo);
      const percent = min > 0 ? Math.min((stock / (min * 2)) * 100, 100) : 100;

      return `
        <tr data-input-id="${escapeHtml(input.id)}">
          <td>
            <span class="input-name">
              <strong>${escapeHtml(input.nome)}</strong>
              <small>${escapeHtml(input.id)}</small>
            </span>
          </td>
          <td>${escapeHtml(input.categoria || 'Sem categoria')}</td>
          <td><span class="input-stock">${formatQuantity(stock)} ${escapeHtml(input.unidade)}</span></td>
          <td>${formatQuantity(min)} ${escapeHtml(input.unidade)}</td>
          <td>
            <div class="input-progress ${status.key}">
              <div class="input-progress__bar"><span style="width:${percent}%"></span></div>
              <small>${Math.round(percent)}% do nível seguro</small>
            </div>
          </td>
          <td><span class="input-status ${status.key}">${status.label}</span></td>
          <td>
            <div class="input-actions">
              <button type="button" data-action="in" title="Entrada rápida" aria-label="Entrada rápida">↑</button>
              <button type="button" data-action="out" title="Saída manual" aria-label="Saída manual">↓</button>
              <button type="button" data-action="edit" title="Editar" aria-label="Editar">✎</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    emptyState.classList.toggle('hidden', list.length > 0);
    renderCategories();
    renderRecipeSelectors();
    renderRecipeTable();
    updateStats();
  };

  const renderRecipeTable = () => {
    if (!recipeTableBody || !recipeProduct) return;
    const productKey = recipeProduct.value;
    const recipeItems = recipes[productKey] || [];
    const inputById = new Map(inputs.map((input) => [input.id, input]));

    recipeTableBody.innerHTML = recipeItems.map((item, index) => {
      const input = inputById.get(item.insumoId);
      return `
        <tr>
          <td><strong>${escapeHtml(input?.nome || item.insumoId)}</strong></td>
          <td>${escapeHtml(input?.categoria || '-')}</td>
          <td><span class="input-stock">${formatQuantity(item.quantidade)}</span></td>
          <td>${escapeHtml(input?.unidade || '-')}</td>
          <td><button type="button" data-remove-recipe-item="${index}">Remover</button></td>
        </tr>
      `;
    }).join('');

    recipeEmpty?.classList.toggle('hidden', recipeItems.length > 0);
  };

  const openModal = (input = null) => {
    form.reset();
    form.elements.namedItem('id').value = input?.id || '';
    form.elements.namedItem('nome').value = input?.nome || '';
    form.elements.namedItem('categoria').value = input?.categoria || '';
    form.elements.namedItem('unidade').value = input?.unidade || 'un';
    form.elements.namedItem('estoque').value = input?.estoque ?? '';
    form.elements.namedItem('minimo').value = input?.minimo ?? '';
    form.elements.namedItem('custoUnitario').value = input?.custoUnitario ?? '';
    formTitle.textContent = input ? 'Editar Insumo' : 'Novo Insumo';
    modal.classList.remove('hidden');
    form.elements.namedItem('nome').focus();
  };

  const closeModal = () => modal.classList.add('hidden');

  const adjustStock = async (input, type) => {
    const raw = window.prompt(type === 'in' ? 'Quantidade de entrada:' : 'Quantidade de saída:');
    if (raw === null) return;
    const quantity = normalizeNumber(String(raw).replace(',', '.'));
    if (!quantity) return;

    const previousStock = normalizeNumber(input.estoque);
    input.estoque = type === 'in'
      ? previousStock + quantity
      : Math.max(previousStock - quantity, 0);
    input.atualizadoEm = new Date().toISOString();
    
    await window.DogtopData.saveInsumo(input);
    await window.DogtopData.saveMovimento({
      tipo: type === 'in' ? 'entrada_manual' : 'saida_manual',
      insumoId: input.id,
      nome: input.nome,
      quantidade: quantity,
      estoqueAnterior: previousStock,
      estoqueAtual: input.estoque
    });
    renderTable();
  };

  tableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const row = event.target.closest('[data-input-id]');
    const input = inputs.find((item) => item.id === row?.dataset.inputId);
    if (!input) return;

    if (button.dataset.action === 'edit') openModal(input);
    if (button.dataset.action === 'in' || button.dataset.action === 'out') await adjustStock(input, button.dataset.action);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const id = normalizeText(formData.get('id')) || createId();
    const existingIndex = inputs.findIndex((input) => input.id === id);
    const input = {
      id,
      nome: normalizeText(formData.get('nome')),
      categoria: normalizeText(formData.get('categoria')),
      unidade: normalizeText(formData.get('unidade')) || 'un',
      estoque: normalizeNumber(formData.get('estoque')),
      minimo: normalizeNumber(formData.get('minimo')),
      custoUnitario: normalizeNumber(formData.get('custoUnitario')),
      atualizadoEm: new Date().toISOString()
    };

    const savedInput = await window.DogtopData.saveInsumo(input);
    if (existingIndex >= 0) inputs[existingIndex] = savedInput;
    else inputs.unshift(savedInput);
    
    closeModal();
    renderTable();
  });

  recipeProduct?.addEventListener('change', renderRecipeTable);
  recipeAddButton?.addEventListener('click', async () => {
    const productKey = recipeProduct?.value;
    const inputId = recipeInput?.value;
    const quantity = normalizeNumber(recipeQuantity?.value);
    if (!productKey || !inputId || quantity <= 0) return;

    const recipeItems = recipes[productKey] || [];
    const existing = recipeItems.find((item) => item.insumoId === inputId);
    if (existing) existing.quantidade = quantity;
    else recipeItems.push({ insumoId: inputId, quantidade: quantity });
    recipes[productKey] = recipeItems;
    await window.DogtopData.saveReceita(productKey, recipeItems);
    recipeQuantity.value = '';
    renderRecipeTable();
  });
  recipeTableBody?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-recipe-item]');
    if (!button || !recipeProduct?.value) return;
    const index = Number(button.dataset.removeRecipeItem);
    if (!Number.isInteger(index)) return;
    recipes[recipeProduct.value] = (recipes[recipeProduct.value] || []).filter((_, itemIndex) => itemIndex !== index);
    await window.DogtopData.saveReceita(recipeProduct.value, recipes[recipeProduct.value]);
    renderRecipeTable();
  });

  openFormButton?.addEventListener('click', () => openModal());
  document.querySelectorAll('[data-close-input-modal]').forEach((button) => button.addEventListener('click', closeModal));
  searchInput?.addEventListener('input', renderTable);
  categoryFilter?.addEventListener('change', renderTable);
  window.addEventListener('dogtop:stock-updated', async () => {
    inputs = await window.DogtopData.getInsumos();
    renderTable();
  });

  loadData().then(() => {
    renderTable();
  });
})();
