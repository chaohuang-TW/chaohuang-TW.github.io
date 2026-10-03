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

  const progress = window.ChaoCourseProgress;
  const cards = [...document.querySelectorAll(".lesson-path-card[data-lesson-number]")];
  const total = cards.length;
  let completed = 0;
  cards.forEach((card) => {
    const data = progress.read(`chao-ai-guide-lesson-${card.dataset.lessonNumber}`);
    if (progress.isComplete(card.dataset.lessonNumber, data)) {
      completed += 1;
      card.classList.add("is-complete");
      const status = card.querySelector(".lesson-status");
      if (status) status.textContent = "已完成";
    }
  });
  const progressText = document.querySelector("#course-progress-text");
  const progressBar = document.querySelector(".course-progress-bar");
  const progressFill = document.querySelector("#course-progress-fill");
  if (progressText) progressText.textContent = `已完成 ${completed} / ${total} 課`;
  if (progressBar) {
    progressBar.setAttribute("aria-valuenow", String(completed));
    progressBar.setAttribute("aria-valuemax", String(total));
  }
  if (progressFill) progressFill.style.width = `${total ? completed / total * 100 : 0}%`;
})();
