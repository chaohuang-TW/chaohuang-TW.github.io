/* Homepage links work without JavaScript. Enhancement is limited to tracking,
   navigation aliases and one optional source-backed update list. */
(() => {
  'use strict';
  const jsonRequests = new Map();
  function loadJson(path) {
    if (!jsonRequests.has(path)) {
      const request = fetch(path).then(response => {
        if (!response.ok) throw new Error(`Failed to load ${path}`);
        return response.json();
      }).then(data => {
        if (!Array.isArray(data)) throw new Error(`Invalid data in ${path}`);
        return data;
      });
      jsonRequests.set(path, request);
      request.catch(() => jsonRequests.delete(path));
    }
    return jsonRequests.get(path);
  }
  function sendEvent(name, parameters) {
    if (typeof window.gtag === 'function') window.gtag('event', name, parameters);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.matches('.track-home-primary-action')) sendEvent('select_home_primary_action', {
      action_name: link.dataset.actionName, href: link.getAttribute('href')
    });
    if (link.matches('.track-ai-note')) sendEvent('select_ai_note', {
      note_title: link.dataset.noteTitle, status: link.dataset.status
    });
    if (link.dataset.track) sendEvent(link.dataset.track, {
      title: link.closest('article')?.querySelector('h3')?.textContent,
      course_id: link.closest('[data-course-id]')?.dataset.courseId,
      href: link.getAttribute('href')
    });
    if (link.closest('#ai-lab')) sendEvent('select_ai_lab_project', {
      project_title: link.querySelector('.lab-record-title')?.textContent, youtube_url: link.href
    });
  });

  function revealHashTarget() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_error) { return; }
    const target = id && document.getElementById(id);
    if (!target) return;
    let detail = target.closest('details');
    let changed = false;
    while (detail) {
      if (!detail.open) { detail.open = true; changed = true; }
      detail = detail.parentElement.closest('details');
    }
    if (changed) requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
  window.addEventListener('hashchange', revealHashTarget);
  revealHashTarget();

  const sectionLinks = [...document.querySelectorAll('.top-nav-links a[href^="#"]')];
  const sections = sectionLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  function refreshNavigation() {
    const line = document.querySelector('.top-nav').getBoundingClientRect().height + 40;
    let active = '';
    sections.forEach(section => { if (section.getBoundingClientRect().top <= line) active = `#${section.id}`; });
    sectionLinks.forEach(link => {
      if (link.hash === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let navigationFrame = null;
  window.addEventListener('scroll', () => {
    if (navigationFrame !== null) return;
    navigationFrame = requestAnimationFrame(() => { navigationFrame = null; refreshNavigation(); });
  }, { passive: true });
  window.addEventListener('resize', refreshNavigation, { passive: true });
  refreshNavigation();

  function publicationValue(record) { return record.publishedAt || record.publishedDate || record.date || ''; }
  function publicationTimestamp(record) {
    const date = publicationValue(record);
    return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00+08:00` : date);
  }
  function publicationDate(record) {
    const value = publicationValue(record);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(value));
    const part = type => parts.find(item => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  async function refreshLatest() {
    const target = document.querySelector('#recent-updates-grid');
    if (!target) return;
    const sources = [
      ['Mica AI', 'assets/data/ai-videos.json', 'youtubeUrl'],
      ['叔姨講古', 'assets/data/shuyi-videos.json', 'youtubeUrl'],
      ['Podcast', 'assets/data/podcast-episodes.json', 'href']
    ];
    const results = await Promise.allSettled(sources.map(async ([kind, path, destination]) => {
      const records = await loadJson(path);
      const record = records.filter(item => (!item.status || item.status === 'published')
        && item[destination] && Number.isFinite(publicationTimestamp(item)))
        .sort((a, b) => publicationTimestamp(b) - publicationTimestamp(a))[0];
      if (!record) throw new Error(`No published records in ${path}`);
      return { kind, record, href: record[destination], path };
    }));
    // A partial fetch failure preserves all existing links and their focus.
    if (results.some(result => result.status !== 'fulfilled')) {
      const status = document.createElement('p');
      status.className = 'dynamic-load-status';
      status.setAttribute('role', 'status');
      status.textContent = '最新資料暫時無法核對，仍可使用現有連結或開啟內容館。';
      target.after(status);
      return;
    }
    const active = document.activeElement;
    // Refreshing optional content must not interrupt a keyboard user's chosen link.
    if (target.contains(active)) {
      active.addEventListener('blur', refreshLatest, { once: true });
      return;
    }
    const items = results.map(result => {
      const { kind, record, href, path } = result.value;
      const item = document.createElement('li');
      item.dataset.latestKind = kind;
      if (kind === 'Mica AI') item.id = 'mica-latest';
      if (kind === '叔姨講古') item.id = 'shuyi-latest';
      item.dataset.source = path;
      const meta = document.createElement('span');
      meta.className = 'update-meta';
      const date = document.createElement('time');
      date.dateTime = publicationValue(record);
      date.textContent = publicationDate(record);
      meta.append(`${kind} · `, date);
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `${record.title} ↗`;
      link.addEventListener('click', () => sendEvent('select_site_update', {
        update_id: record.id, update_type: kind, update_title: record.title, href
      }));
      item.append(meta, link);
      return item;
    });
    target.replaceChildren(...items);
  }
  refreshLatest();
})();
