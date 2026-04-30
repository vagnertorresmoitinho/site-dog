// APENAS estas duas informações vão para o frontend
const SUPABASE_URL = 'https://anjuawcodnktbjsznpeb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuanVhd2NvZG5rdGJqc3pucGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MDQ0MjAsImV4cCI6MjA5MzA4MDQyMH0.b01CUj3x-anYK2sauANZVEe-dhxOhtbqPFRiUDYEQG8';

(() => {
  const STORAGE_KEY = 'dogtopConfiguracoes';

  const defaults = {
    empresa: {
      nome: 'Dogtop',
      nomeRecibo: 'DOGTOP',
      nomeResponsavel: '',
      documento: '',
      endereco: 'Avenida Modesto Paludo, 2440NW',
      complemento: '',
      email: 'dogtopspz@gmail.com',
      whatsapp: '+55 65 99361-2193',
      telefone: '+55 (65) 99361-2193',
      instagram: '',
      logotipo: '',
      cabecalhoRecibo: '',
      rodapeRecibo: 'Obrigado pela preferência!'
    },
    moeda: {
      codigo: 'BRL',
      simbolo: 'R$',
      casasDecimais: true
    },
    pedidos: {
      taxaEntrega: 8,
      status: {
        pendente: true,
        confirmado: true,
        pago: true,
        producao: true,
        pronto: true,
        saiuEntrega: true,
        prontoRetirar: true
      }
    },
    recibo: {
      loja: {
        logotipo: true,
        nome: true,
        documento: true,
        telefone: true,
        whatsapp: true,
        endereco: true
      },
      cliente: {
        nome: true,
        telefone: true,
        endereco: true
      }
    },
    pagamentos: {
      pix: true,
      dinheiro: true,
      cartaoDebito: true,
      cartaoCredito: true
    }
  };

  const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const mergeDeep = (base, override) => {
    const result = { ...base };
    Object.entries(override || {}).forEach(([key, value]) => {
      result[key] = isPlainObject(value) && isPlainObject(base[key])
        ? mergeDeep(base[key], value)
        : value;
    });
    return result;
  };

  const load = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return mergeDeep(defaults, isPlainObject(stored) ? stored : {});
    } catch {
      return { ...defaults };
    }
  };

  const save = (nextConfig) => {
    const config = mergeDeep(defaults, nextConfig || {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  };

  const get = (path, fallback = '') => {
    const config = load();
    const value = String(path).split('.').reduce((current, key) => current?.[key], config);
    return value ?? fallback;
  };

  const getDeliveryFee = () => Number(get('pedidos.taxaEntrega', defaults.pedidos.taxaEntrega)) || 0;
  const getCompany = () => load().empresa;
  const getCurrency = () => load().moeda;
  const getCurrencyFormatter = () => {
    const moeda = getCurrency();
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda.codigo || 'BRL',
      minimumFractionDigits: moeda.casasDecimais ? 2 : 0,
      maximumFractionDigits: moeda.casasDecimais ? 2 : 0
    });
  };
  const getPaymentMethods = () => {
    const payments = load().pagamentos;
    return [
      { key: 'pix', value: 'Pix', label: 'Pix', enabled: payments.pix },
      { key: 'cartaoCredito', value: 'Cartao de credito', label: 'Cartão de crédito', enabled: payments.cartaoCredito },
      { key: 'cartaoDebito', value: 'Cartao de debito', label: 'Cartão de débito', enabled: payments.cartaoDebito },
      { key: 'dinheiro', value: 'Dinheiro', label: 'Dinheiro', enabled: payments.dinheiro }
    ].filter((method) => method.enabled);
  };

  window.DogtopConfig = {
    storageKey: STORAGE_KEY,
    defaults,
    load,
    save,
    get,
    getCompany,
    getCurrency,
    getCurrencyFormatter,
    getDeliveryFee,
    getPaymentMethods
  };
})();