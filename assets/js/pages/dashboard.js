document.body.dataset.page = 'dashboard';

(() => {
  const PRODUCTS_STORAGE_KEY = 'dogtopProdutos';
  const LEGACY_PRODUCTS_STORAGE_KEY = 'produtosLanchonete';
  const promoSection = document.getElementById('weekly-promo-section');
  const promoGrid = document.getElementById('weekly-promo-grid');

  if (!promoSection || !promoGrid) return;

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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

  const promotionalProducts = loadProducts()
    .map((product) => ({
      id: product.id,
      nome: String(product.nome || '').trim(),
      descricao: String(product.descricao || '').trim(),
      preco: normalizeNumber(product.preco),
      precoPromocional: normalizeNumber(product.precoPromocional),
      imagem: product.imagem || '',
      status: product.status || product.disponibilidade || 'disponivel'
    }))
    .filter((product) => product.nome && product.precoPromocional > 0 && product.status === 'disponivel')
    .sort((first, second) => second.precoPromocional - first.precoPromocional)
    .slice(0, 4);

  if (!promotionalProducts.length) {
    promoSection.hidden = true;
    return;
  }

  promoGrid.innerHTML = promotionalProducts.map((product) => {
    const thumb = product.imagem
      ? `<img src="${escapeHtml(product.imagem)}" alt="">`
      : escapeHtml(product.nome.slice(0, 2).toUpperCase());
    const description = product.descricao || 'Oferta ativa no catalogo Dogtop.';

    return `
      <article class="weekly-promo-item">
        <div class="weekly-promo-thumb">${thumb}</div>
        <div class="weekly-promo-info">
          <span class="badge ok">Oferta da semana</span>
          <h3>${escapeHtml(product.nome)}</h3>
          <p>${escapeHtml(description)}</p>
          <div class="weekly-promo-prices">
            <span class="weekly-promo-original">${currencyFormatter.format(product.preco)}</span>
            <strong class="weekly-promo-price">${currencyFormatter.format(product.precoPromocional)}</strong>
          </div>
        </div>
      </article>
    `;
  }).join('');

  promoSection.hidden = false;
})();
