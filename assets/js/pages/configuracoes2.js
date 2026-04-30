document.body.dataset.page = 'configuracoes2';

(() => {
  const form = document.getElementById('settings-form');
  const feedback = document.getElementById('settings-feedback');
  const resetButton = document.getElementById('settings-reset');
  const exportBackupButton = document.getElementById('settings-export-backup');
  const importBackupButton = document.getElementById('settings-import-backup');
  const importFileInput = document.getElementById('settings-import-file');
  const logoFileInput = document.getElementById('settings-logo-file');
  const logoClearButton = document.getElementById('settings-logo-clear');
  const logoPreview = document.getElementById('settings-logo-preview');
  const mapButton = document.getElementById('settings-map-button');
  const paymentSummary = document.getElementById('settings2-payment-summary');

  if (!form || !window.DogtopConfig) return;

  const normalizeText = (value) => String(value ?? '').trim();
  const normalizeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
  };
  const isChecked = (name) => Boolean(form.elements.namedItem(name)?.checked);
  const setCheckbox = (name, value) => {
    const element = form.elements.namedItem(name);
    if (element) element.checked = Boolean(value);
  };
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const getFormatter = (config) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: config?.moeda?.codigo || 'BRL',
    minimumFractionDigits: config?.moeda?.casasDecimais === false ? 0 : 2,
    maximumFractionDigits: config?.moeda?.casasDecimais === false ? 0 : 2
  });

  const setLogoPreview = (src) => {
    if (!logoPreview) return;
    logoPreview.innerHTML = src ? `<img src="${src}" alt="Logotipo da loja">` : 'Logotipo';
  };

  const readConfigFromForm = () => {
    const moedaCodigo = normalizeText(form.elements.namedItem('moedaCodigo')?.value) || 'BRL';
    return {
      empresa: {
        nome: normalizeText(form.elements.namedItem('empresaNome')?.value),
        nomeRecibo: normalizeText(form.elements.namedItem('empresaNomeRecibo')?.value),
        nomeResponsavel: normalizeText(form.elements.namedItem('empresaResponsavel')?.value),
        documento: normalizeText(form.elements.namedItem('empresaDocumento')?.value),
        endereco: normalizeText(form.elements.namedItem('empresaEndereco')?.value),
        complemento: normalizeText(form.elements.namedItem('empresaComplemento')?.value),
        email: normalizeText(form.elements.namedItem('empresaEmail')?.value),
        whatsapp: normalizeText(form.elements.namedItem('empresaWhatsapp')?.value),
        telefone: normalizeText(form.elements.namedItem('empresaTelefone')?.value),
        instagram: normalizeText(form.elements.namedItem('empresaInstagram')?.value),
        logotipo: normalizeText(form.elements.namedItem('empresaLogotipo')?.value),
        cabecalhoRecibo: normalizeText(form.elements.namedItem('reciboCabecalho')?.value),
        rodapeRecibo: normalizeText(form.elements.namedItem('reciboRodape')?.value)
      },
      moeda: {
        codigo: moedaCodigo,
        simbolo: moedaCodigo === 'USD' ? '$' : 'R$',
        casasDecimais: form.elements.namedItem('moedaCasasDecimais')?.value !== 'nao'
      },
      pedidos: {
        taxaEntrega: normalizeNumber(form.elements.namedItem('taxaEntrega')?.value),
        status: {
          pendente: isChecked('statusPendente'),
          confirmado: isChecked('statusConfirmado'),
          pago: isChecked('statusPago'),
          producao: isChecked('statusProducao'),
          pronto: isChecked('statusPronto'),
          saiuEntrega: isChecked('statusSaiuEntrega'),
          prontoRetirar: isChecked('statusProntoRetirar')
        }
      },
      recibo: {
        loja: {
          logotipo: isChecked('reciboLogo'),
          nome: isChecked('reciboNomeLoja'),
          documento: isChecked('reciboCnpj'),
          telefone: isChecked('reciboTelefone'),
          whatsapp: isChecked('reciboWhatsapp'),
          endereco: isChecked('reciboEndereco')
        },
        cliente: {
          nome: isChecked('reciboClienteNome'),
          telefone: isChecked('reciboClienteTelefone'),
          endereco: isChecked('reciboClienteEndereco')
        }
      },
      pagamentos: {
        pix: isChecked('pagamentoPix'),
        dinheiro: isChecked('pagamentoDinheiro'),
        cartaoDebito: isChecked('pagamentoDebito'),
        cartaoCredito: isChecked('pagamentoCredito')
      },
      fiado: {
        permitido: isChecked('permitirFiado')
      }
    };
  };

  const fillForm = (config) => {
    form.elements.namedItem('empresaNome').value = config.empresa.nome || '';
    form.elements.namedItem('empresaNomeRecibo').value = config.empresa.nomeRecibo || '';
    form.elements.namedItem('empresaResponsavel').value = config.empresa.nomeResponsavel || '';
    form.elements.namedItem('empresaDocumento').value = config.empresa.documento || '';
    form.elements.namedItem('empresaEndereco').value = config.empresa.endereco || '';
    form.elements.namedItem('empresaComplemento').value = config.empresa.complemento || '';
    form.elements.namedItem('empresaEmail').value = config.empresa.email || '';
    form.elements.namedItem('empresaWhatsapp').value = config.empresa.whatsapp || '';
    form.elements.namedItem('empresaTelefone').value = config.empresa.telefone || '';
    form.elements.namedItem('empresaInstagram').value = config.empresa.instagram || '';
    form.elements.namedItem('empresaLogotipo').value = config.empresa.logotipo || '';
    form.elements.namedItem('reciboCabecalho').value = config.empresa.cabecalhoRecibo || '';
    form.elements.namedItem('reciboRodape').value = config.empresa.rodapeRecibo || '';
    form.elements.namedItem('moedaCodigo').value = config.moeda.codigo || 'BRL';
    form.elements.namedItem('moedaCasasDecimais').value = config.moeda.casasDecimais ? 'sim' : 'nao';
    form.elements.namedItem('taxaEntrega').value = Number(config.pedidos.taxaEntrega || 0).toFixed(2);
    setCheckbox('statusPendente', config.pedidos.status.pendente);
    setCheckbox('statusConfirmado', config.pedidos.status.confirmado);
    setCheckbox('statusPago', config.pedidos.status.pago);
    setCheckbox('statusProducao', config.pedidos.status.producao);
    setCheckbox('statusPronto', config.pedidos.status.pronto);
    setCheckbox('statusSaiuEntrega', config.pedidos.status.saiuEntrega);
    setCheckbox('statusProntoRetirar', config.pedidos.status.prontoRetirar);
    setCheckbox('reciboLogo', config.recibo.loja.logotipo);
    setCheckbox('reciboNomeLoja', config.recibo.loja.nome);
    setCheckbox('reciboCnpj', config.recibo.loja.documento);
    setCheckbox('reciboTelefone', config.recibo.loja.telefone);
    setCheckbox('reciboWhatsapp', config.recibo.loja.whatsapp);
    setCheckbox('reciboEndereco', config.recibo.loja.endereco);
    setCheckbox('reciboClienteNome', config.recibo.cliente.nome);
    setCheckbox('reciboClienteTelefone', config.recibo.cliente.telefone);
    setCheckbox('reciboClienteEndereco', config.recibo.cliente.endereco);
    setCheckbox('pagamentoPix', config.pagamentos.pix);
    setCheckbox('pagamentoDinheiro', config.pagamentos.dinheiro);
    setCheckbox('pagamentoDebito', config.pagamentos.cartaoDebito);
    setCheckbox('pagamentoCredito', config.pagamentos.cartaoCredito);
    setCheckbox('permitirFiado', config.fiado?.permitido);
    setLogoPreview(config.empresa.logotipo);
  };

  const renderPreview = (config = readConfigFromForm()) => {
    const formatter = getFormatter(config);
    const address = [config.empresa.endereco, config.empresa.complemento].filter(Boolean).join(' - ');
    setText('settings-preview-name', `${config.empresa.nome || '-'} / ${config.empresa.nomeRecibo || '-'}`);
    setText('settings-preview-address', address || '-');
    setText('settings-preview-contact', [config.empresa.whatsapp, config.empresa.telefone, config.empresa.email].filter(Boolean).join(' | ') || '-');
    setText('settings-preview-fee', formatter.format(config.pedidos.taxaEntrega));
    if (paymentSummary) {
      const methods = [
        ['Pix', config.pagamentos.pix],
        ['Dinheiro em Espécie', config.pagamentos.dinheiro],
        ['Cartão de Débito', config.pagamentos.cartaoDebito],
        ['Cartão de Crédito', config.pagamentos.cartaoCredito]
      ].filter(([, enabled]) => enabled);
      paymentSummary.innerHTML = methods.length
        ? methods.map(([label]) => `<div>✓ ${label}<small style="display:block;color:#5d6672;font-weight:700">${label}</small></div>`).join('')
        : '<div>Nenhuma forma ativa</div>';
    }
  };

  const showFeedback = (message) => {
    if (!feedback) return;
    feedback.textContent = message;
    window.clearTimeout(showFeedback.timeoutId);
    showFeedback.timeoutId = window.setTimeout(() => { feedback.textContent = ''; }, 3500);
  };

  const loadCurrentConfig = () => {
    const config = window.DogtopConfig.load();
    fillForm(config);
    renderPreview(config);
  };

  const backupKeys = [
    'dogtopConfiguracoes',
    'dogtopProdutos',
    'produtosLanchonete',
    'dogtopClientes',
    'dogtopPedidoRascunho',
    'dogtopPedidosOnline',
    'dogtopAuditLogs'
  ];

  const exportBackup = () => {
    const payload = {
      versao: 1,
      criadoEm: new Date().toISOString(),
      origem: 'Dogtop',
      dados: backupKeys.reduce((acc, key) => {
        acc[key] = localStorage.getItem(key);
        return acc;
      }, {})
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dogtop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const payload = JSON.parse(reader.result);
        const data = payload?.dados;
        if (!data || typeof data !== 'object') throw new Error('Backup invalido.');
        backupKeys.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (data[key] === null || data[key] === undefined) localStorage.removeItem(key);
            else localStorage.setItem(key, data[key]);
          }
        });
        loadCurrentConfig();
        showFeedback('Backup importado com sucesso.');
      } catch {
        showFeedback('Arquivo de backup invalido.');
      } finally {
        importFileInput.value = '';
      }
    });
    reader.readAsText(file);
  };

  form.addEventListener('input', () => renderPreview());
  form.addEventListener('change', () => renderPreview());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const config = window.DogtopConfig.save(readConfigFromForm());
    fillForm(config);
    renderPreview(config);
    window.DogtopAudit?.log?.({
      modulo: 'Configuracoes',
      acao: 'Configuracoes2 atualizadas',
      entidade: 'dogtopConfiguracoes',
      detalhe: `Tela de teste salvou as configuracoes da empresa ${config.empresa.nome}.`
    });
    showFeedback('Configurações salvas com sucesso.');
  });

  logoFileInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      form.elements.namedItem('empresaLogotipo').value = reader.result;
      setLogoPreview(reader.result);
      renderPreview();
    });
    reader.readAsDataURL(file);
  });

  logoClearButton?.addEventListener('click', () => {
    form.elements.namedItem('empresaLogotipo').value = '';
    if (logoFileInput) logoFileInput.value = '';
    setLogoPreview('');
    renderPreview();
  });

  mapButton?.addEventListener('click', () => {
    const config = readConfigFromForm();
    const query = [config.empresa.endereco, config.empresa.complemento].filter(Boolean).join(' ');
    if (!query) {
      showFeedback('Informe um endereço para abrir o mapa.');
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener');
  });

  resetButton?.addEventListener('click', () => {
    if (!window.confirm('Deseja restaurar as configurações padrão?')) return;
    const config = window.DogtopConfig.save(window.DogtopConfig.defaults);
    fillForm(config);
    renderPreview(config);
    showFeedback('Configurações padrão restauradas.');
  });

  exportBackupButton?.addEventListener('click', exportBackup);
  importBackupButton?.addEventListener('click', () => importFileInput?.click());
  importFileInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Importar backup vai substituir os dados locais atuais. Deseja continuar?')) {
      importFileInput.value = '';
      return;
    }
    importBackup(file);
  });

  loadCurrentConfig();
})();
