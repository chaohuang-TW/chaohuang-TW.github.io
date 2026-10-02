/* A lightweight, keyboard-native facade: YouTube loads only on request. */
window.ChaoMedia = {
  create({ id, title, embedUrl, onLoad }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "media-poster";
    button.setAttribute("aria-label", `載入影片：${title}`);

    const image = document.createElement("img");
    const thumbnailBase = `https://i.ytimg.com/vi/${encodeURIComponent(id)}`;
    image.src = `${thumbnailBase}/maxresdefault.jpg`;
    image.addEventListener('error', () => {
      image.src = `${thumbnailBase}/hqdefault.jpg`;
    }, { once: true });
    image.alt = `${title}影片縮圖`;
    image.width = 1280;
    image.height = 720;
    image.loading = "lazy";
    image.decoding = "async";

    const label = document.createElement("span");
    label.className = "media-poster-label";
    label.textContent = "▶ 載入影片";
    label.setAttribute("aria-hidden", "true");
    button.append(image, label);

    button.addEventListener("click", () => {
      const player = document.createElement("div");
      player.className = "media-player";
      player.setAttribute("aria-busy", "true");
      image.className = "media-player-preview";
      image.alt = "";
      const status = document.createElement("span");
      status.className = "media-player-status";
      status.setAttribute("role", "status");
      status.textContent = "正在載入影片…";
      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.title = title;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      const delayed = window.setTimeout(() => {
        player.classList.add("is-delayed");
        player.setAttribute("aria-busy", "false");
        status.textContent = "載入較久，可使用 YouTube 連結開啟。";
      }, 8000);
      iframe.addEventListener("load", () => {
        window.clearTimeout(delayed);
        player.classList.add("is-ready");
        player.setAttribute("aria-busy", "false");
        status.remove();
      }, { once: true });
      iframe.addEventListener("error", () => {
        window.clearTimeout(delayed);
        player.classList.add("is-delayed");
        player.setAttribute("aria-busy", "false");
        status.textContent = "影片暫時無法載入，可使用 YouTube 連結開啟。";
      }, { once: true });
      player.append(image, iframe, status);
      button.replaceWith(player);
      iframe.focus();
      if (onLoad) onLoad();
    }, { once: true });
    return button;
  }
};
