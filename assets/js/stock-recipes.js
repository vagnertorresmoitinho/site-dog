(() => {
  const INPUTS_KEY = 'dogtopInsumos';
  const RECIPES_KEY = 'dogtopReceitas';
  const MOVEMENTS_KEY = 'dogtopMovimentosEstoque';

  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeKey = (value) => normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };
  const readArray = (key, fallback = []) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  const defaultInputs = [
    { id: 'ins-pao', nome: 'Pao de hot dog', categoria: 'Base', unidade: 'un', estoque: 120, minimo: 30 },
    { id: 'ins-salsicha', nome: 'Salsicha', categoria: 'Base', unidade: 'un', estoque: 120, minimo: 30 },
    { id: 'ins-pure', nome: 'Pure de batata', categoria: 'Base', unidade: 'kg', estoque: 4, minimo: 3 },
    { id: 'ins-molho', nome: 'Molho especial', categoria: 'Base', unidade: 'kg', estoque: 3, minimo: 1 },
    { id: 'ins-emb-hotdog', nome: 'Embalagem para hot dog', categoria: 'Embalagens', unidade: 'un', estoque: 100, minimo: 30 },
    { id: 'ins-emb-prato', nome: 'Embalagem para lanche no prato', categoria: 'Embalagens', unidade: 'un', estoque: 20, minimo: 20 },
    { id: 'ins-milho', nome: 'Milho verde', categoria: 'Complementos', unidade: 'kg', estoque: 1, minimo: 0.5 },
    { id: 'ins-ervilha', nome: 'Ervilha', categoria: 'Complementos', unidade: 'kg', estoque: 1, minimo: 0.5 },
    { id: 'ins-vinagrete', nome: 'Vinagrete', categoria: 'Complementos', unidade: 'kg', estoque: 1.5, minimo: 0.5 },
    { id: 'ins-batata-palha', nome: 'Batata palha', categoria: 'Complementos', unidade: 'kg', estoque: 1.5, minimo: 0.5 },
    { id: 'ins-cheddar', nome: 'Cheddar', categoria: 'Cremes e queijos', unidade: 'kg', estoque: 1.2, minimo: 1 },
    { id: 'ins-requeijao', nome: 'Requeijao cremoso', categoria: 'Cremes e queijos', unidade: 'kg', estoque: 1.2, minimo: 1 },
    { id: 'ins-coca-lata', nome: 'Coca-Cola Lata', categoria: 'Bebidas', unidade: 'un', estoque: 48, minimo: 12 }
  ];

  const defaultRecipes = {
    'LAN-001': [
      { insumoId: 'ins-pao', quantidade: 1 },
      { insumoId: 'ins-salsicha', quantidade: 1 },
      { insumoId: 'ins-pure', quantidade: 0.05 },
      { insumoId: 'ins-molho', quantidade: 0.03 },
      { insumoId: 'ins-emb-hotdog', quantidade: 1 }
    ],
    'LAN-002': [
      { insumoId: 'ins-pao', quantidade: 1 },
      { insumoId: 'ins-salsicha', quantidade: 1 },
      { insumoId: 'ins-pure', quantidade: 0.06 },
      { insumoId: 'ins-molho', quantidade: 0.03 },
      { insumoId: 'ins-milho', quantidade: 0.03 },
      { insumoId: 'ins-ervilha', quantidade: 0.03 },
      { insumoId: 'ins-vinagrete', quantidade: 0.04 },
      { insumoId: 'ins-emb-hotdog', quantidade: 1 }
    ],
    'LAN-003': [
      { insumoId: 'ins-pao', quantidade: 1 },
      { insumoId: 'ins-salsicha', quantidade: 1 },
      { insumoId: 'ins-pure', quantidade: 0.06 },
      { insumoId: 'ins-molho', quantidade: 0.03 },
      { insumoId: 'ins-milho', quantidade: 0.03 },
      { insumoId: 'ins-ervilha', quantidade: 0.03 },
      { insumoId: 'ins-cheddar', quantidade: 0.03 },
      { insumoId: 'ins-requeijao', quantidade: 0.03 },
      { insumoId: 'ins-batata-palha', quantidade: 0.025 },
      { insumoId: 'ins-emb-hotdog', quantidade: 1 }
    ],
    'LAN-004': [
      { insumoId: 'ins-salsicha', quantidade: 2 },
      { insumoId: 'ins-pure', quantidade: 0.12 },
      { insumoId: 'ins-molho', quantidade: 0.04 },
      { insumoId: 'ins-cheddar', quantidade: 0.04 },
      { insumoId: 'ins-requeijao', quantidade: 0.04 },
      { insumoId: 'ins-batata-palha', quantidade: 0.035 },
      { insumoId: 'ins-emb-prato', quantidade: 1 }
    ],
    'BEB-009': [{ insumoId: 'ins-coca-lata', quantidade: 1 }],
    'ADC-001': [{ insumoId: 'ins-milho', quantidade: 0.03 }],
    'ADC-002': [{ insumoId: 'ins-ervilha', quantidade: 0.03 }],
    'ADC-003': [{ insumoId: 'ins-salsicha', quantidade: 1 }],
    'ADC-004': [{ insumoId: 'ins-pure', quantidade: 0.05 }],
    'ADC-005': [{ insumoId: 'ins-batata-palha', quantidade: 0.025 }],
    'ADC-006': [{ insumoId: 'ins-vinagrete', quantidade: 0.04 }],
    'ADC-007': [{ insumoId: 'ins-cheddar', quantidade: 0.03 }],
    'ADC-008': [{ insumoId: 'ins-requeijao', quantidade: 0.03 }]
  };

  const ensureInputs = () => {
    const current = readArray('dogtopInsumos', []);
    if (current && current.length > 0) return current;
    return defaultInputs;
  };

  const ensureRecipes = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('dogtopReceitas') || 'null');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) return parsed;
    } catch {
      // fallback below
    }
    return defaultRecipes;
  };

  const resolveRecipe = (item, recipes) => {
    const keys = [
      item.codigo,
      item.id,
      normalizeKey(item.nome)
    ].map(normalizeText).filter(Boolean);

    return keys.flatMap((key) => recipes[key] || []);
  };

  const collectUsage = (order, recipes) => {
    const usage = new Map();

    (order?.itens || []).forEach((item) => {
      const quantity = normalizeNumber(item.quantidade) || 1;
      resolveRecipe(item, recipes).forEach((recipeItem) => {
        usage.set(recipeItem.insumoId, (usage.get(recipeItem.insumoId) || 0) + normalizeNumber(recipeItem.quantidade) * quantity);
      });

      (item.adicionais || []).forEach((additional) => {
        resolveRecipe(additional, recipes).forEach((recipeItem) => {
          usage.set(recipeItem.insumoId, (usage.get(recipeItem.insumoId) || 0) + normalizeNumber(recipeItem.quantidade) * quantity);
        });
      });
    });

    return usage;
  };

  const adjustInputStock = async (identifier, quantity, direction = 'out') => {
    const normalizedIdentifier = normalizeKey(identifier);
    const amount = normalizeNumber(quantity);
    if (!normalizedIdentifier || amount <= 0) return { ok: false, reason: 'Insumo ou quantidade invalida.' };

    const inputs = (await window.DogtopData?.getInsumos?.()) || ensureInputs();
    const input = inputs.find((item) => {
      return normalizeKey(item.id) === normalizedIdentifier
        || normalizeKey(item.nome) === normalizedIdentifier;
    });

    if (!input) return { ok: false, reason: 'Insumo nao encontrado.' };

    const previousStock = normalizeNumber(input.estoque);
    input.estoque = direction === 'in'
      ? previousStock + amount
      : Math.max(previousStock - amount, 0);
    input.atualizadoEm = new Date().toISOString();
    
    await window.DogtopData?.saveInsumo?.(input);
    await window.DogtopData?.saveMovimento?.({
      tipo: direction === 'in' ? 'entrada_manual' : 'saida_manual',
      insumoId: input.id,
      nome: input.nome,
      quantidade: amount,
      estoqueAnterior: previousStock,
      estoqueAtual: input.estoque
    });

    window.dispatchEvent(new CustomEvent('dogtop:stock-updated', {
      detail: { input, direction, quantity: amount }
    }));

    return { ok: true, input };
  };

  const registrarVenda = async (nomeInsumo, quantidade) => await adjustInputStock(nomeInsumo, quantidade, 'out');

  const processOrder = async (order) => {
    if (!order?.id) return { ok: false, reason: 'Pedido sem id.' };

    if (order.estoqueProcessadoEm || order.baixaEstoque) {
      return { ok: true, skipped: true, reason: 'Baixa ja processada.' };
    }

    const inputs = (await window.DogtopData?.getInsumos?.()) || ensureInputs();
    const recipes = (await window.DogtopData?.getReceitas?.()) || ensureRecipes();
    const usage = collectUsage(order, recipes);
    if (!usage.size) return { ok: false, reason: 'Pedido sem receita vinculada.' };

    const inputById = new Map(inputs.map((input) => [input.id, input]));
    const applied = [];
    const updatePromises = [];

    usage.forEach((quantity, inputId) => {
      const input = inputById.get(inputId);
      if (!input) return;
      const previousStock = normalizeNumber(input.estoque);
      input.estoque = Math.max(previousStock - quantity, 0);
      input.atualizadoEm = new Date().toISOString();
      applied.push({
        insumoId: input.id,
        nome: input.nome,
        unidade: input.unidade,
        quantidade: Number(quantity.toFixed(4)),
        estoqueAnterior: previousStock,
        estoqueAtual: input.estoque,
        minimo: normalizeNumber(input.minimo),
        critico: input.estoque <= normalizeNumber(input.minimo)
      });
      updatePromises.push(window.DogtopData?.saveInsumo?.(input));
    });

    if (updatePromises.length) await Promise.all(updatePromises);

    await window.DogtopData?.saveMovimento?.({
      tipo: 'baixa_venda',
      pedidoId: order.id,
      itens: applied
    });

    window.dispatchEvent(new CustomEvent('dogtop:stock-updated', {
      detail: { order, applied }
    }));

    return { ok: true, applied, critical: applied.filter((item) => item.critico) };
  };

  window.DogtopStock = {
    keys: { inputs: INPUTS_KEY, recipes: RECIPES_KEY, movements: MOVEMENTS_KEY },
    ensureInputs,
    ensureRecipes,
    adjustInputStock,
    registrarVenda,
    processOrder
  };
  window.registrarVenda = registrarVenda;
})();
