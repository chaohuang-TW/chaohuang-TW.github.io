(() => {
  const dialog = document.getElementById("course-slide-preview");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const title = dialog.querySelector("#course-preview-title");
  const image = dialog.querySelector(".course-preview-image");
  const closeButton = dialog.querySelector(".course-preview-close");
  const originalLink = dialog.querySelector(".course-preview-original");
  const transcript = dialog.querySelector(".course-preview-transcript");
  const text = dialog.querySelector(".course-preview-text");
  let trigger = null;
  let previousOverflow = "";
  let pointerStartedOutside = false;

  document.querySelectorAll(".slide-preview-card").forEach(card => {
    card.addEventListener("click", () => {
      if (dialog.open) return;
      trigger = card;
      title.textContent = card.dataset.slideTitle;
      image.src = card.dataset.imagePath;
      image.alt = `${card.dataset.slideTitle}完整預覽`;
      const thumbnail = card.querySelector("img");
      image.width = Number(thumbnail.getAttribute("width"));
      image.height = Number(thumbnail.getAttribute("height"));
      originalLink.href = card.dataset.imagePath;
      text.replaceChildren();
      const sourceText = document.getElementById(card.dataset.textId || "");
      transcript.hidden = !sourceText;
      transcript.open = false;
      if (sourceText) {
        const copy = sourceText.cloneNode(true);
        copy.removeAttribute("id");
        copy.removeAttribute("class");
        text.append(copy);
      }
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
      dialog.scrollTop = 0;
      closeButton.focus({ preventScroll: true });
      if (typeof window.sendCourseEvent === "function") {
        window.sendCourseEvent("select_slide_preview", {
          slide_title: card.dataset.slideTitle,
          image_path: card.dataset.imagePath
        });
      }
    });
  });

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    pointerStartedOutside = false;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    image.removeAttribute("src");
  });

  const isOutside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (
      event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom
    );
  };
  dialog.addEventListener("pointerdown", event => {
    pointerStartedOutside = isOutside(event);
  });
  dialog.addEventListener("click", event => {
    if (pointerStartedOutside && isOutside(event)) dialog.close();
    pointerStartedOutside = false;
  });

  dialog.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll("button, a[href], summary")]
      .filter(element => !element.closest("[hidden]") && element.getClientRects().length);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
