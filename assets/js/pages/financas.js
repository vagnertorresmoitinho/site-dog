document.body.dataset.page = 'financas';

(() => {
  const PAYABLES_STORAGE_KEY = 'dogtopContasPagar';
  const tableBody = document.getElementById('accounts-payable-body');

  const formatter = window.DogtopConfig?.getCurrencyFormatter?.() || new Intl.NumberFormat('pt-BR', {
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
    return Number.isFinite(numberValue) ? numberValue : 0;
  };
  const readPayables = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PAYABLES_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };
  const statusClass = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('program')) return 'bg-sky-50 text-sky-700 border border-sky-200';
    if (normalized.includes('pago')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  const renderGeneratedPayables = () => {
    if (!tableBody) return;
    const generated = readPayables()
      .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));

    tableBody.querySelectorAll('[data-generated-payable]').forEach((row) => row.remove());

    if (!generated.length) return;

    tableBody.insertAdjacentHTML('afterbegin', generated.map((payable) => `
      <tr class="hover:bg-slate-50 transition-colors group bg-brand-50/30" data-generated-payable="${escapeHtml(payable.id)}">
        <td class="px-6 py-4">
          <strong class="block font-bold text-slate-800 text-sm">${escapeHtml(payable.descricao || 'Conta a pagar')}</strong>
          ${payable.quantidadePedidos ? `<span class="block text-xs text-slate-500 mt-0.5">${escapeHtml(payable.quantidadePedidos)} pedido(s) vinculados</span>` : ''}
        </td>
        <td class="px-6 py-4 text-sm font-medium text-slate-600">${escapeHtml(formatDate(payable.vencimento))}</td>
        <td class="px-6 py-4 text-sm text-slate-500">${escapeHtml(payable.categoria || 'Operacional')}</td>
        <td class="px-6 py-4 text-sm font-bold text-slate-800 text-right">${formatter.format(normalizeNumber(payable.valor))}</td>
        <td class="px-6 py-4 text-center">
          <span class="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusClass(payable.status)}">${escapeHtml(payable.status || 'Pendente')}</span>
        </td>
      </tr>
    `).join(''));
  };

  renderGeneratedPayables();

  window.DogtopAudit?.log({
    modulo: 'Financas',
    acao: 'Acesso a tela',
    entidade: 'Financas',
    detalhe: 'Tela de financas aberta para consulta.',
    severidade: 'info'
  });
})();
