const VIDEO_DATA_URL = "../assets/data/ai-videos.json";

const standardVideoGrid = document.querySelector("#standard-video-grid");
const shortVideoGrid = document.querySelector("#short-video-grid");

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

  const copy = document.createElement("div");
  copy.className = "video-archive-copy";

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

  const iframe = document.createElement("iframe");
  iframe.src = video.embedUrl;
  iframe.title = video.title;
  iframe.loading = "lazy";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;

  frame.append(iframe);
  card.append(copy, frame);
  return card;
}

function renderVideoArchive(videos) {
  const publishedVideos = videos.filter((video) => video.status === "published");
  const standardVideos = publishedVideos
    .filter((video) => video.format === "standard")
    .sort((current, next) => next.order - current.order);
  const shortVideos = publishedVideos
    .filter((video) => (video.format || "short") === "short")
    .sort((current, next) => next.order - current.order);

  standardVideoGrid.replaceChildren();
  shortVideoGrid.replaceChildren();

  standardVideos.forEach((video) => {
    standardVideoGrid.append(createVideoArchiveCard(video, "standard"));
  });
  shortVideos.forEach((video) => {
    shortVideoGrid.append(createVideoArchiveCard(video, "short"));
  });
}

async function bootstrapVideoArchive() {
  try {
    const response = await fetch(VIDEO_DATA_URL);
    if (!response.ok) throw new Error("Video data request failed");

    const videos = await response.json();
    renderVideoArchive(videos);
  } catch (_error) {
    standardVideoGrid.innerHTML = '<p class="load-fallback">影音資料暫時無法載入。</p>';
    shortVideoGrid.innerHTML = '<p class="load-fallback">影音資料暫時無法載入。</p>';
  }
}

bootstrapVideoArchive();
