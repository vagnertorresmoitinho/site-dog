(() => {
  const STORAGE_KEY = 'dogtopAuditLogs';
  const MAX_LOGS = 1000;

  const safeParse = (value, fallback) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  const getLogs = () => safeParse(localStorage.getItem(STORAGE_KEY) || '[]', []);

  const saveLogs = (logs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  };

  const getUserLabel = () => {
    const profileName = document.querySelector('.profile strong')?.textContent?.trim();
    return profileName || 'Sistema';
  };

  const normalizeSeverity = (value) => {
    const severity = String(value || 'info').toLowerCase();
    return ['info', 'alerta', 'critico'].includes(severity) ? severity : 'info';
  };

  const log = ({ modulo = 'Sistema', acao = 'Evento', entidade = '', detalhe = '', dados = null, severidade = 'info' } = {}) => {
    const logs = getLogs();
    const record = {
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      dataHora: new Date().toISOString(),
      usuario: getUserLabel(),
      severidade: normalizeSeverity(severidade),
      modulo,
      acao,
      entidade,
      detalhe,
      dados
    };

    logs.unshift(record);
    saveLogs(logs);
    return record;
  };

  window.DogtopAudit = {
    log,
    list: getLogs,
    clear: () => saveLogs([]),
    storageKey: STORAGE_KEY
  };
})();
