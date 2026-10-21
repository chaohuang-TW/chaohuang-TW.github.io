/* Shared by home and Shuyi. Keep the existing gtag queue/config/events; paint
   before the third-party analytics library competes for its main thread. */
(() => {
  const loadAnalytics = () => requestAnimationFrame(() => setTimeout(() => {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-0WRZ173JVH';
    document.head.append(script);
  }, 0));
  if (document.readyState === 'complete') loadAnalytics();
  else window.addEventListener('load', loadAnalytics, { once: true });
})();
