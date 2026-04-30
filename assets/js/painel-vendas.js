(() => {
  const CURRENT_USER_KEY = 'dogtopUsuarioAtual';
  const CURRENT_ROLE_KEY = 'dogtopPerfilAtual';

  const getCurrentPage = () => document.body.dataset.page
    || location.pathname.split('/').pop()?.replace('.html', '')
    || 'dashboard';

  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeKey = (value) => normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const permissionByRole = {
    administrador: ['*'],
    admin: ['*'],
    adm: ['*'],
    financeiro: ['dashboard', 'historico', 'financas', 'relatorios', 'segunda-via'],
    vendas: ['dashboard', 'vendas', 'pedidos', 'clientes', 'historico', 'segunda-via', 'cardapio'],
    operacional: ['dashboard', 'pedidos', 'cozinha', 'historico', 'segunda-via', 'entregadores'],
    cozinha: ['dashboard', 'pedidos', 'cozinha'],
    entregador: ['dashboard', 'pedidos', 'entregadores']
  };

  const getCurrentUserRole = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
      return currentUser?.perfil || localStorage.getItem(CURRENT_ROLE_KEY) || 'Administrador';
    } catch {
      return localStorage.getItem(CURRENT_ROLE_KEY) || 'Administrador';
    }
  };

  const isAdminUser = () => ['administrador', 'admin', 'adm'].includes(String(getCurrentUserRole()).toLowerCase());

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

  const pageFromHref = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, window.location.href);
      return url.pathname.split('/').pop()?.replace('.html', '') || '';
    } catch {
      return String(href).split('/').pop()?.replace('.html', '').split('#')[0] || '';
    }
  };
  const getPageHref = (page) => {
    const normalizedPath = window.location.pathname.replace(/\\/g, '/');
    const prefix = /\/pages\/[^/]*$/i.test(normalizedPath) ? './' : './pages/';
    return `${prefix}${page}.html`;
  };

  const defaultAdminUser = () => ({
    id: 'admin-local-dogtop',
    nome: 'Administrador Dogtop',
    email: 'admin@dogtop.local',
    perfil: 'Administrador',
    setor: 'Gestao',
    status: 'Ativo',
    senhaTemporaria: 'admin123',
    criadoEm: new Date().toISOString()
  });

  const loadUsers = async () => {
    const data = await window.dataManager();
    if (!data || data.length === 0) {
      const admin = defaultAdminUser();
      await window.DataManager.saveUsuario(admin);
      return [admin];
    }
    return data;
  };

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
    } catch {
      return null;
    }
  };

  const isUserActive = (user) => ['ativo', 'active'].includes(normalizeKey(user?.status || 'Ativo'));

  const hasPageAccess = (page, user = getCurrentUser()) => {
    if (!page) return true;
    const roleKey = normalizeKey(user?.perfil || localStorage.getItem(CURRENT_ROLE_KEY) || 'Administrador');
    const allowedPages = permissionByRole[roleKey] || permissionByRole.operacional;
    return allowedPages.includes('*') || allowedPages.includes(page);
  };

  const logout = (redirect = true) => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(CURRENT_ROLE_KEY);
    if (redirect) window.location.href = getPageHref('login');
  };

  const requireAuth = async () => {
    const currentPage = getCurrentPage();
    const publicPages = ['login', 'pedidos-online', 'pagamento-pedido', 'andamento-pedido', 'cardapio'];
    if (publicPages.includes(currentPage)) return true;

    const users = await loadUsers();
    const currentUser = getCurrentUser();
    const fullUser = users.find((user) => String(user.id) === String(currentUser?.id)
      || normalizeKey(user.email) === normalizeKey(currentUser?.email));

    if (!fullUser || !isUserActive(fullUser)) {
      logout(false);
      window.location.href = `${getPageHref('login')}?redirect=${encodeURIComponent(location.pathname.split('/').pop() || 'dashboard.html')}`;
      return false;
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
      id: fullUser.id,
      nome: fullUser.nome,
      email: fullUser.email,
      perfil: fullUser.perfil,
      setor: fullUser.setor,
      status: fullUser.status,
      loginEm: currentUser?.loginEm || new Date().toISOString()
    }));
    localStorage.setItem(CURRENT_ROLE_KEY, fullUser.perfil || 'Operacional');

    if (!hasPageAccess(currentPage, fullUser)) {
      sessionStorage.setItem('dogtopAuthNotice', `Seu perfil ${fullUser.perfil} nao tem acesso a ${currentPage}.`);
      window.location.href = getPageHref('dashboard');
      return false;
    }

    return true;
  };

  const getByPath = (source, path) => String(path || '')
    .split('.')
    .reduce((current, key) => current?.[key], source);

  const getCompanyInitials = (company) => {
    const explicit = company.sigla || company.iniciais;
    if (explicit) return String(explicit).slice(0, 3).toUpperCase();
    const words = String(company.nome || 'Dogtop').trim().split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words.map((word) => word[0]).join('') : words[0]?.slice(0, 2) || 'DT').toUpperCase();
  };

  const getCompanyValue = (field, config, company) => {
    const normalizedField = String(field || '').trim();
    if (!normalizedField) return '';

    const specialValues = {
      'empresa.sigla': getCompanyInitials(company),
      sigla: getCompanyInitials(company),
      'empresa.slogan': company.slogan || 'Delivery & Retirada',
      slogan: company.slogan || 'Delivery & Retirada',
      enderecoCompleto: [company.endereco, company.complemento].filter(Boolean).join(' - '),
      'empresa.enderecoCompleto': [company.endereco, company.complemento].filter(Boolean).join(' - ')
    };

    if (Object.prototype.hasOwnProperty.call(specialValues, normalizedField)) {
      return specialValues[normalizedField];
    }

    return getByPath(config, normalizedField)
      ?? getByPath(company, normalizedField.replace(/^empresa\./, ''))
      ?? '';
  };

  const setElementValue = (element, value) => {
    if (!value) return;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      element.value = value;
      return;
    }
    if (element instanceof HTMLImageElement) {
      element.src = value;
      return;
    }
    element.textContent = value;
  };

  const applyCompanyConfig = () => {
    const config = window.DogtopConfig?.load?.() || {};
    const company = window.DogtopConfig?.getCompany?.() || config.empresa || {};
    if (!Object.keys(company).length) return;

    document.querySelectorAll('[data-company-field]').forEach((element) => {
      setElementValue(element, getCompanyValue(element.dataset.companyField, config, company));
    });

    document.querySelectorAll('[data-company-href]').forEach((element) => {
      const field = element.dataset.companyHref;
      const value = getCompanyValue(field, config, company);
      if (!value) return;
      if (field.includes('email')) element.href = `mailto:${value}`;
      if (field.includes('whatsapp') || field.includes('telefone')) element.href = `tel:${onlyDigits(value)}`;
      if (field.includes('instagram')) element.href = String(value).startsWith('http') ? value : `https://instagram.com/${String(value).replace(/^@/, '')}`;
    });

    document.querySelectorAll('.brand-title').forEach((element) => {
      element.textContent = company.nome || 'Dogtop';
    });
    document.querySelectorAll('.brand-subtitle').forEach((element) => {
      element.textContent = company.slogan || company.whatsapp || company.telefone || 'Delivery & Retirada';
    });

    document.querySelectorAll('aside h1:not([data-company-field])').forEach((element) => {
      if (/dogtop/i.test(element.textContent)) {
        element.dataset.companyField = 'empresa.nome';
        element.textContent = company.nome || 'Dogtop';
      }
    });
    document.querySelectorAll('aside > div:first-child .w-8:not([data-company-field])').forEach((element) => {
      if (/^dt$/i.test(element.textContent.trim())) {
        element.dataset.companyField = 'empresa.sigla';
        element.textContent = getCompanyInitials(company);
      }
    });
    document.querySelectorAll('aside h1 + p:not([data-company-field])').forEach((element) => {
      if (/delivery|retirada/i.test(element.textContent)) {
        element.dataset.companyField = 'empresa.slogan';
        element.textContent = company.slogan || 'Delivery & Retirada';
      }
    });

    document.querySelectorAll('.profile span, header .text-right p:last-child').forEach((element) => {
      if (/gestora|dogtop/i.test(element.textContent)) {
        element.textContent = `Gestao ${company.nome || 'Dogtop'}`;
      }
    });
    document.querySelectorAll('.profile strong, header .text-right p:first-child').forEach((element) => {
      if (/ana martins|dogtop/i.test(element.textContent)) {
        element.dataset.companyField = 'empresa.nomeResponsavel';
        element.textContent = company.nomeResponsavel || company.nome || 'Dogtop';
      }
    });

    document.title = document.title.replace(/^Dogtop/, company.nome || 'Dogtop');
  };

  const makeBrandClickable = () => {
    document.querySelectorAll('.brand').forEach((brand) => {
      if (brand.closest('a')) return;
      const link = document.createElement('a');
      link.className = `${brand.className} brand-link`;
      link.href = getPageHref('dashboard');
      link.setAttribute('aria-label', 'Voltar para a pagina principal');
      link.innerHTML = brand.innerHTML;
      brand.replaceWith(link);
    });

    document.querySelectorAll('aside > div:first-child > div:not(a)').forEach((brand) => {
      if (brand.closest('a')) return;
      const link = document.createElement('a');
      link.className = `${brand.className} hover:opacity-80 transition-opacity`;
      link.href = getPageHref('dashboard');
      link.setAttribute('aria-label', 'Voltar para a pagina principal');
      link.innerHTML = brand.innerHTML;
      brand.replaceWith(link);
    });
  };

  const normalizeNavLinks = (nav) => {
    nav.querySelectorAll('a[href]').forEach((link) => {
      if (link.getAttribute('href') === '#') return;
      const page = link.dataset.page || pageFromHref(link.getAttribute('href'));
      if (page) link.dataset.page = page;
      if (!link.classList.contains('nav-button') && nav.classList.contains('nav')) {
        link.classList.add('nav-button');
      }
    });
  };

  const navIconPaths = {
    dashboard: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    vendas: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    pedidos: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    cozinha: 'M3 10h18M7 15h10M5 6h14l-1 14H6L5 6z',
    historico: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    financas: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    cadastros: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    configuracoes: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.262 2.572-1.065z'
  };

  const iconSvg = (key) => `
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="${navIconPaths[key] || navIconPaths.dashboard}" />
      ${key === 'configuracoes' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />' : ''}
    </svg>
  `;

  const baseNavLinkClass = 'flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors';
  const submenuLinkClass = 'flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md text-sm transition-colors';

  const navGroupLinks = {
    cadastros: [
      { page: 'produtos', href: getPageHref('produtos'), label: 'Produtos' },
      { page: 'insumos', href: getPageHref('insumos'), label: 'Insumos' },
      { page: 'clientes', href: getPageHref('clientes'), label: 'Clientes' },
      { page: 'usuarios', href: getPageHref('usuarios'), label: 'Usuarios' },
      { page: 'entregadores', href: getPageHref('entregadores'), label: 'Entregadores' },
      { page: 'promocoes', href: getPageHref('promocoes'), label: 'Promocoes' },
      { page: 'cardapio', href: getPageHref('cardapio'), label: 'Cardapio' }
    ],
    financas: [
      { page: 'financas', href: getPageHref('financas'), label: 'Financas' },
      { page: 'relatorios', href: getPageHref('relatorios'), label: 'Relatorios' },
      { page: 'segunda-via', href: getPageHref('segunda-via'), label: '2a via' }
    ],
    configuracoes: [
      { page: 'configuracoes', href: getPageHref('configuracoes'), label: 'Gerais' },
      { page: 'logs', href: getPageHref('logs'), label: 'Logs' }
    ]
  };

  const navMainLinks = [
    { page: 'dashboard', href: getPageHref('dashboard'), label: 'Dashboard', icon: 'dashboard' },
    { page: 'vendas', href: getPageHref('vendas'), label: 'Vendas', icon: 'vendas' },
    { page: 'pedidos', href: getPageHref('pedidos'), label: 'Pedidos', icon: 'pedidos' },
    { page: 'cozinha', href: getPageHref('cozinha'), label: 'Cozinha', icon: 'cozinha' },
    { page: 'historico', href: getPageHref('historico'), label: 'Historico', icon: 'historico' }
  ];

  const navAdminGroups = [
    { key: 'financas', label: 'Financas', icon: 'financas' },
    { key: 'cadastros', label: 'Cadastros', icon: 'cadastros' },
    { key: 'configuracoes', label: 'Configuracoes', icon: 'configuracoes' }
  ];

  const renderSubmenuLinks = (key) => (navGroupLinks[key] || [])
    .filter((item) => item.page !== 'logs' || isAdminUser())
    .filter((item) => hasPageAccess(item.page))
    .map((item) => `
      <a href="${item.href}" data-page="${item.page}" class="${submenuLinkClass}">
        ${escapeHtml(item.label)}
      </a>
    `).join('');

  const renderNavGroup = (group) => `
    <div class="nav-group space-y-1">
      <button type="button" class="nav-group-toggle flex items-center justify-between w-full px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors" data-group="${group.key}" aria-expanded="false">
        <span class="flex items-center gap-3">
          ${iconSvg(group.icon)}
          ${escapeHtml(group.label)}
        </span>
        <svg class="w-4 h-4 text-slate-400 arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div class="pl-6 space-y-1 nav-submenu">
        ${renderSubmenuLinks(group.key)}
      </div>
    </div>
  `;

  const renderUnifiedNav = () => {
    document.querySelectorAll('aside nav').forEach((nav) => {
      nav.classList.add('dogtop-unified-nav');
      nav.innerHTML = `
        <p class="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Navegacao</p>
        ${navMainLinks.filter((item) => hasPageAccess(item.page)).map((item) => `
          <a href="${item.href}" data-page="${item.page}" class="${baseNavLinkClass}">
            ${iconSvg(item.icon)}
            ${escapeHtml(item.label)}
          </a>
        `).join('')}
        <p class="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">Administracao</p>
        ${navAdminGroups
          .filter((group) => (navGroupLinks[group.key] || []).some((item) => (item.page !== 'logs' || isAdminUser()) && hasPageAccess(item.page)))
          .map(renderNavGroup).join('')}
      `;
    });
  };

  const getNavGroupKey = (element) => {
    const text = element.textContent.toLowerCase();
    if (text.includes('cadastro')) return 'cadastros';
    if (text.includes('finan')) return 'financas';
    if (text.includes('config')) return 'configuracoes';
    return '';
  };

  const buildSubmenu = (key, currentPage) => {
    const links = (navGroupLinks[key] || [])
      .filter((item) => item.page !== 'logs' || isAdminUser())
      .filter((item) => hasPageAccess(item.page));
    const submenu = document.createElement('div');
    submenu.className = 'pl-6 space-y-1 nav-submenu';
    submenu.innerHTML = links.map((item) => `
      <a href="${item.href}" data-page="${item.page}" class="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md text-sm transition-colors ${item.page === currentPage ? 'bg-brand-50 text-brand-600 active' : ''}">
        ${escapeHtml(item.label)}
      </a>
    `).join('');
    return submenu;
  };

  const ensureLegacyMenuGroups = (nav, currentPage) => {
    nav.querySelectorAll('a[href="#"]').forEach((toggle) => {
      const key = getNavGroupKey(toggle);
      if (!key) return;

      toggle.classList.add('nav-group-toggle');
      toggle.dataset.group = key;
      toggle.setAttribute('role', 'button');
      toggle.setAttribute('aria-expanded', 'false');

      const parent = toggle.parentElement;
      const hasGroupParent = parent?.classList.contains('nav-group');
      const existingSubmenu = hasGroupParent
        ? parent.querySelector(':scope > .nav-submenu')
        : toggle.nextElementSibling?.classList?.contains('nav-submenu') ? toggle.nextElementSibling : null;

      if (hasGroupParent && existingSubmenu) return;

      const group = document.createElement('div');
      group.className = 'nav-group space-y-1';
      const submenu = existingSubmenu || buildSubmenu(key, currentPage);
      toggle.replaceWith(group);
      group.appendChild(toggle);
      group.appendChild(submenu);
    });
  };

  const ensureGroupClasses = (toggle) => {
    toggle.classList.add('nav-group-toggle');
    const submenu = toggle.parentElement?.querySelector(':scope > .nav-submenu')
      || toggle.nextElementSibling?.classList?.contains('nav-submenu') && toggle.nextElementSibling;
    const group = toggle.closest('.nav-group') || toggle.parentElement;
    if (group) group.classList.add('nav-group');
    if (submenu) submenu.classList.add('nav-submenu');
    return { group, submenu };
  };

  const setGroupOpen = (group, open) => {
    if (!group) return;
    const toggle = group.querySelector('.nav-group-toggle');
    const submenu = group.querySelector('.nav-submenu');
    group.classList.toggle('open', open);
    toggle?.classList.toggle('active', open && !!submenu?.querySelector('.active, [aria-current="page"]'));
    toggle?.setAttribute('aria-expanded', String(open));
    if (submenu) submenu.hidden = !open;
  };

  const setupNavGroups = () => {
    const currentPage = getCurrentPage();
    const navs = document.querySelectorAll('nav, .nav');

    navs.forEach((nav) => {
      normalizeNavLinks(nav);
      ensureLegacyMenuGroups(nav, currentPage);

      nav.querySelectorAll('[data-page="logs"]').forEach((link) => {
        if (!isAdminUser()) link.remove();
      });

      nav.querySelectorAll('button[data-group], .nav-group-toggle').forEach((toggle) => {
        const { group, submenu } = ensureGroupClasses(toggle);
        const groupPages = Array.from(submenu?.querySelectorAll('[data-page]') || []).map((item) => item.dataset.page);
        const hasCurrentPage = groupPages.includes(currentPage);
        setGroupOpen(group, hasCurrentPage);

        toggle.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const isOpen = group?.classList.contains('open');
          document.querySelectorAll('.nav-group').forEach((candidate) => {
            if (candidate !== group && !candidate.querySelector(`[data-page="${currentPage}"]`)) {
              setGroupOpen(candidate, false);
            }
          });
          setGroupOpen(group, !isOpen);
        });
      });

      nav.querySelectorAll('[data-page]').forEach((link) => {
        const isActive = link.dataset.page === currentPage;
        link.classList.toggle('active', isActive);
        link.classList.toggle('bg-brand-50', isActive);
        link.classList.toggle('text-brand-600', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
          setGroupOpen(link.closest('.nav-group'), true);
        } else if (link.getAttribute('aria-current') === 'page') {
          link.removeAttribute('aria-current');
        }
      });
    });
  };

  const setupMobileMenu = () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!menuToggle || !sidebar) return;

    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      sidebar.classList.toggle('open');
    });

    sidebar.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', () => {
        if (link.classList.contains('nav-group-toggle') || link.getAttribute('href') === '#') return;
        menuToggle.classList.remove('active');
        sidebar.classList.remove('open');
      });
    });

    document.addEventListener('click', (event) => {
      if (!sidebar.contains(event.target) && !menuToggle.contains(event.target) && sidebar.classList.contains('open')) {
        menuToggle.classList.remove('active');
        sidebar.classList.remove('open');
      }
    });
  };

  const pagesMeta = {
    dashboard: {
      title: 'Dashboard Dogtop',
      subtitle: 'Visao geral da operacao Dogtop com foco em pedidos, entrega, retirada e faturamento.'
    },
    vendas: {
      title: 'Vendas Dogtop',
      subtitle: 'Monitoramento comercial com foco em crescimento, metas e canais.'
    },
    pedidos: {
      title: 'Pedidos',
      subtitle: 'Acompanhamento do fluxo operacional, pagamentos e logistica.'
    },
    cozinha: {
      title: 'Cozinha',
      subtitle: 'Fila operacional dos pedidos online e controle de preparo.'
    },
    produtos: {
      title: 'Produtos',
      subtitle: 'Gestao de catalogo, estoque e performance dos itens.'
    },
    insumos: {
      title: 'Insumos',
      subtitle: 'Controle de estoque de preparo, receitas e baixas automaticas.'
    },
    clientes: {
      title: 'Clientes',
      subtitle: 'Relacionamento, segmentacao, recorrencia e valor de base.'
    },
    historico: {
      title: 'Historico',
      subtitle: 'Linha do tempo completa das movimentacoes da operacao.'
    },
    'segunda-via': {
      title: '2a via de recibo',
      subtitle: 'Localize um pedido pelo numero e reimprima o recibo termico.'
    },
    financas: {
      title: 'Financas',
      subtitle: 'Controle financeiro com visao de vendas, recebimentos e compromissos.'
    },
    relatorios: {
      title: 'Relatorios',
      subtitle: 'Analises gerenciais e exportacoes para tomada de decisao.'
    },
    usuarios: {
      title: 'Usuarios',
      subtitle: 'Gestao de acessos, papeis e permissoes administrativas.'
    },
    configuracoes: {
      title: 'Configuracoes',
      subtitle: 'Preferencias, integracoes e parametros globais do sistema.'
    },
    entregadores: {
      title: 'Entregadores',
      subtitle: 'Monitoramento de equipe, rotas e status de entrega.'
    },
    promocoes: {
      title: 'Promocoes',
      subtitle: 'Gestao de campanhas, descontos e acoes de marketing comercial.'
    },
    cardapio: {
      title: 'Cardapio',
      subtitle: 'Cardapio publico gerado com os produtos cadastrados.'
    },
    logs: {
      title: 'Logs de Auditoria',
      subtitle: 'Rastreamento de eventos importantes do sistema, pedidos, produtos e impressoes.'
    }
  };

  const updatePageHeader = () => {
    const meta = pagesMeta[getCurrentPage()];
    if (!meta) return;
    const company = window.DogtopConfig?.getCompany?.() || {};
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    if (pageTitle && /dogtop/i.test(meta.title)) {
      pageTitle.textContent = meta.title.replace(/Dogtop/i, company.nome || 'Dogtop');
    } else if (pageTitle && !pageTitle.textContent.trim()) {
      pageTitle.textContent = meta.title;
    }
    if (pageSubtitle && !pageSubtitle.textContent.trim()) pageSubtitle.textContent = meta.subtitle;
  };

  const getInitials = (name) => {
    const parts = normalizeText(name).split(/\s+/).filter(Boolean);
    if (!parts.length) return 'DT';
    return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase();
  };

  const applyCurrentUserToChrome = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    document.querySelectorAll('header .text-right p:first-child').forEach((element) => {
      element.textContent = currentUser.nome || currentUser.email || 'Usuario';
    });
    document.querySelectorAll('header .text-right p:last-child').forEach((element) => {
      element.textContent = currentUser.perfil || 'Operacional';
    });
    document.querySelectorAll('header .w-9.h-9.rounded-full').forEach((element) => {
      element.textContent = getInitials(currentUser.nome || currentUser.email);
    });

    document.querySelectorAll('header').forEach((header) => {
      if (header.querySelector('[data-auth-action="logout"]')) return;
      const actions = header.querySelector('.flex.items-center.gap-4');
      if (!actions) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.authAction = 'logout';
      button.className = 'hidden sm:inline-flex px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md transition-colors';
      button.textContent = 'Sair';
      button.addEventListener('click', () => logout(true));
      actions.prepend(button);
    });
  };

  const enforceNavigationPermissions = () => {
    document.querySelectorAll('a[data-page]').forEach((link) => {
      if (hasPageAccess(link.dataset.page)) return;
      link.remove();
    });

    const notice = sessionStorage.getItem('dogtopAuthNotice');
    if (notice) {
      sessionStorage.removeItem('dogtopAuthNotice');
      window.setTimeout(() => window.alert(notice), 150);
    }
  };

  const setupInPageNavigation = () => {
    const pages = document.querySelectorAll('.page');
    if (!pages.length) return;

    document.querySelectorAll('[data-page]').forEach((button) => {
      button.addEventListener('click', () => {
        const pageId = button.dataset.page;
        if (!pageId || !pagesMeta[pageId]) return;

        document.querySelectorAll('[data-page]').forEach((item) => item.classList.remove('active'));
        pages.forEach((page) => page.classList.remove('active'));
        button.classList.add('active');

        const pageElement = document.getElementById(pageId);
        if (pageElement) {
          pageElement.classList.add('active');
          const pageTitle = document.getElementById('page-title');
          const pageSubtitle = document.getElementById('page-subtitle');
          if (pageTitle) pageTitle.textContent = pagesMeta[pageId].title;
          if (pageSubtitle) pageSubtitle.textContent = pagesMeta[pageId].subtitle;
        }
      });
    });
  };

  const setupTabs = () => {
    document.querySelectorAll('.tabs').forEach((tabGroup) => {
      const buttons = tabGroup.querySelectorAll('.tab-btn');
      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          const tabId = button.dataset.tab;
          const panelContainer = tabGroup.parentElement;
          buttons.forEach((btn) => btn.classList.remove('active'));
          panelContainer.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
          button.classList.add('active');
          const target = panelContainer.querySelector(`#${tabId}`);
          if (target) target.classList.add('active');
        });
      });
    });
  };

  const setupUserRegistration = () => {
    if (getCurrentPage() === 'usuarios') return;

    const userRegistrationForm = document.getElementById('user-registration-form');
    const userFeedback = document.getElementById('user-feedback');
    const userRecords = document.getElementById('user-records');
    const userEmptyState = document.getElementById('user-empty-state');

    if (!userRegistrationForm) return;

    userRegistrationForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!userRegistrationForm.reportValidity()) return;

      const formData = new FormData(userRegistrationForm);
      const senha = formData.get('senha');
      const confirmarSenha = formData.get('confirmarSenha');

      if (senha !== confirmarSenha) {
        if (userFeedback) {
          userFeedback.textContent = 'As senhas nao conferem. Verifique os campos e tente novamente.';
          userFeedback.className = 'user-feedback error';
        }
        return;
      }

      const userToSave = {
        nome: formData.get('nome'),
        email: formData.get('email'),
        perfil: formData.get('perfil'),
        setor: formData.get('setor'),
        status: formData.get('status') || 'Ativo',
        senhaTemporaria: senha,
        criadoEm: new Date().toISOString()
      };
      await window.DataManager.saveUsuario(userToSave);

      const card = document.createElement('div');
      card.className = 'user-record';
      card.innerHTML = `
        <div class="user-record__header">
          <h4>${escapeHtml(formData.get('nome'))}</h4>
          <span class="badge ok">${escapeHtml(formData.get('status'))}</span>
        </div>
        <div class="user-record__meta">
          <div><small>Email</small><strong>${escapeHtml(formData.get('email'))}</strong></div>
          <div><small>Perfil</small><strong>${escapeHtml(formData.get('perfil'))}</strong></div>
          <div><small>Setor</small><strong>${escapeHtml(formData.get('setor'))}</strong></div>
          <div><small>Acesso</small><strong>Liberado para cadastro</strong></div>
        </div>
      `;

      if (userEmptyState) userEmptyState.style.display = 'none';
      if (userRecords) userRecords.prepend(card);
      window.DogtopAudit?.log({
        modulo: 'Usuarios',
        acao: 'Usuario cadastrado',
        entidade: String(formData.get('email') || ''),
        detalhe: `${formData.get('nome')} cadastrado com perfil ${formData.get('perfil')}.`,
        severidade: formData.get('perfil') === 'Administrador' ? 'alerta' : 'info',
        dados: { perfil: formData.get('perfil'), setor: formData.get('setor'), status: formData.get('status') }
      });
      if (userFeedback) {
        userFeedback.textContent = 'Usuario cadastrado com sucesso.';
        userFeedback.className = 'user-feedback success';
      }
      userRegistrationForm.reset();
    });
  };

  const renderWeeklyPromotions = async () => {
    const promoSection = document.getElementById('weekly-promo-section');
    const promoGrid = document.getElementById('weekly-promo-grid');

    if (!promoSection || !promoGrid) return;

    const currencyFormatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    const normalizeNumber = (value) => {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
    };
    
    const products = await window.DataManager.getProdutos() || [];

    const promotionalProducts = products
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
      promoSection.classList.add('hidden');
      return;
    }

    promoGrid.innerHTML = promotionalProducts.map((product) => {
      const thumb = product.imagem
        ? `<img src="${escapeHtml(product.imagem)}" alt="${escapeHtml(product.nome)}" class="w-full h-full object-cover rounded-md">`
        : `<div class="w-full h-full bg-slate-200 text-slate-500 flex items-center justify-center text-xl font-bold rounded-md">${escapeHtml(product.nome.slice(0, 2).toUpperCase())}</div>`;
      const description = product.descricao || 'Oferta ativa no catalogo Dogtop.';

      return `
        <article class="bg-white rounded-lg p-4 shadow-sm flex items-center space-x-4 border border-slate-100">
          <div class="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-slate-100">
            ${thumb}
          </div>
          <div class="flex-1 min-w-0">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-1">
              Oferta da semana
            </span>
            <h4 class="text-base font-semibold text-slate-800 truncate">${escapeHtml(product.nome)}</h4>
            <p class="text-sm text-slate-500 line-clamp-2">${escapeHtml(description)}</p>
            <div class="flex items-center mt-2 space-x-2">
              <span class="text-sm text-slate-400 line-through">${currencyFormatter.format(product.preco)}</span>
              <strong class="text-lg font-bold text-brand-600">${currencyFormatter.format(product.precoPromocional)}</strong>
            </div>
          </div>
        </article>
      `;
    }).join('');

    promoSection.classList.remove('hidden');
  };

  const init = async () => {
    if (!(await requireAuth())) return;
    makeBrandClickable();
    applyCompanyConfig();
    renderUnifiedNav();
    enforceNavigationPermissions();
    setupNavGroups();
    setupMobileMenu();
    updatePageHeader();
    applyCurrentUserToChrome();
    setupInPageNavigation();
    setupTabs();
    setupUserRegistration();
    if (getCurrentPage() === 'dashboard') await renderWeeklyPromotions();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
