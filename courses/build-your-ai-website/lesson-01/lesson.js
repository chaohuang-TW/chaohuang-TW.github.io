(() => {
  const STORAGE_KEY = "chao-ai-guide-lesson-01";
  const track = (name, parameters) => {
    if (typeof window.gtag === "function") window.gtag("event", name, parameters);
  };
  const setMessage = (id, message) => {
    const node = document.getElementById(id);
    if (node) node.textContent = message;
  };
  const readProgress = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  };
  const saveProgress = (progress) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* Interaction still works in memory. */ }
  };

  const copyButton = document.querySelector(".copy-prompt-button");
  const prompt = document.querySelector("#readonly-prompt code");
  if (copyButton && prompt) {
    copyButton.addEventListener("click", async () => {
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          copied = await Promise.race([
            navigator.clipboard.writeText(prompt.textContent).then(() => true).catch(() => false),
            new Promise((resolve) => window.setTimeout(() => resolve(false), 500))
          ]);
        }
      } catch { copied = false; }
      if (!copied) {
        const textarea = document.createElement("textarea");
        textarea.value = prompt.textContent;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try { copied = document.execCommand("copy"); } catch { copied = false; }
        textarea.remove();
      }
      if (copied) {
        copyButton.textContent = "已複製";
        setMessage("copy-status", "指令已複製到剪貼簿");
        track("copy_course_prompt", { lesson_number: "01", prompt_name: copyButton.dataset.promptName });
        window.setTimeout(() => { copyButton.textContent = "複製指令"; }, 1500);
      } else {
        setMessage("copy-status", "無法自動複製，請選取文字後手動複製");
      }
    });
  }

  document.querySelectorAll(".install-track-link").forEach((link) => {
    link.addEventListener("click", () => track("select_course_install_link", {
      tool_name: link.dataset.toolName,
      destination: link.dataset.destination
    }));
  });

  const checkboxes = [...document.querySelectorAll("[data-check-item]")];
  let progress = readProgress();
  checkboxes.forEach((checkbox) => {
    checkbox.checked = Boolean(progress[checkbox.dataset.checkItem]);
    checkbox.addEventListener("change", () => {
      progress[checkbox.dataset.checkItem] = checkbox.checked;
      saveProgress(progress);
      track("complete_course_check_item", {
        lesson_number: "01",
        item_name: checkbox.dataset.checkItem,
        checked: checkbox.checked
      });
    });
  });

  document.querySelector(".clear-lesson-progress")?.addEventListener("click", () => {
    progress = {};
    checkboxes.forEach((checkbox) => { checkbox.checked = false; });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Nothing else is required. */ }
    setMessage("checklist-status", "本課勾選紀錄已清除");
  });
})();
