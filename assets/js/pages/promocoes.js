document.body.dataset.page = 'promocoes';

(() => {
  const PRODUCTS_STORAGE_KEY = 'dogtopProdutos';
  const LEGACY_PRODUCTS_STORAGE_KEY = 'produtosLanchonete';
  const tableBody = document.getElementById('promotions-table-body');
  const searchInput = document.getElementById('promotions-search');
  const emptyState = document.getElementById('promotions-empty');
  const countBadge = document.getElementById('promotions-count');
  const openPromoModalButton = document.getElementById('open-promo-modal');
  const promoModal = document.getElementById('promo-modal');
  const promoForm = document.getElementById('promo-form');
  const promoTitleInput = promoForm?.querySelector('[name="titulo"]');

  if (!tableBody) return;

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const categoryLabels = {
    lanche: 'Lanche',
    bebida: 'Bebida',
    sobremesa: 'Sobremesa',
    porcao: 'Porcao',
    combo: 'Combo',
    promo: 'Combo'
  };

  const statusLabels = {
    disponivel: 'Disponível',
    indisponivel: 'Indisponível',
    esgotado: 'Esgotado'
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
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
  };

  const loadProducts = () => {
    const source = localStorage.getItem(PRODUCTS_STORAGE_KEY) || localStorage.getItem(LEGACY_PRODUCTS_STORAGE_KEY);
    if (!source) return [];

    try {
      const parsed = JSON.parse(source);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getPromotionalProducts = () => loadProducts()
    .map((product) => ({
      id: product.id,
      codigo: normalizeText(product.codigo),
      nome: normalizeText(product.nome),
      categoria: product.categoria === 'promo' ? 'combo' : normalizeText(product.categoria),
      preco: normalizeNumber(product.preco),
      precoPromocional: normalizeNumber(product.precoPromocional),
      descricao: normalizeText(product.descricao),
      imagem: product.imagem || '',
      status: product.status || product.disponibilidade || 'disponivel'
    }))
    .filter((product) => product.nome && product.preco > 0 && product.precoPromocional > 0);

  const getFilteredPromotions = () => {
    const term = normalizeText(searchInput?.value).toLowerCase();
    const promotions = getPromotionalProducts();

    if (!term) return promotions;

    return promotions.filter((product) => [
      product.codigo,
      product.nome,
      categoryLabels[product.categoria],
      product.descricao,
      statusLabels[product.status]
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  };

  const renderPromotions = () => {
    const promotions = getFilteredPromotions();
    const totalPromotions = getPromotionalProducts().length;

    tableBody.innerHTML = promotions.map((product) => {
      const thumb = product.imagem
        ? `<img src="${escapeHtml(product.imagem)}" alt="">`
        : escapeHtml(product.nome.slice(0, 2).toUpperCase() || 'PR');
      const discount = Math.max(0, Math.round((1 - product.precoPromocional / product.preco) * 100));
      const statusClass = product.status === 'disponivel' ? 'ok' : 'pending';

      return `
        <tr>
          <td><strong>${escapeHtml(product.codigo || '-')}</strong></td>
          <td>
            <div class="promotion-product">
              <div class="promotion-thumb">${thumb}</div>
              <div class="promotion-name">
                <strong>${escapeHtml(product.nome)}</strong>
                <small>${escapeHtml(product.descricao || 'Promocao cadastrada em produtos')}</small>
              </div>
            </div>
          </td>
          <td><span class="badge info">${escapeHtml(categoryLabels[product.categoria] || product.categoria || 'Sem categoria')}</span></td>
          <td><span class="promotion-original-price">${currencyFormatter.format(product.preco)}</span></td>
          <td><span class="promotion-price">${currencyFormatter.format(product.precoPromocional)}</span></td>
          <td><span class="promotion-discount">${discount}%</span></td>
          <td><span class="badge ${statusClass}">${escapeHtml(statusLabels[product.status] || product.status)}</span></td>
        </tr>
      `;
    }).join('');

    if (emptyState) {
      emptyState.style.display = promotions.length ? 'none' : 'block';
    }

    if (countBadge) {
      countBadge.textContent = `${totalPromotions} ${totalPromotions === 1 ? 'ativa' : 'ativas'}`;
    }
  };

  const openPromoModal = () => {
    if (!promoModal) return;

    promoModal.classList.remove('hidden');
    promoModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    requestAnimationFrame(() => promoTitleInput?.focus());
  };

  const closePromoModal = () => {
    if (!promoModal) return;

    promoModal.classList.add('hidden');
    promoModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
  };

  searchInput?.addEventListener('input', renderPromotions);
  openPromoModalButton?.addEventListener('click', openPromoModal);

  document.querySelectorAll('[data-close-promo-modal]').forEach((button) => {
    button.addEventListener('click', closePromoModal);
  });

  promoForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    closePromoModal();
    promoForm.reset();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && promoModal?.getAttribute('aria-hidden') === 'false') {
      closePromoModal();
    }
  });

  renderPromotions();
})();
