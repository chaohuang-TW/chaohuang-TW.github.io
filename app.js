async function loadCourses() {
  const response = await fetch("assets/data/courses.json");
  if (!response.ok) throw new Error("Failed to load courses");
  return response.json();
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
  if (typeof window.gtag === "function") {
    window.gtag("event", "select_ai_video", {
      video_id: video.videoId,
      video_title: video.videoTitle,
      youtube_url: video.youtubeUrl
    });
  }
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

async function bootstrap() {
  const target = document.querySelector("#course-grid");
  try {
    const courses = await loadCourses();
    renderCourses(courses);
  } catch (_error) {
    target.innerHTML = '<p class="load-fallback">課程資料載入中發生問題，請重新整理頁面再試一次。</p>';
  }
}

bindAiVideoTracking();
bootstrap();
