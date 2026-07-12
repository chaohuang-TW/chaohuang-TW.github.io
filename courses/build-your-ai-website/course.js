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
})();
