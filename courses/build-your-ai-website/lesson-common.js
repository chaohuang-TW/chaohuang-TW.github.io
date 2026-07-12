(() => {
  const main = document.querySelector("main[data-lesson-number]");
  if (!main) return;
  const lessonNumber = main.dataset.lessonNumber;
  const lessonTitle = main.dataset.lessonTitle;
  const storageKey = main.dataset.storageKey;
  const track = (name, parameters) => {
    if (typeof window.gtag === "function") window.gtag("event", name, parameters);
  };
  const message = (text) => {
    const live = document.querySelector("#lesson-live-status");
    if (live) live.textContent = text;
  };
  const read = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; } };
  const save = (value) => { try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Keep in-page interaction available. */ } };
  const fallbackCopy = (text) => {
    const area = document.createElement("textarea");
    area.value = text; area.readOnly = true; area.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(area); area.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch { ok = false; }
    area.remove(); return ok;
  };
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.querySelector(button.dataset.copyTarget);
      if (!target) return;
      const text = target.textContent;
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) copied = await Promise.race([navigator.clipboard.writeText(text).then(() => true).catch(() => false), new Promise((resolve) => setTimeout(() => resolve(false), 500))]);
      } catch { copied = false; }
      if (!copied) copied = fallbackCopy(text);
      if (!copied) { message("無法自動複製，請選取文字後手動複製"); return; }
      const original = button.textContent; button.textContent = "已複製"; message("內容已複製到剪貼簿");
      track("copy_course_prompt", { lesson_number: lessonNumber, lesson_title: lessonTitle, prompt_name: button.dataset.promptName });
      setTimeout(() => { button.textContent = original; }, 1500);
    });
  });
  document.querySelectorAll("a[data-resource-name]").forEach((link) => {
    if (link.target === "_blank") link.rel = "noopener";
    link.addEventListener("click", () => track("select_course_resource", { lesson_number: lessonNumber, lesson_title: lessonTitle, resource_name: link.dataset.resourceName, destination: link.href }));
  });
  let progress = read();
  const boxes = [...document.querySelectorAll("[data-check-item]")];
  const renderComplete = () => {
    const complete = boxes.length > 0 && boxes.every((box) => box.checked);
    const state = document.querySelector(".lesson-complete-state");
    if (state) { state.hidden = !complete; state.textContent = complete ? "本課已完成" : ""; }
  };
  boxes.forEach((box) => {
    box.checked = progress[box.dataset.checkItem] === true;
    box.addEventListener("change", () => {
      progress[box.dataset.checkItem] = box.checked; save(progress); renderComplete();
      track("complete_course_check_item", { lesson_number: lessonNumber, lesson_title: lessonTitle, item_name: box.dataset.checkItem, checked: box.checked });
    });
  });
  document.querySelector(".clear-lesson-progress")?.addEventListener("click", () => {
    progress = {}; boxes.forEach((box) => { box.checked = false; });
    try { localStorage.removeItem(storageKey); } catch { /* No persistent storage to clear. */ }
    renderComplete(); message("本課勾選紀錄已清除");
    track("clear_course_progress", { lesson_number: lessonNumber, lesson_title: lessonTitle });
  });
  renderComplete();
})();
