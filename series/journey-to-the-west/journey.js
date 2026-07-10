const JOURNEY_DATA_URL = "../../assets/data/journey-to-west-episodes.json";
const JOURNEY_PAGE_SIZE = 12;

const episodeGrid = document.querySelector("#journey-episode-grid");
const episodeCount = document.querySelector("#journey-count");
const searchInput = document.querySelector("#journey-search");
const sortSelect = document.querySelector("#journey-sort");
const loadMoreButton = document.querySelector("#journey-load-more");

let publishedEpisodes = [];
let visibleCount = JOURNEY_PAGE_SIZE;

function sendJourneyEvent(name, parameters) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
}

function getVisibleEpisodes() {
  const query = searchInput.value.trim().toLocaleLowerCase("zh-Hant");
  const direction = sortSelect.value === "asc" ? 1 : -1;

  return publishedEpisodes
    .filter((episode) => {
      if (!query) return true;

      const searchableText = [
        episode.episodeNumber,
        `第${episode.episodeNumber}回`,
        episode.title,
        episode.subtitle
      ].join(" ").toLocaleLowerCase("zh-Hant");

      return searchableText.includes(query);
    })
    .sort((a, b) => (a.episodeNumber - b.episodeNumber) * direction);
}

function createEpisodeCard(episode) {
  const card = document.createElement("article");
  card.className = "journey-episode-card";

  const episodeLabel = document.createElement("span");
  episodeLabel.className = "journey-episode-number";
  episodeLabel.textContent = `第 ${episode.episodeNumber} 回`;

  const title = document.createElement("h3");
  title.textContent = episode.subtitle;

  card.append(episodeLabel, title);

  if (episode.publishedDate) {
    const date = document.createElement("time");
    date.dateTime = episode.publishedDate;
    date.textContent = episode.publishedDate;
    card.append(date);
  }

  const link = document.createElement("a");
  link.className = "primary-link journey-episode-link";
  link.href = episode.applePodcastUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "收聽本集";
  link.addEventListener("click", () => {
    sendJourneyEvent("select_journey_episode", {
      episode_id: episode.id,
      episode_number: episode.episodeNumber,
      episode_title: episode.title,
      apple_podcast_url: episode.applePodcastUrl
    });
  });

  card.append(link);
  return card;
}

function renderEpisodes() {
  const matchingEpisodes = getVisibleEpisodes();
  const episodesToRender = matchingEpisodes.slice(0, visibleCount);
  const query = searchInput.value.trim();

  episodeGrid.replaceChildren();
  episodeCount.textContent = query
    ? `找到 ${matchingEpisodes.length} 集，目前可收聽共 ${publishedEpisodes.length} 集`
    : `目前可收聽共 ${publishedEpisodes.length} 集`;

  if (episodesToRender.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "journey-empty";
    emptyMessage.textContent = "找不到符合條件的集數，請換一個關鍵字。";
    episodeGrid.append(emptyMessage);
  } else {
    episodesToRender.forEach((episode) => episodeGrid.append(createEpisodeCard(episode)));
  }

  loadMoreButton.hidden = visibleCount >= matchingEpisodes.length;
}

function resetAndRender() {
  visibleCount = JOURNEY_PAGE_SIZE;
  renderEpisodes();
}

async function bootstrapJourneyEpisodes() {
  try {
    const response = await fetch(JOURNEY_DATA_URL);
    if (!response.ok) throw new Error("Journey episode data request failed");

    const episodes = await response.json();
    publishedEpisodes = episodes.filter((episode) => (
      episode.status === "published"
      && typeof episode.applePodcastUrl === "string"
      && episode.applePodcastUrl.trim() !== ""
    ));
    renderEpisodes();
  } catch (_error) {
    episodeCount.textContent = "";
    episodeGrid.innerHTML = '<p class="load-fallback">西遊記集數資料暫時無法載入。</p>';
    loadMoreButton.hidden = true;
  }
}

searchInput.addEventListener("input", resetAndRender);
sortSelect.addEventListener("change", resetAndRender);
loadMoreButton.addEventListener("click", () => {
  visibleCount += JOURNEY_PAGE_SIZE;
  renderEpisodes();
});

bootstrapJourneyEpisodes();
