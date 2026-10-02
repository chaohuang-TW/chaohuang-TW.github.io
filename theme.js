(() => {
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  let chosen;
  try { chosen = localStorage.getItem('chao-theme'); } catch (_) { /* Storage is optional. */ }
  const apply = (theme) => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      const dark = theme === 'dark';
      button.textContent = dark ? '淺色' : '深色';
      button.setAttribute('aria-label', dark ? '切換為淺色模式' : '切換為深色模式');
      button.setAttribute('aria-pressed', String(dark));
    });
  };
  apply(chosen === 'light' || chosen === 'dark' ? chosen : preference.matches ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('.theme-toggle').forEach((button) => button.addEventListener('click', () => {
      chosen = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('chao-theme', chosen); } catch (_) { /* Continue without persistence. */ }
      apply(chosen);
    }));
  });
  preference.addEventListener('change', () => { if (!chosen) apply(preference.matches ? 'dark' : 'light'); });
})();
