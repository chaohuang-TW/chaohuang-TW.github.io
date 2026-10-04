/* A short, single-play narrative replaces the original tool-panel controls.
   Course progress and site analytics stay in their existing scripts. */
(() => {
  'use strict';
  const story = document.querySelector('.build-story');
  const replay = document.querySelector('.replay');
  const status = document.getElementById('lab-status');
  if (!story || !replay || !status) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;
  let firstFrame = null;
  let secondFrame = null;
  let generation = 0;
  story.dataset.enhanced = 'true';

  function stop(message = '建站流程示意，可重播或開啟課程。') {
    generation += 1;
    clearTimeout(timer);
    if (firstFrame !== null) cancelAnimationFrame(firstFrame);
    if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    timer = firstFrame = secondFrame = null;
    story.classList.remove('is-playing');
    status.textContent = message;
  }

  function play() {
    stop();
    if (preference.matches || document.hidden) return;
    const current = generation;
    firstFrame = requestAnimationFrame(() => {
      firstFrame = null;
      if (current !== generation || preference.matches || document.hidden) return;
      secondFrame = requestAnimationFrame(() => {
        secondFrame = null;
        if (current !== generation || preference.matches || document.hidden) return;
        story.classList.add('is-playing');
        status.textContent = '建站流程播放中。';
        timer = setTimeout(() => stop('建站流程播放完成，可再看一次或開啟課程。'), 4500);
      });
    });
  }

  replay.addEventListener('click', play);
  preference.addEventListener('change', () => stop(preference.matches
    ? '已依減少動態設定顯示完整建站流程。'
    : '建站流程示意，可重播或開啟課程。'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', () => stop());
  window.addEventListener('pageshow', event => { if (event.persisted) stop(); });
  if (!new URLSearchParams(location.search).has('still')) play();
})();
