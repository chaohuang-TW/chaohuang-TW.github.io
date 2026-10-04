const VIDEO_DATA_URL = "../assets/data/ai-videos.json";

const standardVideoGrid = document.querySelector("#standard-video-grid");
const shortVideoGrid = document.querySelector("#short-video-grid");
const videoCategoryButtons = [...document.querySelectorAll(".video-library-page button[data-video-category]")];
const videoCategoryStatus = document.querySelector("#video-category-status");
const videoCategoryLabels = { all: "全部內容", knowledge: "AI 知識", theater: "AI 小劇場" };
let archiveVideos = [];
let selectedVideoCategory = "all";

function getVideoContentCategory(video) {
  return video.contentCategory === "theater" ? "theater" : "knowledge";
}

function formatVideoPublishDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function sendVideoEvent(name, parameters) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
}

function trackVideo(video) {
  sendVideoEvent("select_ai_video", {
    video_id: video.id,
    video_title: video.title,
    youtube_url: video.youtubeUrl
  });
}

function createVideoArchiveCard(video, format) {
  const card = document.createElement("article");
  card.className = `video-archive-card is-${format}`;
  card.dataset.videoId = video.id;
  card.dataset.videoFormat = format;
  card.dataset.contentCategory = getVideoContentCategory(video);

  const copy = document.createElement("div");
  copy.className = "video-archive-copy";

  const category = document.createElement("p");
  category.className = "video-content-category";
  category.append(document.createTextNode(videoCategoryLabels[getVideoContentCategory(video)]));
  const publishedDate = formatVideoPublishDate(video.publishedAt);
  if (publishedDate) {
    category.append(document.createTextNode(" · "));
    const time = document.createElement("time");
    time.dateTime = video.publishedAt;
    time.textContent = publishedDate;
    category.append(time);
  }
  copy.append(category);

  const title = document.createElement("h3");
  title.textContent = video.title;
  copy.append(title);

  if (video.description) {
    const description = document.createElement("p");
    description.textContent = video.description;
    copy.append(description);
  }

  const link = document.createElement("a");
  link.className = "secondary-link video-archive-link";
  link.href = video.youtubeUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "在 YouTube 開啟";
  link.addEventListener("click", () => trackVideo(video));
  copy.append(link);

  const frame = document.createElement("div");
  frame.className = `video-archive-frame is-${format}`;

  frame.append(window.ChaoMedia.create({
    id: video.id,
    title: video.title,
    embedUrl: video.embedUrl,
    thumbnail: video.thumbnail,
    onLoad: () => trackVideo(video)
  }));
  card.append(frame, copy);
  return card;
}

function renderVideoArchive() {
  const publishedVideos = archiveVideos.filter((video) => selectedVideoCategory === "all"
    || getVideoContentCategory(video) === selectedVideoCategory);
  const standardVideos = publishedVideos
    .filter((video) => video.format === "standard")
    .sort((current, next) => next.order - current.order);
  const shortVideos = publishedVideos
    .filter((video) => (video.format || "short") === "short")
    .sort((current, next) => next.order - current.order);

  [standardVideoGrid, shortVideoGrid].forEach((grid) => {
    grid.querySelectorAll(".media-player").forEach((player) => player.dispatchEvent(new Event("chao:unload")));
    grid.replaceChildren();
  });

  standardVideos.forEach((video) => {
    standardVideoGrid.append(createVideoArchiveCard(video, "standard"));
  });
  shortVideos.forEach((video) => {
    shortVideoGrid.append(createVideoArchiveCard(video, "short"));
  });

  [[standardVideoGrid, standardVideos, "專題影片"], [shortVideoGrid, shortVideos, "Shorts"]].forEach(([grid, items, label]) => {
    if (items.length) return;
    const empty = document.createElement("p");
    empty.className = "load-fallback";
    empty.textContent = `${videoCategoryLabels[selectedVideoCategory]}目前沒有${label}。`;
    grid.append(empty);
  });

  document.querySelector("#standard-video-count").textContent = `（${standardVideos.length}）`;
  document.querySelector("#short-video-count").textContent = `（${shortVideos.length}）`;
  videoCategoryButtons.forEach((button) => {
    const category = button.dataset.videoCategory;
    const count = archiveVideos.filter((video) => category === "all" || getVideoContentCategory(video) === category).length;
    button.setAttribute("aria-pressed", String(category === selectedVideoCategory));
    button.querySelector("[data-video-category-count]").textContent = String(count);
  });
  videoCategoryStatus.textContent = `${videoCategoryLabels[selectedVideoCategory]}：${publishedVideos.length} 支影片，${standardVideos.length} 支專題影片、${shortVideos.length} 支 Shorts。`;
}

async function bootstrapVideoArchive() {
  try {
    const response = await fetch(VIDEO_DATA_URL);
    if (!response.ok) throw new Error("Video data request failed");

    const videos = await response.json();
    archiveVideos = videos.filter((video) => video.status === "published");
    videoCategoryButtons.forEach((button) => { button.disabled = false; });
    renderVideoArchive();
  } catch (_error) {
    standardVideoGrid.innerHTML = '<p class="load-fallback">影音資料暫時無法載入。</p>';
    shortVideoGrid.innerHTML = '<p class="load-fallback">影音資料暫時無法載入。</p>';
    videoCategoryButtons.forEach((button) => { button.disabled = true; });
    videoCategoryStatus.textContent = "影音資料暫時無法載入，可使用首頁連結或官方頻道查看。";
  }
}

videoCategoryButtons.forEach((button) => button.addEventListener("click", () => {
  const category = button.dataset.videoCategory;
  if (!(category in videoCategoryLabels)) return;
  selectedVideoCategory = category;
  renderVideoArchive();
}));

bootstrapVideoArchive();
