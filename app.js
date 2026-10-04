const jsonRequests = new Map();
const learningCourseHandlers = new WeakMap();

async function loadJson(path) {
  if (!jsonRequests.has(path)) {
    const request = fetch(path).then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return response.json().then((data) => {
        if (!Array.isArray(data)) throw new Error(`Invalid data in ${path}`);
        return data;
      });
    });
    jsonRequests.set(path, request);
    request.catch(() => jsonRequests.delete(path));
  }
  return jsonRequests.get(path);
}

function sendEvent(name, parameters) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
}

function formatSiteUpdateDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? `${match[1]}.${match[2]}.${match[3]}` : value;
}

function formatContentDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return formatSiteUpdateDate(value);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}.${part("month")}.${part("day")}`;
}

function publicationValue(record) {
  return record.publishedAt || record.publishedDate || record.date || "";
}

function publicationTimestamp(record) {
  const value = publicationValue(record);
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00` : value);
}

function isPublishedRecord(record) {
  return (!record.status || record.status === "published")
    && Number.isFinite(publicationTimestamp(record));
}

function appendLoadStatus(target, message) {
  if (!target) return;
  let status = target.querySelector(".dynamic-load-status");
  if (!status) {
    status = document.createElement(target.tagName === "UL" ? "li" : "p");
    status.className = "load-fallback dynamic-load-status";
    status.setAttribute("role", "status");
    target.append(status);
  }
  status.textContent = message;
}

function replacePreservingFocus(target, ...children) {
  const active = document.activeElement;
  const href = active && target.contains(active) && active.tagName === "A" ? active.href : "";
  target.replaceChildren(...children);
  if (href) {
    const replacement = [...target.querySelectorAll("a[href]")].find((link) => link.href === href);
    if (replacement) replacement.focus({ preventScroll: true });
  }
}

function contentIdentity(href) {
  try {
    const url = new URL(href, "https://chaohuang-tw.github.io/");
    if (url.hostname === "youtu.be") return `youtube:${url.pathname.split("/")[1]}`;
    if (/(^|\.)youtube\.com$/.test(url.hostname)) {
      const id = url.searchParams.get("v") || url.pathname.split("/")[2];
      if (id) return `youtube:${id}`;
    }
    if (url.hostname === "podcasts.apple.com" && url.searchParams.get("i")) {
      return `podcast:${url.searchParams.get("i")}`;
    }
    return url.href;
  } catch (_error) { return href; }
}

function createRecentUpdateCard(update) {
  const item = document.createElement("li");
  item.className = "recent-update-item";
  item.dataset.updateId = update.id;
  item.dataset.source = update.sourcePath || "assets/data/site-updates.json";
  const date = document.createElement("time");
  date.dateTime = publicationValue(update);
  date.textContent = formatContentDate(publicationValue(update));
  const link = document.createElement("a");
  link.className = "recent-update-link";
  link.href = update.href;
  if (update.external === true) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  const type = document.createElement("span");
  type.className = "recent-update-type";
  type.textContent = update.type;
  const title = document.createElement("span");
  title.className = "recent-update-title";
  title.textContent = update.title;
  link.append(type, title);
  link.addEventListener("click", () => sendEvent("select_site_update", {
    update_id: update.id, update_type: update.type, update_title: update.title, href: update.href
  }));
  item.append(date, link);
  return item;
}

function renderRecentUpdates(updates, micaVideos = [], shuyiVideos = [], podcastEpisodes = []) {
  const target = document.querySelector("#recent-updates-grid");
  if (!target) return;
  const candidates = updates.filter((update) => update.status === "published"
    && !["網站更新", "內容更新"].includes(update.type) && update.href && isPublishedRecord(update))
    .map((update) => ({ ...update, sourcePath: "assets/data/site-updates.json" }));
  const addVideos = (videos, sourcePath, label) => videos.filter((video) => video.status === "published"
    && video.youtubeUrl && isPublishedRecord(video)).forEach((video) => candidates.push({
    ...video, id: `${label}-${video.id}`, href: video.youtubeUrl, external: true,
    type: label === "Mica" ? (video.contentCategory === "theater" ? "AI 小劇場" : "AI 知識") : "叔姨講古",
    sourcePath
  }));
  addVideos(micaVideos, "assets/data/ai-videos.json", "Mica");
  addVideos(shuyiVideos, "assets/data/shuyi-videos.json", "叔姨");
  podcastEpisodes.filter((episode) => episode.href && isPublishedRecord(episode)).forEach((episode) => candidates.push({
    ...episode, href: episode.href, external: true, type: "Podcast", sourcePath: "assets/data/podcast-episodes.json"
  }));
  // Prefer the actual publication record over a dated homepage announcement of the same item.
  const unique = new Map();
  candidates.forEach((candidate) => unique.set(contentIdentity(candidate.href), candidate));
  const latest = [...unique.values()].sort((current, next) => publicationTimestamp(next) - publicationTimestamp(current)
    || current.id.localeCompare(next.id)).slice(0, 4);
  if (!latest.length) {
    appendLoadStatus(target, "近期內容資料暫時無法核對，仍可使用現有連結。");
    return;
  }
  const items = latest.map(createRecentUpdateCard);
  replacePreservingFocus(target, ...items);
}

function trackInteractiveProject(project) {
  sendEvent("select_interactive_project", {
    project_id: project.id,
    project_title: project.title,
    href: project.href
  });
}

function createFeaturedInteractiveProject(project) {
  const card = document.createElement("article");
  card.className = "interactive-feature-card";

  const media = document.createElement("figure");
  media.className = "interactive-feature-media";
  media.setAttribute("aria-label", `${project.title}遊戲畫面`);

  if (project.image) {
    const image = document.createElement("img");
    image.className = "interactive-feature-image";
    image.src = project.image;
    image.alt = project.imageAlt || `${project.title}遊戲畫面`;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 1400;
    image.height = 788;
    media.append(image);
  } else {
    media.hidden = true;
    card.classList.add("is-text-only");
  }

  const content = document.createElement("div");
  content.className = "interactive-feature-content";

  const copy = document.createElement("div");
  copy.className = "interactive-feature-copy";

  const eyebrow = document.createElement("p");
  eyebrow.className = "interactive-feature-eyebrow";
  eyebrow.textContent = project.eyebrow;

  const title = document.createElement("h3");
  title.className = "interactive-feature-title";
  title.textContent = project.title;

  const description = document.createElement("p");
  description.className = "interactive-feature-description";
  description.textContent = project.description;

  const tags = document.createElement("div");
  tags.className = "interactive-feature-tags";
  tags.setAttribute("aria-label", "作品標籤");

  project.tags.forEach((tagText) => {
    const tag = document.createElement("span");
    tag.className = "interactive-feature-tag";
    tag.textContent = tagText;
    tags.append(tag);
  });

  const action = document.createElement("a");
  action.className = "primary-link interactive-feature-action";
  action.href = project.href;
  action.textContent = project.cta;

  if (project.external === true) {
    action.target = "_blank";
    action.rel = "noopener";
  }

  action.addEventListener("click", () => {
    trackInteractiveProject(project);
  });

  copy.append(
    eyebrow,
    title,
    description,
    tags,
    action
  );

  const facts = document.createElement("ul");
  facts.className = "interactive-feature-facts";
  facts.setAttribute("aria-label", "遊戲特色");

  project.highlights.forEach((highlight) => {
    const item = document.createElement("li");
    item.className = "interactive-feature-fact";
    item.textContent = highlight;
    facts.append(item);
  });

  const details = document.createElement('details');
  details.className = 'project-details';
  const summary = document.createElement('summary');
  summary.textContent = '作品詳情';
  details.append(summary, facts);
  content.append(copy, details);
  card.append(media, content);

  return card;
}

function renderInteractiveProjects(projects) {
  const target = document.querySelector(
    "#interactive-feature-projects"
  );

  if (!target) return;

  const featuredProjects = projects
    .filter((project) => (
      project.status === "published"
      && project.featured === true
    ))
    .sort((current, next) => {
      const lead = target.dataset.leadProject;
      if (current.id === lead) return -1;
      if (next.id === lead) return 1;
      return next.order - current.order;
    });

  if (featuredProjects.length === 0) {
    appendLoadStatus(target, "代表作品資料暫時無法核對，仍可使用現有作品連結。");
    return;
  }
  const cards = featuredProjects.map(createFeaturedInteractiveProject);
  replacePreservingFocus(target, ...cards);
}

function trackCourseHub(course, target) {
  sendEvent("select_course_hub", {
    course_id: course.id,
    course_title: course.title,
    status: course.status,
    target
  });
}

function renderCourseHub(courses) {
  const target = document.querySelector("#course-hub-grid");
  const template = document.querySelector("#course-feature-template");

  if (!target || !template) return;

  const cards = document.createDocumentFragment();
  courses.forEach((course) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".course-feature-card");
    const cover = fragment.querySelector(".course-cover");
    const fallback = fragment.querySelector(".course-cover-fallback");
    const toolList = fragment.querySelector(".course-tool-list");
    const resourceList = fragment.querySelector(".course-resource-list");

    card.dataset.courseId = course.id;
    card.dataset.courseTitle = course.title;
    card.dataset.status = course.status;
    card.dataset.href = course.href || "#course-hub";

    fallback.hidden = true;
    cover.hidden = false;
    cover.addEventListener("load", () => {
      cover.hidden = false;
      fallback.hidden = true;
    });
    cover.addEventListener("error", () => {
      cover.hidden = true;
      fallback.hidden = false;
    });
    cover.src = course.cover;
    cover.alt = `${course.title}課程封面`;

    fragment.querySelector(".course-status").textContent = course.status;
    fragment.querySelector(".course-subtitle").textContent = course.subtitle;
    const courseLink = fragment.querySelector(".course-title-link");
    courseLink.textContent = course.title;
    courseLink.href = course.href || "#course-hub";
    fragment.querySelector(".course-feature-description").textContent = course.description;

    courseLink.addEventListener("click", () => {
      trackCourseHub(course, course.href || "#course-hub");
    });

    course.prepTools.forEach((tool) => {
      const link = document.createElement("a");
      link.className = "course-tool-link";
      link.href = tool.href;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = tool.name;
      link.addEventListener("click", (event) => {
        event.stopPropagation();
        trackCourseHub(course, tool.href);
        sendEvent("select_course_tool", {
          tool_name: tool.name,
          href: tool.href
        });
      });
      toolList.append(link);
    });

    const resourceStatus = document.createElement("p");
    resourceStatus.className = "interaction-status";
    resourceStatus.setAttribute("role", "status");
    course.resources.forEach((resource) => {
      const available = !["即將開放", "整理中"].includes(resource.status);
      const control = document.createElement(available ? "a" : "button");
      control.className = "course-resource-item";
      if (available) {
        control.href = resource.href || course.href;
        if (!resource.href && course.id === "build-your-ai-website" && resource.target === "學習路徑") control.href += "#learning-path";
        if (!resource.href && course.id === "build-your-ai-website" && resource.target === "第一課") control.href += "lesson-01/";
      } else {
        control.type = "button";
      }
      control.innerHTML = `<span>${resource.label}</span><strong>${resource.status}</strong>`;
      control.addEventListener("click", (event) => {
        event.stopPropagation();
        trackCourseHub(course, resource.target || resource.label);
        if (!available) resourceStatus.textContent = `${resource.label}：${resource.status}`;
      });
      resourceList.append(control);
    });
    resourceList.after(resourceStatus);

    cards.append(fragment);
  });
  if (cards.childNodes.length) replacePreservingFocus(target, cards);
  else appendLoadStatus(target, "課程資料暫時無法核對，仍可使用現有課程入口。");
}

function bindLearningCourse(link, course) {
  const previous = learningCourseHandlers.get(link);
  if (previous) link.removeEventListener("click", previous);
  const handler = () => sendEvent("select_course", {
    course_id: course.id, course_name: course.name, subject: course.subject, lesson: course.lesson, href: course.href
  });
  learningCourseHandlers.set(link, handler);
  link.addEventListener("click", handler);
}

function renderCourses(courses) {
  const platformTarget = document.querySelector("#learning-platform");
  const platformLink = document.querySelector("#learning-platform-link");
  const platformName = document.querySelector("#learning-platform-name");
  const platformSummary = document.querySelector("#learning-platform-summary");
  const target = document.querySelector("#course-grid");
  if (!platformTarget || !platformLink || !platformName || !platformSummary || !target) return;
  const platform = courses.find((course) => course.category === "platform" && course.href);
  const practices = courses.filter((course) => course.category === "practice" && course.href);
  if (!platform || !practices.length) {
    appendLoadStatus(target, "學習資料暫時無法核對，仍可使用現有練習入口。");
    return;
  }
  const items = practices.map((course) => {
    const item = document.createElement("li");
    item.className = "practice-item";
    const link = document.createElement("a");
    link.className = "course-card";
    link.href = course.href;
    link.dataset.category = "practice";
    link.dataset.courseId = course.id;
    const label = document.createElement("span");
    label.className = "course-label";
    label.textContent = course.cardLabel;
    const name = document.createElement("strong");
    name.className = "course-name";
    name.textContent = course.name;
    const arrow = document.createElement("span");
    arrow.className = "course-action";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    link.append(label, name, arrow);
    bindLearningCourse(link, course);
    item.append(link);
    return item;
  });
  platformTarget.dataset.courseId = platform.id;
  platformTarget.dataset.category = "platform";
  platformLink.href = platform.href;
  platformName.textContent = platform.name;
  platformSummary.textContent = platform.learnSummary || platform.focus;
  bindLearningCourse(platformLink, platform);
  replacePreservingFocus(target, ...items);
}

function trackAiVideo(video) {
  sendEvent("select_ai_video", { video_id: video.id, video_title: video.title, youtube_url: video.youtubeUrl });
}

function trackShuyiVideo(video) {
  sendEvent("select_shuyi_video", {
    video_id: video.id, video_title: video.title, channel: video.channel, href: video.youtubeUrl
  });
}

function renderMediaLatest(target, record, kind) {
  if (!target || !record) return;
  const isPodcast = kind === "podcast";
  const link = document.createElement("a");
  link.className = "media-latest-link";
  link.href = isPodcast ? record.href : record.youtubeUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.dataset.contentId = record.id;
  link.dataset.contentType = kind;
  link.dataset.publishedAt = publicationValue(record);
  const image = document.createElement("img");
  image.className = "media-latest-image";
  image.src = isPodcast ? (record.artwork || "assets/images/shuyi-podcast-cover.jpg")
    : (record.thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(record.id)}/hqdefault.jpg`);
  image.alt = "";
  image.width = 480;
  image.height = isPodcast ? 480 : 360;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => { image.hidden = true; }, { once: true });
  const copy = document.createElement("span");
  copy.className = "media-latest-copy";
  const meta = document.createElement("span");
  meta.className = "media-latest-meta";
  const category = document.createElement("span");
  category.textContent = isPodcast ? "Podcast" : kind === "mica"
    ? (record.contentCategory === "theater" ? "AI 小劇場" : "AI 知識")
    : (record.format === "short" ? "YouTube Shorts" : "動畫影片");
  const date = document.createElement("time");
  date.dateTime = publicationValue(record);
  date.textContent = formatContentDate(publicationValue(record));
  meta.append(category, date);
  const title = document.createElement("strong");
  title.className = "media-latest-title";
  title.textContent = record.title;
  const action = document.createElement("span");
  action.className = "media-latest-action";
  action.textContent = isPodcast ? "收聽本集 ↗" : "在 YouTube 觀看 ↗";
  copy.append(meta, title, action);
  link.append(image, copy);
  link.addEventListener("click", () => {
    if (isPodcast) trackPodcastEpisode(record);
    else if (kind === "mica") trackAiVideo(record);
    else trackShuyiVideo(record);
  });
  replacePreservingFocus(target, link);
}

async function bootstrapMediaLatest() {
  const micaTarget = document.querySelector("#mica-latest");
  const shuyiTarget = document.querySelector("#shuyi-latest");
  if (!micaTarget && !shuyiTarget) return;
  const [mica, shuyi, podcasts] = await Promise.allSettled([
    loadJson("assets/data/ai-videos.json"), loadJson("assets/data/shuyi-videos.json"), loadJson("assets/data/podcast-episodes.json")
  ]);
  if (micaTarget) {
    const latest = mica.status === "fulfilled" ? mica.value.filter((video) => video.status === "published"
      && video.youtubeUrl && isPublishedRecord(video)).sort((a, b) => publicationTimestamp(b) - publicationTimestamp(a))[0] : null;
    if (latest) renderMediaLatest(micaTarget, latest, "mica");
    else appendLoadStatus(micaTarget, "最新影音資料暫時無法核對，仍可開啟原作或影音庫。");
  }
  if (shuyiTarget) {
    if (shuyi.status === "fulfilled" && podcasts.status === "fulfilled") {
      const candidates = [
        ...shuyi.value.filter((video) => video.status === "published" && video.youtubeUrl && isPublishedRecord(video))
          .map((record) => ({ record, kind: "shuyi" })),
        ...podcasts.value.filter((episode) => episode.href && isPublishedRecord(episode))
          .map((record) => ({ record, kind: "podcast" }))
      ].sort((a, b) => publicationTimestamp(b.record) - publicationTimestamp(a.record));
      if (candidates[0]) {
        renderMediaLatest(shuyiTarget, candidates[0].record, candidates[0].kind);
        return;
      }
    }
    appendLoadStatus(shuyiTarget, "最新故事資料暫時無法核對，仍可開啟原作或內容館。");
  }
}

function trackAiLabProject(project) {
  sendEvent("select_ai_lab_project", {
    project_id: project.id,
    project_title: project.title,
    project_type: project.type,
    youtube_url: project.youtubeUrl
  });
}

function renderAiLabProjects(projects) {
  const target = document.querySelector("#ai-lab-projects");
  if (!target) return;
  const trials = projects.filter((project) => project.status === "published"
    && project.type !== "video-reference" && project.youtubeUrl).sort((a, b) => a.order - b.order);
  if (!trials.length) {
    appendLoadStatus(target, "試作記錄資料暫時無法核對，仍可使用現有原作連結。");
    return;
  }
  const items = trials.map((project) => {
    const item = document.createElement("li");
    item.className = "lab-record";
    item.dataset.projectId = project.id;
    item.dataset.projectType = project.type;
    item.dataset.youtubeId = project.youtubeId;
    const link = document.createElement("a");
    link.className = "lab-record-link";
    link.href = project.youtubeUrl;
    link.target = "_blank";
    link.rel = "noopener";
    const title = document.createElement("span");
    title.className = "lab-record-title";
    title.textContent = project.title;
    const description = document.createElement("span");
    description.className = "lab-record-description";
    description.textContent = project.description;
    const action = document.createElement("span");
    action.className = "lab-record-action";
    action.textContent = "在 YouTube 開啟 ↗";
    link.append(title, description, action);
    link.addEventListener("click", () => trackAiLabProject(project));
    item.append(link);
    return item;
  });
  replacePreservingFocus(target, ...items);
}

async function bootstrapAiLabProjects() {
  const target = document.querySelector("#ai-lab-projects");
  if (!target) return;
  try {
    renderAiLabProjects(await loadJson("assets/data/ai-lab-projects.json"));
  } catch (_error) {
    appendLoadStatus(target, "試作記錄資料暫時無法載入，仍可使用現有原作連結。");
  }
}

function bindHomeCategoryTracking() {
  document.querySelectorAll(".track-home-category").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_home_category", {
        category_id: element.dataset.categoryId,
        category_name: element.dataset.categoryName,
        href: element.getAttribute("href")
      });
    });
  });
}

function bindBrandHubTracking() {
  document.querySelectorAll(".brand-hub-link").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_brand_hub", {
        hub_item: element.dataset.hubItem,
        target: element.dataset.target || element.getAttribute("href")
      });
    });
  });
}

function bindHomePrimaryActionTracking() {
  document.querySelectorAll(".track-home-primary-action").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_home_primary_action", {
        action_name: element.dataset.actionName,
        href: element.getAttribute("href")
      });
    });
  });
}

function bindPodcastTracking() {
  document.querySelectorAll(".track-podcast").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_podcast", {
        podcast_title: element.dataset.podcastTitle,
        platform: element.dataset.platform,
        url: element.getAttribute("href")
      });
    });
  });
}

function bindPodcastSeriesTracking() {
  document.querySelectorAll(".track-podcast-series").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_podcast_series", {
        series_name: element.dataset.seriesName,
        href: element.getAttribute("href")
      });
    });
  });
}

function trackPodcastEpisode(episode) {
  sendEvent("select_podcast_episode", {
    episode_id: episode.id,
    episode_title: episode.title,
    platform: episode.platform,
    href: episode.href
  });
}



function bindAiNoteTracking() {
  const status = document.createElement("p");
  status.className = "interaction-status";
  status.setAttribute("role", "status");
  document.querySelector(".note-upcoming, .note-list")?.after(status);
  document.querySelectorAll(".track-ai-note").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_ai_note", {
        note_title: element.dataset.noteTitle,
        status: element.dataset.status
      });
      if (element.tagName === "BUTTON") status.textContent = `${element.dataset.noteTitle}：${element.dataset.status}`;
    });
  });
}

function bindLabProjectTracking() {
  document.querySelectorAll(".track-lab-project").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_lab_project", {
        project_title: element.dataset.projectTitle,
        status: element.dataset.status
      });
    });
  });
}



async function bootstrapCourseHub() {
  const target = document.querySelector("#course-hub-grid");
  try {
    const courses = await loadJson("assets/data/courses-hub.json");
    renderCourseHub(courses);
  } catch (_error) {
    appendLoadStatus(target, "課程資料暫時無法載入，仍可使用現有課程入口。");
  }
}

async function bootstrapRecentUpdates() {
  const target = document.querySelector("#recent-updates-grid");
  if (!target) return;
  const results = await Promise.allSettled([
    loadJson("assets/data/site-updates.json"), loadJson("assets/data/ai-videos.json"),
    loadJson("assets/data/shuyi-videos.json"), loadJson("assets/data/podcast-episodes.json")
  ]);
  if (results.every((result) => result.status === "fulfilled")) {
    renderRecentUpdates(...results.map((result) => result.value));
  } else {
    appendLoadStatus(target, "近期資料暫時無法核對，仍可使用現有內容連結。");
  }
}

async function bootstrapInteractiveProjects() {
  const target = document.querySelector(
    "#interactive-feature-projects"
  );

  if (!target) return;

  try {
    const projects = await loadJson(
      "assets/data/interactive-projects.json"
    );

    renderInteractiveProjects(projects);
  } catch (_error) {
    appendLoadStatus(target, "代表作品資料暫時無法載入，仍可使用現有作品連結。");
  }
}

async function bootstrapCourses() {
  const target = document.querySelector("#course-grid");
  if (!target) return;
  try {
    renderCourses(await loadJson("assets/data/courses.json"));
  } catch (_error) {
    appendLoadStatus(target, "學習資料暫時無法載入，仍可使用現有平台與練習入口。");
  }
}

function bindSectionNavigation() {
  const links = Array.from(document.querySelectorAll('.top-nav-links a[href^="#"]'));
  if (!links.length || !("IntersectionObserver" in window)) return;
  const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean)
    .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  if (!sections.length) return;
  const navigation = document.querySelector(".top-nav");
  const headings = sections.map((section) => section.querySelector("h2") || section);
  let observer;
  const readingLine = () => {
    const height = Math.max(2, innerHeight);
    return Math.min(height, Math.max(navigation.getBoundingClientRect().height + 9, Math.round(height * 0.35)));
  };
  const refresh = () => {
    const stripBottom = readingLine();
    let currentHash = null;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= stripBottom) currentHash = `#${sections[index].id}`;
    });
    if (sections.at(-1).getBoundingClientRect().bottom < stripBottom) currentHash = null;
    links.forEach((link) => {
      if (link.hash === currentHash) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };
  const observe = () => {
    if (observer) observer.disconnect();
    const height = Math.max(2, innerHeight);
    const stripBottom = readingLine();
    const stripTop = stripBottom - 1;
    observer = new IntersectionObserver(refresh, {
      rootMargin: `${-stripTop}px 0px ${-(height - stripBottom)}px 0px`, threshold: 0
    });
    headings.forEach((heading) => observer.observe(heading));
    sections.forEach((section) => observer.observe(section));
    refresh();
  };
  observe();
  window.addEventListener("resize", observe, { passive: true });
}

function bindMobileNavigation() {
  const button = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('#home-section-navigation');
  if (!button || !navigation) return;
  const mobile = window.matchMedia('(max-width: 820px)');
  let open = false;
  const update = () => {
    button.hidden = !mobile.matches;
    button.setAttribute('aria-expanded', String(open));
    button.firstChild.textContent = open ? '關閉導覽' : '導覽';
    button.querySelector('span').textContent = open ? '−' : '＋';
    navigation.hidden = mobile.matches && !open;
  };
  button.addEventListener('click', () => { open = !open; update(); });
  navigation.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link || !mobile.matches) return;
    const section = document.querySelector(link.hash);
    if (!section) return;
    event.preventDefault();
    open = false;
    update();
    history.pushState(null, '', link.hash);
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    const heading = section.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !open) return;
    open = false;
    update();
    button.focus();
  });
  mobile.addEventListener('change', () => { open = false; update(); });
  update();
}

function bindEditorialEntrances() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const observed = new WeakSet();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (!reduced.matches) entry.target.animate(
        [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    });
  }, { threshold: 0.08 });
  const watch = () => document.querySelectorAll('.home-page .section-head, .home-page .interactive-feature-card, .home-page .footer-wordmark').forEach((element) => {
    if (!observed.has(element)) { observed.add(element); observer.observe(element); }
  });
  watch();
  const projects = document.querySelector('#interactive-feature-projects');
  if (projects) {
    const changes = new MutationObserver(() => {
      if (projects.querySelector('.interactive-feature-card')) { watch(); changes.disconnect(); }
    });
    changes.observe(projects, { childList: true });
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      observer.disconnect();
      document.querySelectorAll('.section-head, .interactive-feature-card, .footer-wordmark').forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
    }
  });
}

bindMobileNavigation();
bindSectionNavigation();
bindEditorialEntrances();
bindHomeCategoryTracking();
bindBrandHubTracking();
bindHomePrimaryActionTracking();
bindPodcastTracking();
bindPodcastSeriesTracking();
bindAiNoteTracking();
bindLabProjectTracking();
bootstrapMediaLatest();
bootstrapAiLabProjects();
bootstrapRecentUpdates();
bootstrapInteractiveProjects();
bootstrapCourseHub();
bootstrapCourses();
