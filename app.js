async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function sendEvent(name, parameters) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
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

    cover.src = course.cover;
    cover.alt = `${course.title}課程封面`;
    cover.addEventListener("error", () => {
      cover.hidden = true;
      fallback.hidden = false;
    });
    fallback.hidden = true;

    fragment.querySelector(".course-status").textContent = course.status;
    fragment.querySelector(".course-subtitle").textContent = course.subtitle;
    fragment.querySelector(".course-feature-title").textContent = course.title;
    fragment.querySelector(".course-feature-description").textContent = course.description;

    card.addEventListener("click", () => trackCourseHub(course, course.href || "#course-hub"));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        trackCourseHub(course, course.href || "#course-hub");
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

function trackAiVideo(video) {
  sendEvent("select_ai_video", {
    video_id: video.videoId,
    video_title: video.videoTitle,
    youtube_url: video.youtubeUrl
  });
}

function bindAiVideoTracking() {
  document.querySelectorAll(".ai-video-card").forEach((card) => {
    const video = {
      videoId: card.dataset.videoId,
      videoTitle: card.dataset.videoTitle,
      youtubeUrl: card.dataset.youtubeUrl
    };

    card.addEventListener("click", () => trackAiVideo(video));
  });
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
  const panel = document.querySelector("#learning-games-panel");

  if (!button || !panel) return;

  button.addEventListener("click", () => {
    const nextExpanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "收合練習列表" : "展開練習列表";

    if (nextExpanded) {
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add("is-expanded"));
    } else {
      panel.classList.remove("is-expanded");
      window.setTimeout(() => {
        if (button.getAttribute("aria-expanded") !== "true") {
          panel.hidden = true;
        }
      }, 230);
    }

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
  try {
    const courses = await loadJson("assets/data/courses.json");
    renderCourses(courses);
  } catch (_error) {
    target.innerHTML = '<p class="load-fallback">課程資料載入中發生問題，請重新整理頁面再試一次。</p>';
  }
}

bindAiVideoTracking();
bindHomeCategoryTracking();
bindBrandHubTracking();
bindPodcastTracking();
bindAiNoteTracking();
bindLabProjectTracking();
bindLearningGamesToggle();
bootstrapCourseHub();
bootstrapPodcastEpisodes();
bootstrapCourses();
