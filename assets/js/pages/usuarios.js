document.body.dataset.page = 'usuarios';

(() => {
  const STORAGE_KEY = 'dogtopUsuarios';

  const form = document.getElementById('user-registration-form');
  const feedback = document.getElementById('user-feedback');
  const records = document.getElementById('user-records');
  const emptyState = document.getElementById('user-empty-state');
  const countElement = document.getElementById('user-count');
  const exportButton = document.getElementById('user-export');
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('dogtopUsuarioAtual') || 'null');
    } catch {
      return null;
    }
  })();

  if (!form || !records) return;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const normalizeText = (value) => String(value ?? '').trim();
  const createId = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `usuario-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  let users = [];

  const loadUsers = async () => {
    const data = await window.DogtopData.getUsuarios();
    if (!data || data.length === 0) {
      users = [
        {
          id: 'admin-local-dogtop',
          nome: 'Administrador Dogtop',
          email: 'admin@dogtop.local',
          perfil: 'Administrador',
          setor: 'Gestao',
          status: 'Ativo',
          senhaTemporaria: 'admin123',
          criadoEm: new Date().toISOString()
        }
      ];
      await window.DogtopData.saveUsuario(users[0]);
    } else {
      users = data;
    }
  };

  const setFeedback = (message, type = 'success') => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove('hidden', 'text-emerald-600', 'text-red-600', 'text-amber-600');
    feedback.classList.add(type === 'error' ? 'text-red-600' : type === 'warning' ? 'text-amber-600' : 'text-emerald-600');
  };

  const getStatusClass = (status) => {
    const normalized = normalizeText(status).toLowerCase();
    if (normalized === 'ativo') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (normalized === 'bloqueado') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const renderUsers = () => {
    const sorted = [...users].sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));

    if (emptyState) emptyState.style.display = sorted.length ? 'none' : 'block';
    if (countElement) countElement.textContent = `${sorted.length} ${sorted.length === 1 ? 'usuario persistido' : 'usuarios persistidos'}.`;

    records.querySelectorAll('[data-user-card]').forEach((card) => card.remove());

    sorted.forEach((user) => {
      const card = document.createElement('article');
      card.className = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3';
      card.dataset.userCard = user.id;
      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="font-bold text-slate-900 leading-tight">${escapeHtml(user.nome)}</h4>
            <p class="text-xs text-slate-500 mt-1">${escapeHtml(user.email)}</p>
          </div>
          <span class="shrink-0 px-2 py-1 rounded-md border text-[10px] font-black uppercase ${getStatusClass(user.status)}">
            ${escapeHtml(user.status)}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-lg bg-slate-50 p-2">
            <span class="block text-slate-400 font-semibold">Perfil</span>
            <strong class="text-slate-700">${escapeHtml(user.perfil)}</strong>
          </div>
          <div class="rounded-lg bg-slate-50 p-2">
            <span class="block text-slate-400 font-semibold">Setor</span>
            <strong class="text-slate-700">${escapeHtml(user.setor)}</strong>
          </div>
        </div>
        <div class="flex gap-2">
          <button type="button" class="flex-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700" data-user-action="toggle" data-user-id="${escapeHtml(user.id)}">
            ${user.status === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}
          </button>
          <button type="button" class="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700" data-user-action="delete" data-user-id="${escapeHtml(user.id)}">
            Excluir
          </button>
        </div>
      `;
      records.appendChild(card);
    });
  };

  const formToUser = () => {
    const formData = new FormData(form);
    return {
      id: createId(),
      nome: normalizeText(formData.get('nome')),
      email: normalizeText(formData.get('email')).toLowerCase(),
      perfil: normalizeText(formData.get('perfil')),
      setor: normalizeText(formData.get('setor')),
      status: normalizeText(formData.get('status')) || 'Ativo',
      senhaTemporaria: normalizeText(formData.get('senha')),
      trocaSenhaObrigatoria: true,
      criadoEm: new Date().toISOString()
    };
  };

  const exportCsv = () => {
    const rows = [
      ['Nome', 'Email', 'Perfil', 'Setor', 'Status', 'Criado em'],
      ...users.map((user) => [
        user.nome,
        user.email,
        user.perfil,
        user.setor,
        user.status,
        user.criadoEm
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios-dogtop-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const password = form.elements.namedItem('senha')?.value || '';
    const confirmation = form.elements.namedItem('confirmarSenha')?.value || '';
    if (password !== confirmation) {
      setFeedback('As senhas nao conferem. Verifique os campos e tente novamente.', 'error');
      return;
    }

    const user = formToUser();
    if (users.some((item) => item.email === user.email)) {
      setFeedback('Ja existe um usuario cadastrado com este email.', 'error');
      return;
    }

    const savedUser = await window.DogtopData.saveUsuario(user);
    users.unshift(savedUser);
    renderUsers();
    form.reset();
    setFeedback('Usuario salvo com sucesso na nuvem.');

    window.DogtopAudit?.log({
      modulo: 'Usuarios',
      acao: 'Usuario cadastrado',
      entidade: user.email,
      detalhe: `${user.nome} cadastrado com perfil ${user.perfil}.`,
      severidade: user.perfil === 'Administrador' ? 'alerta' : 'info',
      dados: { usuarioId: user.id, perfil: user.perfil, setor: user.setor, status: user.status }
    });
  });

  records.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-user-action]');
    if (!button) return;

    const user = users.find((item) => item.id === button.dataset.userId);
    if (!user) return;

    if (button.dataset.userAction === 'toggle') {
      if (String(user.id) === String(currentUser?.id)) {
        setFeedback('Voce nao pode bloquear o usuario que esta logado agora.', 'error');
        return;
      }
      user.status = user.status === 'Bloqueado' ? 'Ativo' : 'Bloqueado';
      user.atualizadoEm = new Date().toISOString();
      await window.DogtopData.saveUsuario(user);
      renderUsers();
      setFeedback(`Usuario ${user.status === 'Bloqueado' ? 'bloqueado' : 'desbloqueado'}.`, 'warning');
      return;
    }

    if (button.dataset.userAction === 'delete') {
      if (String(user.id) === String(currentUser?.id)) {
        setFeedback('Voce nao pode excluir o usuario que esta logado agora.', 'error');
        return;
      }
      if (!window.confirm(`Excluir o usuario ${user.nome}?`)) return;
      users = users.filter((item) => item.id !== user.id);
      // Como não criamos um endpoint de DELETE na API, atualizamos apenas o localStorage como fallback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      renderUsers();
      setFeedback('Usuario excluido.', 'warning');
    }
  });

  exportButton?.addEventListener('click', exportCsv);

  window.DogtopAudit?.log({
    modulo: 'Usuarios',
    acao: 'Acesso a tela',
    entidade: 'Usuarios',
    detalhe: 'Tela de usuarios aberta para gestao de acessos.',
    severidade: 'info'
  });

  loadUsers().then(() => {
    renderUsers();
  });
})();
