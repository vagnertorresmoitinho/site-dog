document.body.dataset.page = 'logs';

(() => {
  const tableBody = document.getElementById('audit-table-body');
  const emptyState = document.getElementById('audit-empty');
  const searchInput = document.getElementById('audit-search');
  const moduleFilter = document.getElementById('audit-module');
  const periodFilter = document.getElementById('audit-period');
  const severityFilter = document.getElementById('audit-severity');
  const refreshButton = document.getElementById('audit-refresh');
  const exportButton = document.getElementById('audit-export');
  const clearButton = document.getElementById('audit-clear');

  if (!tableBody || !window.DogtopAudit) return;

  const getCurrentUserRole = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('dogtopUsuarioAtual') || 'null');
      return currentUser?.perfil || localStorage.getItem('dogtopPerfilAtual') || 'Administrador';
    } catch {
      return localStorage.getItem('dogtopPerfilAtual') || 'Administrador';
    }
  };

  const isAdminUser = ['administrador', 'admin', 'adm'].includes(String(getCurrentUserRole()).toLowerCase());
  if (!isAdminUser) {
    const page = document.getElementById('logs');
    if (page) {
      page.innerHTML = `
        <div class="card">
          <div class="card-inner audit-denied">
            <div class="section-title">
              <div>
                <h2>Acesso restrito</h2>
                <p>Esta tela de auditoria e exclusiva para usuarios com perfil Administrador.</p>
              </div>
            </div>
            <a class="action-btn primary" href="./configuracoes.html">Voltar para configuracoes</a>
          </div>
        </div>
      `;
    }
    window.DogtopAudit.log({
      modulo: 'Auditoria',
      acao: 'Acesso negado',
      entidade: 'Logs',
      detalhe: `Perfil ${getCurrentUserRole()} tentou acessar os logs.`,
      severidade: 'alerta'
    });
    return;
  }

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const normalize = (value) => String(value ?? '').trim().toLowerCase();
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data invalida' : date.toLocaleString('pt-BR');
  };
  const getLogs = () => window.DogtopAudit.list();

  const getPeriodStart = () => {
    const value = periodFilter?.value || 'todos';
    const now = new Date();
    if (value === 'hoje') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (value === '7dias') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (value === '30dias') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return null;
  };

  const getFilteredLogs = () => {
    const term = normalize(searchInput?.value);
    const selectedModule = moduleFilter?.value || 'todos';
    const selectedSeverity = severityFilter?.value || 'todos';
    const periodStart = getPeriodStart();

    return getLogs().filter((log) => {
      const moduleMatches = selectedModule === 'todos' || log.modulo === selectedModule;
      const severityMatches = selectedSeverity === 'todos' || (log.severidade || 'info') === selectedSeverity;
      const dateMatches = !periodStart || new Date(log.dataHora) >= periodStart;
      const text = [log.usuario, log.severidade, log.modulo, log.acao, log.entidade, log.detalhe].map(normalize).join(' ');
      return moduleMatches && severityMatches && dateMatches && (!term || text.includes(term));
    });
  };

  const renderModules = () => {
    const current = moduleFilter?.value || 'todos';
    const modules = [...new Set(getLogs().map((log) => log.modulo).filter(Boolean))].sort();
    moduleFilter.innerHTML = `
      <option value="todos">Todos os modulos</option>
      ${modules.map((modulo) => `<option value="${escapeHtml(modulo)}">${escapeHtml(modulo)}</option>`).join('')}
    `;
    moduleFilter.value = modules.includes(current) ? current : 'todos';
  };

  const renderStats = (logs) => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const moduleCount = logs.reduce((acc, log) => {
      acc[log.modulo] = (acc[log.modulo] || 0) + 1;
      return acc;
    }, {});
    const topModule = Object.entries(moduleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    document.getElementById('audit-total').textContent = String(getLogs().length);
    document.getElementById('audit-today').textContent = String(getLogs().filter((log) => String(log.dataHora).startsWith(todayKey)).length);
    document.getElementById('audit-top-module').textContent = topModule;
  };

  const renderTable = () => {
    renderModules();
    const logs = getFilteredLogs();
    renderStats(logs);

    tableBody.innerHTML = logs.map((log) => `
      <tr>
        <td>${escapeHtml(formatDate(log.dataHora))}</td>
        <td>${escapeHtml(log.usuario)}</td>
        <td><span class="badge ${log.severidade === 'critico' ? 'pending' : log.severidade === 'alerta' ? 'pending' : 'info'}">${escapeHtml(log.severidade || 'info')}</span></td>
        <td><span class="badge info">${escapeHtml(log.modulo)}</span></td>
        <td>${escapeHtml(log.acao)}</td>
        <td>${escapeHtml(log.entidade)}</td>
        <td>${escapeHtml(log.detalhe)}</td>
      </tr>
    `).join('');

    if (emptyState) emptyState.style.display = logs.length ? 'none' : 'block';
  };

  const exportCsv = () => {
    const rows = getFilteredLogs();
    const header = ['Data/Hora', 'Usuário', 'Severidade', 'Módulo', 'Ação', 'Entidade', 'Detalhe'];
    const csvRows = [
      header,
      ...rows.map((log) => [formatDate(log.dataHora), log.usuario, log.severidade || 'info', log.modulo, log.acao, log.entidade, log.detalhe])
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dogtop-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  searchInput?.addEventListener('input', renderTable);
  moduleFilter?.addEventListener('change', renderTable);
  periodFilter?.addEventListener('change', renderTable);
  severityFilter?.addEventListener('change', renderTable);
  refreshButton?.addEventListener('click', renderTable);
  exportButton?.addEventListener('click', exportCsv);
  clearButton?.addEventListener('click', () => {
    if (!window.confirm('Deseja limpar todos os logs de auditoria?')) return;
    window.DogtopAudit.clear();
    window.DogtopAudit.log({ modulo: 'Auditoria', acao: 'Limpeza de logs', detalhe: 'Logs anteriores foram removidos.', severidade: 'critico' });
    renderTable();
  });

  window.DogtopAudit.log({ modulo: 'Auditoria', acao: 'Acesso a tela', detalhe: 'Tela de logs de auditoria aberta.', severidade: 'info' });
  renderTable();
})();
