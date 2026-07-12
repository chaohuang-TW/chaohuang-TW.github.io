(() => {
  const track = (name, parameters) => {
    if (typeof window.gtag === "function") window.gtag("event", name, parameters);
  };

  document.querySelectorAll(".guide-track-link").forEach((link) => {
    link.addEventListener("click", () => track("select_learning_guide_lesson", {
      lesson_number: link.dataset.lessonNumber,
      lesson_title: link.dataset.lessonTitle,
      href: link.getAttribute("href")
    }));
  });

  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.rel = "noopener";
  });

  let completed = 0;
  document.querySelectorAll(".lesson-path-card[data-lesson-number]").forEach((card) => {
    try {
      const data = JSON.parse(localStorage.getItem(`chao-ai-guide-lesson-${card.dataset.lessonNumber}`) || "{}");
      const values = Object.values(data);
      if (values.length && values.every((value) => value === true)) {
        completed += 1;
        card.classList.add("is-complete");
        const status = card.querySelector(".lesson-status");
        if (status) status.textContent = "已完成";
      }
    } catch { /* A damaged or blocked localStorage starts at zero. */ }
  });
  const progressText = document.querySelector("#course-progress-text");
  const progressBar = document.querySelector(".course-progress-bar");
  const progressFill = document.querySelector("#course-progress-fill");
  if (progressText) progressText.textContent = `已完成 ${completed} / 8 課`;
  if (progressBar) progressBar.setAttribute("aria-valuenow", String(completed));
  if (progressFill) progressFill.style.width = `${completed / 8 * 100}%`;
})();
