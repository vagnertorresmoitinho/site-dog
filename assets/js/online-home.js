(() => {
  const HOME_URL = './pedidos-online.html';

  const goHome = (event) => {
    const link = event.target.closest('[data-online-home], .online-logo');
    if (!link) return;

    event.preventDefault();
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'pedidos-online.html') {
      window.history.replaceState(null, '', HOME_URL);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.location.assign(HOME_URL);
  };

  document.addEventListener('click', goHome);
})();
