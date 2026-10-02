/* A lightweight, keyboard-native facade: YouTube loads only on request. */
window.ChaoMedia = {
  create({ id, title, embedUrl, onLoad }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "media-poster";
    button.setAttribute("aria-label", `載入影片：${title}`);

    const image = document.createElement("img");
    image.src = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    image.alt = `${title}影片縮圖`;
    image.width = 480;
    image.height = 360;
    image.loading = "lazy";
    image.decoding = "async";

    const label = document.createElement("span");
    label.className = "media-poster-label";
    label.textContent = "▶ 載入影片";
    label.setAttribute("aria-hidden", "true");
    button.append(image, label);

    button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.title = title;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      button.replaceWith(iframe);
      iframe.focus();
      if (onLoad) onLoad();
    }, { once: true });
    return button;
  }
};
