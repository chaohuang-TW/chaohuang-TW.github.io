const VIDEO_DATA_URL = "../assets/data/shuyi-videos.json";
const PODCAST_DATA_URL = "../assets/data/podcast-episodes.json";

function sendEvent(name, parameters) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function resolveAssetPath(path) {
  if (!path || /^(?:https?:)?\/\//.test(path)) return path;
  return `../${path}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei"
  }).format(date).replaceAll("/", ".");
}

function trackVideo(video) {
  sendEvent("select_shuyi_video", {
    video_id: video.id,
    video_title: video.title,
    channel: video.channel,
    href: video.youtubeUrl
  });
}

function createVideoCard(video, format, featured = false) {
  const card = document.createElement("article");
  card.className = `shuyi-video-card is-${format}${featured ? " is-featured" : ""}`;

  const media = document.createElement("a");
  media.className = "shuyi-card-media";
  media.href = video.youtubeUrl;
  media.target = "_blank";
  media.rel = "noopener";
  media.setAttribute("aria-label", `在 YouTube 觀看：${video.title}`);

  const image = document.createElement("img");
  image.className = "shuyi-card-image";
  image.src = resolveAssetPath(video.thumbnail);
  image.alt = video.thumbnailAlt || `${video.title}影片縮圖`;
  image.loading = featured ? "eager" : "lazy";
  image.decoding = "async";
  image.width = 1280;
  image.height = 720;

  const play = document.createElement("span");
  play.className = "shuyi-card-play";
  play.setAttribute("aria-hidden", "true");
  play.textContent = "▶";

  media.append(image, play);
  media.addEventListener("click", () => trackVideo(video));

  const copy = document.createElement("div");
  copy.className = "shuyi-card-copy";

  const meta = document.createElement("p");
  meta.className = "shuyi-card-meta";
  const series = video.series ? ` · ${video.series}` : "";
  meta.textContent = `${video.channel}${series} · ${formatDate(video.publishedAt)}`;

  const title = document.createElement("h3");
  title.className = "shuyi-card-title";
  title.textContent = video.title;

  const description = document.createElement("p");
  description.className = "shuyi-card-description";
  description.textContent = video.description;

  const link = document.createElement("a");
  link.className = "shuyi-card-link";
  link.href = video.youtubeUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "觀看影片 →";
  link.addEventListener("click", () => trackVideo(video));

  copy.append(meta, title, description, link);
  card.append(media, copy);
  return card;
}

function renderVideoSection(sectionId, targetId, videos, format, featured = false) {
  const section = document.querySelector(`#${sectionId}`);
  const target = document.querySelector(`#${targetId}`);
  if (!section || !target) return;

  if (videos.length === 0) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  target.replaceChildren();
  videos.forEach((video) => target.append(createVideoCard(video, format, featured)));
}

function renderVideos(videos) {
  const published = videos
    .filter((video) => video.status === "published")
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  renderVideoSection("latest", "shuyi-latest-video", published.slice(0, 1), published[0]?.format === "standard" ? "standard" : "short", true);
  renderVideoSection("shorts", "shuyi-shorts-grid", published.filter((video) => video.format === "short"), "short");
  renderVideoSection("standard", "shuyi-standard-grid", published.filter((video) => video.format === "standard"), "standard");
}

function trackPodcast(episode) {
  sendEvent("select_podcast_episode", {
    episode_id: episode.id,
    episode_title: episode.title,
    platform: episode.platform,
    href: episode.href
  });
}

function createPodcastCard(episode) {
  const card = document.createElement("a");
  card.className = "shuyi-podcast-card";
  card.href = episode.href;
  card.target = "_blank";
  card.rel = "noopener";
  card.addEventListener("click", () => trackPodcast(episode));

  const label = document.createElement("span");
  label.className = "shuyi-podcast-label";
  label.textContent = episode.platform || "Apple Podcasts";

  const title = document.createElement("h3");
  title.textContent = episode.title;

  const subtitle = document.createElement("p");
  subtitle.className = "shuyi-podcast-subtitle";
  subtitle.textContent = episode.subtitle;

  const description = document.createElement("p");
  description.className = "shuyi-podcast-description";
  description.textContent = episode.description;

  const cta = document.createElement("span");
  cta.className = "shuyi-podcast-cta";
  cta.textContent = "收聽本集 →";

  card.append(label, title, subtitle, description, cta);
  return card;
}

function renderPodcast(episodes) {
  const section = document.querySelector("#podcast");
  const target = document.querySelector("#shuyi-podcast-grid");
  if (!section || !target) return;

  const latest = episodes.filter((episode) => episode.featured === true).slice(0, 2);
  if (latest.length === 0) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  target.replaceChildren();
  latest.forEach((episode) => target.append(createPodcastCard(episode)));
}

function bindStaticTracking() {
  document.querySelectorAll("[data-track-podcast]").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_podcast", {
        podcast_title: "叔姨講古",
        platform: "Apple Podcasts",
        url: element.getAttribute("href")
      });
    });
  });

  document.querySelectorAll("[data-track-series]").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_podcast_series", {
        series_name: "西遊記",
        href: element.getAttribute("href")
      });
    });
  });

  document.querySelectorAll("[data-track-channel]").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_shuyi_channel", {
        channel: "叔姨講古",
        href: element.getAttribute("href")
      });
    });
  });
}

async function bootstrap() {
  bindStaticTracking();

  try {
    const videos = await loadJson(VIDEO_DATA_URL);
    renderVideos(videos);
  } catch (_error) {
    const target = document.querySelector("#shuyi-latest-video");
    if (target) {
      target.replaceChildren();
      const fallback = document.createElement("p");
      fallback.className = "shuyi-loading";
      fallback.textContent = "最新影音資料暫時無法載入。";
      target.append(fallback);
    }
  }

  try {
    const episodes = await loadJson(PODCAST_DATA_URL);
    renderPodcast(episodes);
  } catch (_error) {
    const section = document.querySelector("#podcast");
    if (section) section.hidden = true;
  }
}

bootstrap();
