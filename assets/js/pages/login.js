document.body.dataset.page = 'login';

(() => {
  const CURRENT_USER_KEY = 'dogtopUsuarioAtual';
  const CURRENT_ROLE_KEY = 'dogtopPerfilAtual';

  const form = document.getElementById('login-form');
  const feedback = document.getElementById('login-feedback');

  if (!form) return;

  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeKey = (value) => normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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

  let users = [];

  const loadUsers = async () => {
    const data = await window.DogtopData.getUsuarios();
    if (!data || data.length === 0) {
      const admin = defaultAdminUser();
      users = [admin];
      await window.DogtopData.saveUsuario(admin);
    } else {
      users = data;
    }
  };

  const getPassword = (user) => String(user?.senha || user?.senhaTemporaria || user?.password || '');
  const isActive = (user) => normalizeKey(user?.status || 'Ativo') === 'ativo';

  const setFeedback = (message, type = 'error') => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove('hidden', 'text-red-600', 'text-emerald-600');
    feedback.classList.add(type === 'success' ? 'text-emerald-600' : 'text-red-600');
  };

  const getRedirectPage = () => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('redirect') || 'dashboard.html';
    const safeFile = requested.split('/').pop()?.replace(/[^\w.-]/g, '') || 'dashboard.html';
    return safeFile.endsWith('.html') ? safeFile : `${safeFile}.html`;
  };

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
    } catch {
      return null;
    }
  })();

  const init = async () => {
    await loadUsers();

    if (currentUser) {
      const user = users.find((item) => normalizeKey(item.email) === normalizeKey(currentUser.email));
      if (user && isActive(user)) window.location.href = `./${getRedirectPage()}`;
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    await loadUsers();

    const formData = new FormData(form);
    const email = normalizeKey(formData.get('email'));
    const password = String(formData.get('senha') || '');
    const user = users.find((item) => normalizeKey(item.email) === email);

    if (!user || getPassword(user) !== password) {
      setFeedback('Email ou senha incorretos.');
      return;
    }

    if (!isActive(user)) {
      setFeedback(`Usuario ${user.status}. Solicite liberacao ao administrador.`);
      return;
    }

    user.ultimoLoginEm = new Date().toISOString();
    await window.DogtopData.saveUsuario(user);

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      setor: user.setor,
      status: user.status,
      loginEm: user.ultimoLoginEm
    }));
    localStorage.setItem(CURRENT_ROLE_KEY, user.perfil || 'Operacional');
    setFeedback('Login realizado. Redirecionando...', 'success');
    window.setTimeout(() => {
      window.location.href = `./${getRedirectPage()}`;
    }, 250);
  });

  init();
})();
