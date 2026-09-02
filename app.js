async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

let learningCourses = [];

function sendEvent(name, parameters) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
}

function formatSiteUpdateDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return value;

  return `${match[1]}.${match[2]}.${match[3]}`;
}

function createRecentUpdateCard(update) {
  const card = document.createElement("article");
  card.className = "recent-update-card";

  const meta = document.createElement("div");
  meta.className = "recent-update-meta";

  const date = document.createElement("time");
  date.dateTime = update.date;
  date.textContent = formatSiteUpdateDate(update.date);

  const type = document.createElement("span");
  type.className = "recent-update-type";
  type.textContent = update.type;

  meta.append(date, type);

  const title = document.createElement("h3");
  title.className = "recent-update-title";
  title.textContent = update.title;

  card.append(meta, title);

  if (update.description) {
    const description = document.createElement("p");
    description.className = "recent-update-description";
    description.textContent = update.description;
    card.append(description);
  }

  const link = document.createElement("a");
  link.className = "recent-update-link";
  link.href = update.href;
  link.textContent = `${update.cta} →`;

  if (update.external === true) {
    link.target = "_blank";
    link.rel = "noopener";
  }

  link.addEventListener("click", () => {
    sendEvent("select_site_update", {
      update_id: update.id,
      update_type: update.type,
      update_title: update.title,
      href: update.href
    });
  });

  card.append(link);

  return card;
}

function renderRecentUpdates(updates) {
  const target = document.querySelector("#recent-updates-grid");

  if (!target) return;

  const latestUpdates = updates
    .filter((update) => update.status === "published")
    .sort((current, next) => (
      next.date.localeCompare(current.date)
    ))
    .slice(0, 3);

  target.replaceChildren();

  if (latestUpdates.length === 0) {
    const fallback = document.createElement("p");
    fallback.className = "load-fallback";
    fallback.textContent = "目前沒有新的公開內容。";
    target.append(fallback);
    return;
  }

  latestUpdates.forEach((update) => {
    target.append(createRecentUpdateCard(update));
  });
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

  content.append(copy, facts);
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
    .sort((current, next) => (
      next.order - current.order
    ));

  target.replaceChildren();

  if (featuredProjects.length === 0) {
    const fallback = document.createElement("p");
    fallback.className = "load-fallback";
    fallback.textContent = "代表作品暫時無法顯示。";
    target.append(fallback);
    return;
  }

  featuredProjects.forEach((project) => {
    target.append(createFeaturedInteractiveProject(project));
  });
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
    fragment.querySelector(".course-feature-title").textContent = course.title;
    fragment.querySelector(".course-feature-description").textContent = course.description;

    card.addEventListener("click", () => {
      trackCourseHub(course, course.href || "#course-hub");
      if (course.href) {
        window.location.href = course.href;
      }
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        trackCourseHub(course, course.href || "#course-hub");
        if (course.href) {
          window.location.href = course.href;
        }
      }
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

    course.resources.forEach((resource) => {
      const button = document.createElement("button");
      button.className = "course-resource-item";
      button.type = "button";
      button.innerHTML = `<span>${resource.label}</span><strong>${resource.status}</strong>`;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        trackCourseHub(course, resource.target || resource.label);
      });
      resourceList.append(button);
    });

    target.append(fragment);
  });
}

function renderCourses(courses) {
  const target = document.querySelector("#course-grid");
  const template = document.querySelector("#course-card-template");

  if (!target || !template) return;

  target.replaceChildren();

  courses.forEach((course) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".course-card");
    card.href = course.href;
    card.querySelector(".course-label").textContent = course.cardLabel;
    card.querySelector(".course-name").textContent = course.name;
    card.querySelector(".course-focus").textContent = `能力重點：${course.focus}`;
    card.addEventListener("click", () => {
      if (typeof window.gtag === "function") {
        window.gtag("event", "select_course", {
          course_id: course.id,
          course_name: course.name,
          subject: course.subject,
          lesson: course.lesson,
          href: course.href
        });
      }
    });
    target.append(fragment);
  });
}

function getFeaturedCourses(courses) {
  return courses
    .filter((course) => course.featured === true)
    .sort((current, next) => (
      (current.homeOrder || 99) - (next.homeOrder || 99)
    ));
}

function renderLearningCourses(expanded) {
  renderCourses(
    expanded
      ? learningCourses
      : getFeaturedCourses(learningCourses)
  );
}

function trackAiVideo(video) {
  sendEvent("select_ai_video", {
    video_id: video.id,
    video_title: video.title,
    youtube_url: video.youtubeUrl
  });
}

function createAiVideoCard(video, format, showDescription = false) {
  const card = document.createElement("article");
  card.className = `ai-video-card is-${format}`;
  card.dataset.videoId = video.id;
  card.dataset.videoTitle = video.title;
  card.dataset.youtubeUrl = video.youtubeUrl;
  card.dataset.videoFormat = format;

  const link = document.createElement("a");
  link.className = "ai-video-link";
  link.href = video.youtubeUrl;
  link.target = "_blank";
  link.rel = "noopener";

  const title = document.createElement("span");
  title.textContent = video.title;

  const action = document.createElement("span");
  action.textContent = "在 YouTube 開啟";

  link.append(title, action);
  link.addEventListener("click", () => trackAiVideo(video));
  card.append(link);

  if (showDescription && video.description) {
    const description = document.createElement("p");
    description.className = "ai-video-description";
    description.textContent = video.description;
    card.append(description);
  }

  const frame = document.createElement("div");
  frame.className = `ai-video-frame is-${format}`;

  const iframe = document.createElement("iframe");
  iframe.src = video.embedUrl;
  iframe.title = video.title;
  iframe.loading = "lazy";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;

  frame.append(iframe);
  card.append(frame);
  return card;
}

function renderAiVideos(videos) {
  const featureTarget = document.querySelector("#ai-video-feature");
  const shortsTarget = document.querySelector("#ai-video-grid");

  if (!featureTarget || !shortsTarget) return;

  const publishedVideos = videos.filter((video) => video.status === "published");
  const featuredVideo = publishedVideos
    .filter((video) => video.featured === true && video.format === "standard")
    .sort((current, next) => next.order - current.order)[0];
  const latestShorts = publishedVideos
    .filter((video) => (video.format || "short") === "short")
    .sort((current, next) => next.order - current.order)
    .slice(0, 3);

  featureTarget.replaceChildren();
  shortsTarget.replaceChildren();

  if (featuredVideo) {
    featureTarget.append(createAiVideoCard(featuredVideo, "standard", true));
  }

  latestShorts.forEach((video) => {
    shortsTarget.append(createAiVideoCard(video, "short"));
  });
}

async function bootstrapAiVideos() {
  const featureTarget = document.querySelector("#ai-video-feature");
  const shortsTarget = document.querySelector("#ai-video-grid");
  if (!featureTarget || !shortsTarget) return;

  try {
    const videos = await loadJson("assets/data/ai-videos.json");
    renderAiVideos(videos);
  } catch (_error) {
    featureTarget.innerHTML = '<p class="load-fallback">短片資料暫時無法載入。</p>';
    shortsTarget.innerHTML = '<p class="load-fallback">短片資料暫時無法載入。</p>';
  }
}

function trackShuyiVideo(video) {
  sendEvent("select_shuyi_video", {
    video_id: video.id,
    video_title: video.title,
    channel: video.channel,
    href: video.youtubeUrl
  });
}

function createShuyiVideoFeature(video) {
  const article = document.createElement("article");
  article.className = "shuyi-video-feature";

  const media = document.createElement("a");
  media.className = "shuyi-video-media";
  media.href = video.youtubeUrl;
  media.target = "_blank";
  media.rel = "noopener";

  const image = document.createElement("img");
  image.className = "shuyi-video-thumbnail";
  image.src = video.thumbnail;
  image.alt = video.thumbnailAlt;
  image.loading = "lazy";
  image.decoding = "async";

  const playIndicator = document.createElement("span");
  playIndicator.className = "shuyi-video-play";
  playIndicator.setAttribute("aria-hidden", "true");
  playIndicator.textContent = "▶";

  media.append(image, playIndicator);
  media.addEventListener("click", () => trackShuyiVideo(video));

  const copy = document.createElement("div");
  copy.className = "shuyi-video-copy";

  const label = document.createElement("p");
  label.className = "shuyi-video-label";
  label.textContent = `${video.channel} · YouTube Shorts`;

  const title = document.createElement("h3");
  title.className = "shuyi-video-title";
  title.textContent = video.title;

  const description = document.createElement("p");
  description.className = "shuyi-video-description";
  description.textContent = video.description;

  const link = document.createElement("a");
  link.className = "shuyi-video-link";
  link.href = video.youtubeUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "觀看影片 →";
  link.addEventListener("click", () => trackShuyiVideo(video));

  copy.append(label, title, description, link);
  article.append(media, copy);

  return article;
}

function renderShuyiVideos(videos) {
  const target = document.querySelector("#shuyi-video-feature");

  if (!target) return;

  const latestVideo = videos
    .filter((video) => video.status === "published" && video.featured === true)
    .sort((current, next) => next.order - current.order)[0];

  target.replaceChildren();

  if (!latestVideo) {
    const fallback = document.createElement("p");
    fallback.className = "load-fallback";
    fallback.textContent = "目前沒有新的叔姨講古動畫。";
    target.append(fallback);
    return;
  }

  target.append(createShuyiVideoFeature(latestVideo));
}

async function bootstrapShuyiVideos() {
  const target = document.querySelector("#shuyi-video-feature");

  if (!target) return;

  try {
    const videos = await loadJson("assets/data/shuyi-videos.json");
    renderShuyiVideos(videos);
  } catch (_error) {
    target.replaceChildren();
    const fallback = document.createElement("p");
    fallback.className = "load-fallback";
    fallback.textContent = "叔姨講古動畫資料暫時無法載入。";
    target.append(fallback);
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

  projects
    .filter((project) => project.status === "published")
    .sort((current, next) => current.order - next.order)
    .forEach((project) => {
      const isVideoReference = project.type === "video-reference";
      const card = document.createElement("article");
      card.className = "lab-project-card";
      card.dataset.projectId = project.id;
      card.dataset.projectType = project.type;
      card.dataset.youtubeId = project.youtubeId;

      const copy = document.createElement("div");
      copy.className = "lab-project-copy";

      const label = document.createElement("span");
      label.className = "lab-project-label";
      label.textContent = isVideoReference ? "Mica AI video" : "AI experiment";

      const title = document.createElement("h3");
      title.textContent = project.title;

      const description = document.createElement("p");
      description.textContent = project.description;

      const link = document.createElement("a");
      link.className = "lab-project-link";
      link.href = isVideoReference ? project.href : project.youtubeUrl;
      link.textContent = isVideoReference ? "前往 Mica AI 影音庫觀看" : "在 YouTube 開啟";
      if (!isVideoReference) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      link.addEventListener("click", () => trackAiLabProject(project));

      copy.append(label, title, description, link);

      if (isVideoReference) {
        card.append(copy);
        target.append(card);
        return;
      }

      const frame = document.createElement("div");
      frame.className = "lab-video-frame";

      const iframe = document.createElement("iframe");
      iframe.src = project.embedUrl;
      iframe.title = project.title;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;

      frame.append(iframe);
      card.append(copy, frame);
      target.append(card);
    });
}

async function bootstrapAiLabProjects() {
  const target = document.querySelector("#ai-lab-projects");
  if (!target) return;

  try {
    const projects = await loadJson("assets/data/ai-lab-projects.json");
    renderAiLabProjects(projects);
  } catch (_error) {
    target.innerHTML = '<p class="load-fallback">AI 實驗室內容暫時無法載入。</p>';
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

function renderPodcastEpisodes(episodes) {
  const target = document.querySelector("#podcast-episodes");

  if (!target) return;

  episodes
    .filter((episode) => episode.featured)
    .forEach((episode) => {
      const link = document.createElement("a");
      link.className = "podcast-episode-card podcast-episode-link";
      link.href = episode.href;
      link.target = "_blank";
      link.rel = "noopener";

      [
        ["span", "episode-label", "episode"],
        ["strong", "podcast-episode-title", episode.title],
        ["span", "podcast-episode-subtitle", episode.subtitle],
        ["span", "podcast-episode-description", episode.description],
        ["span", "podcast-episode-cta", "收聽本集"]
      ].forEach(([tagName, className, text]) => {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        link.append(element);
      });

      link.addEventListener("click", () => trackPodcastEpisode(episode));
      target.append(link);
    });
}

function bindAiNoteTracking() {
  document.querySelectorAll(".track-ai-note").forEach((element) => {
    element.addEventListener("click", () => {
      sendEvent("select_ai_note", {
        note_title: element.dataset.noteTitle,
        status: element.dataset.status
      });
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

function bindLearningGamesToggle() {
  const button = document.querySelector(".learning-toggle");

  if (!button) return;

  button.addEventListener("click", () => {
    if (learningCourses.length === 0) return;

    const nextExpanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(nextExpanded));
    renderLearningCourses(nextExpanded);
    button.textContent = nextExpanded
      ? "收合練習列表"
      : `查看全部 ${learningCourses.length} 個練習`;

    sendEvent("toggle_learning_games", {
      expanded: nextExpanded
    });
  });
}

async function bootstrapCourseHub() {
  const target = document.querySelector("#course-hub-grid");
  try {
    const courses = await loadJson("assets/data/courses-hub.json");
    renderCourseHub(courses);
  } catch (_error) {
    target.innerHTML = '<p class="load-fallback">課程中心資料載入中發生問題，請重新整理頁面再試一次。</p>';
  }
}

async function bootstrapRecentUpdates() {
  const target = document.querySelector("#recent-updates-grid");

  if (!target) return;

  try {
    const updates = await loadJson("assets/data/site-updates.json");
    renderRecentUpdates(updates);
  } catch (_error) {
    target.innerHTML =
      '<p class="load-fallback">最近更新資料暫時無法載入。</p>';
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
    target.innerHTML =
      '<p class="load-fallback">'
      + "代表作品資料暫時無法載入。"
      + "</p>";
  }
}

async function bootstrapPodcastEpisodes() {
  const target = document.querySelector("#podcast-episodes");
  if (!target) return;

  try {
    const episodes = await loadJson("assets/data/podcast-episodes.json");
    renderPodcastEpisodes(episodes);
  } catch (_error) {
    target.innerHTML = '<p class="load-fallback">Podcast 集數資料載入中發生問題，請重新整理頁面再試一次。</p>';
  }
}

async function bootstrapCourses() {
  const target = document.querySelector("#course-grid");
  const button = document.querySelector(".learning-toggle");

  try {
    learningCourses = await loadJson("assets/data/courses.json");

    const featuredCourses = getFeaturedCourses(learningCourses);

    if (featuredCourses.length !== 3) {
      throw new Error("Featured learning course count must be 3");
    }

    renderLearningCourses(false);

    if (button) {
      button.disabled = false;
      button.textContent = `查看全部 ${learningCourses.length} 個練習`;
    }
  } catch (_error) {
    learningCourses = [];

    if (target) {
      target.innerHTML = '<p class="load-fallback">課程資料載入中發生問題，請重新整理頁面再試一次。</p>';
    }

    if (button) {
      button.disabled = true;
      button.textContent = "練習暫時無法載入";
    }
  }
}

bindHomeCategoryTracking();
bindBrandHubTracking();
bindHomePrimaryActionTracking();
bindPodcastTracking();
bindPodcastSeriesTracking();
bindAiNoteTracking();
bindLabProjectTracking();
bindLearningGamesToggle();
bootstrapAiVideos();
bootstrapShuyiVideos();
bootstrapAiLabProjects();
bootstrapRecentUpdates();
bootstrapInteractiveProjects();
bootstrapCourseHub();
bootstrapPodcastEpisodes();
bootstrapCourses();
