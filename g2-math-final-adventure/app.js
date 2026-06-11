const STORAGE_KEY = "g2MathFinalAdventure";
const state = {
  activeWorldIndex: 0,
  activeQuestionIndex: 0,
  score: 0,
  selectedWorldQuestions: [],
  missed: [],
  answered: false,
  progress: loadProgress()
};

const $ = (selector) => document.querySelector(selector);

const screens = {
  home: $("#home-screen"),
  map: $("#map-screen"),
  level: $("#level-screen"),
  summary: $("#summary-screen")
};

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { worlds: {} };
  } catch {
    return { worlds: {} };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => {
    screen.hidden = key !== name;
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getWorldQuestions(worldName) {
  return MATH_QUESTIONS.filter((question) => question.world === worldName);
}

function renderMap() {
  const mapBoard = $("#map-board");
  const allDone = GAME_WORLDS.every((world) => state.progress.worlds[world.id]?.completed);

  mapBoard.classList.toggle("city-awake", allDone);
  mapBoard.innerHTML = GAME_WORLDS.map((world, index) => {
    const saved = state.progress.worlds[world.id];
    const completed = Boolean(saved?.completed);
    const best = saved?.bestScore ?? 0;
    const isFinal = world.id === "final";
    return `
      <button class="world-card ${completed ? "completed" : ""} ${isFinal && allDone ? "final-lit" : ""}" data-world-index="${index}" type="button">
        <span class="world-step">${index + 1}</span>
        <span class="world-badge" style="--badge:${world.color}">${world.shortLabel}</span>
        <span class="world-name">${world.world}</span>
        <span class="world-practice">${world.practice}</span>
        <span class="world-best">${completed ? `已點亮｜最高 ${best} 分` : "等待挑戰"}</span>
      </button>
    `;
  }).join("");

  if (allDone) {
    mapBoard.insertAdjacentHTML("beforeend", `<div class="city-message">星光城亮起來了！</div>`);
  }

  mapBoard.querySelectorAll(".world-card").forEach((card) => {
    card.addEventListener("click", () => startWorld(Number(card.dataset.worldIndex)));
  });
}

function startWorld(index) {
  state.activeWorldIndex = index;
  state.activeQuestionIndex = 0;
  state.score = 0;
  state.missed = [];
  state.answered = false;
  state.selectedWorldQuestions = getWorldQuestions(GAME_WORLDS[index].world);
  renderQuestion();
  showScreen("level");
}

function renderQuestion() {
  const world = GAME_WORLDS[state.activeWorldIndex];
  const question = state.selectedWorldQuestions[state.activeQuestionIndex];
  const progressPercent = (state.activeQuestionIndex / state.selectedWorldQuestions.length) * 100;

  $("#level-kicker").textContent = `任務 ${state.activeWorldIndex + 1}｜${world.practice}`;
  $("#level-title").textContent = world.world;
  $("#score-pill").textContent = `${state.score} 分`;
  $("#question-count").textContent = `第 ${state.activeQuestionIndex + 1} 題 / ${state.selectedWorldQuestions.length} 題`;
  $("#progress-fill").style.width = `${progressPercent}%`;
  $("#skill-tag").textContent = question.skill;
  $("#question-text").textContent = question.question;
  $("#question-scene").textContent = question.visual || makeScene(world.id);
  $("#feedback").hidden = true;
  $("#feedback").className = "feedback";
  $("#next-question").hidden = true;
  state.answered = false;

  $("#choices").innerHTML = question.choices.map((choice) => `
    <button class="choice-button" type="button" data-choice="${escapeHtml(choice)}">${choice}</button>
  `).join("");

  $("#choices").querySelectorAll(".choice-button").forEach((button) => {
    button.addEventListener("click", () => answerQuestion(button.dataset.choice));
  });
}

function answerQuestion(choice) {
  if (state.answered) return;
  state.answered = true;

  const question = state.selectedWorldQuestions[state.activeQuestionIndex];
  const isCorrect = choice === question.answer;
  const feedback = $("#feedback");

  if (isCorrect) {
    state.score += 10;
  } else {
    state.missed.push({ question: question.question, answer: question.answer, explanation: question.explanation });
  }

  $("#score-pill").textContent = `${state.score} 分`;
  $("#choices").querySelectorAll(".choice-button").forEach((button) => {
    button.disabled = true;
    if (button.dataset.choice === question.answer) button.classList.add("correct-choice");
    if (button.dataset.choice === choice && !isCorrect) button.classList.add("wrong-choice");
  });

  feedback.hidden = false;
  feedback.classList.add(isCorrect ? "correct" : "wrong");
  feedback.innerHTML = `
    <strong>${isCorrect ? "答對了" : "再想一下"}</strong>
    <span>${question.explanation}</span>
  `;

  $("#next-question").textContent = state.activeQuestionIndex === state.selectedWorldQuestions.length - 1 ? "看任務結果" : "下一題";
  $("#next-question").hidden = false;
}

function nextQuestion() {
  if (state.activeQuestionIndex < state.selectedWorldQuestions.length - 1) {
    state.activeQuestionIndex += 1;
    renderQuestion();
    return;
  }
  completeWorld();
}

function completeWorld() {
  const world = GAME_WORLDS[state.activeWorldIndex];
  const previous = state.progress.worlds[world.id]?.bestScore ?? 0;
  state.progress.worlds[world.id] = {
    completed: true,
    bestScore: Math.max(previous, state.score)
  };
  saveProgress();
  renderSummary(world);
  showScreen("summary");
}

function renderSummary(world) {
  const allDone = GAME_WORLDS.every((item) => {
    if (item.id === world.id) return true;
    return state.progress.worlds[item.id]?.completed;
  });
  const title = allDone && world.id === "final" ? "星光城亮起來了！" : `${world.world}亮起來了！`;
  const message = state.score >= 90
    ? "太棒了，你的數學星星閃閃發亮！"
    : state.score >= 70
      ? "做得很好，再把錯題看一次就更穩了。"
      : "你已經完成任務了，慢慢再挑戰一次也很勇敢。";

  $("#summary-world").textContent = `任務完成｜${world.practice}`;
  $("#summary-title").textContent = title;
  $("#summary-score").textContent = `${state.score} / 100 分`;
  $("#summary-message").textContent = message;

  const mistakeBox = $("#mistake-box");
  if (state.missed.length === 0) {
    mistakeBox.innerHTML = `<h3>錯題整理</h3><p>這一關全部答對，星光收集滿滿！</p>`;
    return;
  }

  mistakeBox.innerHTML = `
    <h3>錯題整理</h3>
    ${state.missed.map((item, index) => `
      <div class="mistake-item">
        <strong>${index + 1}. ${item.question}</strong>
        <p>正確答案：${item.answer}</p>
        <p>${item.explanation}</p>
      </div>
    `).join("")}
  `;
}

function continueAdventure() {
  const firstUnfinishedIndex = GAME_WORLDS.findIndex((world) => !state.progress.worlds[world.id]?.completed);
  startWorld(firstUnfinishedIndex === -1 ? 0 : firstUnfinishedIndex);
}

function makeScene(worldId) {
  const scenes = {
    calc: "⛰️ ✨ ✨ ✨",
    measure: "🌈 📏 🌉",
    shape: "🌲 🧊 🥫 ⚽",
    share: "🧺 🍪 🍅",
    fraction: "🍰 🌊 ◐",
    final: "🏰 ✦ ✦ ✦"
  };
  return scenes[worldId] || "✨";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

$("#start-adventure").addEventListener("click", continueAdventure);
$("#open-map").addEventListener("click", () => {
  renderMap();
  showScreen("map");
});
$("#back-home").addEventListener("click", () => showScreen("home"));
$("#continue-adventure").addEventListener("click", continueAdventure);
$("#level-map-button").addEventListener("click", () => {
  renderMap();
  showScreen("map");
});
$("#next-question").addEventListener("click", nextQuestion);
$("#replay-level").addEventListener("click", () => startWorld(state.activeWorldIndex));
$("#summary-map").addEventListener("click", () => {
  renderMap();
  showScreen("map");
});

renderMap();
