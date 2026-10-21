/* Preserve the existing GA queue/configuration; only schedule this page's
 * download after its hero can paint. No interaction, idle or arbitrary delay.
 */
(() => {
  async function loadAnalytics() {
    const hero = document.querySelector('.shuyi-hero-visual img');
    if (hero?.decode) {
      try { await hero.decode(); } catch (_) { /* Analytics still loads if the image fails. */ }
    }
    requestAnimationFrame(() => setTimeout(() => {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-0WRZ173JVH';
      document.head.append(script);
    }, 0));
  }
  if (document.readyState === 'complete') loadAnalytics();
  else window.addEventListener('load', loadAnalytics, { once: true });
})();
