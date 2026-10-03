/* The homepage laboratory is a local demonstration; it never reads or writes course progress. */
(() => {
  'use strict';

  function initialiseLab() {
    const root = document.querySelector('.creation-lab');
    if (!root || root.dataset.enhanced === 'true') return;

    const canvas = root.querySelector('#lab-canvas');
    const viewport = root.querySelector('.lab-viewport');
    const image = root.querySelector('#lab-project-image');
    const title = root.querySelector('#lab-project-title');
    const description = root.querySelector('#lab-project-description');
    const link = root.querySelector('#lab-project-link');
    const action = root.querySelector('#lab-action');
    const pause = root.querySelector('#lab-pause');
    const status = root.querySelector('#lab-status');
    const directions = root.querySelector('.lab-direction-buttons');
    const sceneButtons = [...root.querySelectorAll('.lab-scene-button')];
    if (!canvas || !viewport || !image || !title || !description || !link || !action || !pause || !status) return;

    const scenes = {
      snake: {
        title: 'Number Snake Arena',
        description: '轉個方向，追上下一個數字。把 AI 寫出的遊戲，變成真的可以玩的作品。',
        image: 'assets/images/projects/number-snake-arena.jpg',
        alt: 'Number Snake Arena 原作遊戲畫面',
        href: 'https://chaohuang-tw.github.io/number-snake-arena/',
        action: '轉向探索',
        instruction: '方向鍵或點一下場景，讓數字蛇轉向。',
        label: '數字蛇互動演示。使用方向鍵轉向，或按 Enter 轉向探索。'
      },
      island: {
        title: '臺灣農產王',
        description: '擲一次骰子，沿著臺灣島前進。用互動遊戲，認識臺灣各地的農產。',
        image: 'assets/images/projects/taiwan-agri-king.jpg',
        alt: '臺灣農產王原作遊戲畫面',
        href: 'https://chaohuang-tw.github.io/taiwan-agri-king/game.html',
        action: '擲骰子',
        instruction: '按擲骰子，或在場景中按 Enter，看看下一步走到哪裡。',
        label: '臺灣島棋盤互動演示，共二十格。按 Enter 或點一下場景擲骰子。'
      },
      build: {
        title: '打造你的 AI 網站',
        description: '想法寫成 Prompt，程式整理成 Code，最後 Publish。跟著課程，完成自己的網站。',
        image: 'assets/course/build-your-ai-website/course-card-cover.webp',
        alt: '打造你的 AI 網站課程封面',
        href: '/courses/build-your-ai-website/',
        action: '重播建站過程',
        instruction: '按重播建站過程，觀看想法、程式到發佈的前端演示。',
        label: '建站流程互動演示：想法、Prompt、Code、Publish、網站。按 Enter 重播。'
      }
    };
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const lowHardware = (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2)
      || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2);
    let lowPerformance = Boolean(lowHardware || (connection && connection.saveData));
    let userPaused = false;
    let enabledOnLowPerformance = false;
    let inView = true;
    let pageActive = true;
    let scene = scenes[root.dataset.scene] ? root.dataset.scene : 'snake';
    let context;
    let available = false;
    let frameId = null;
    let lastFrame = 0;
    let lastUpdate = 0;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let sceneTime = 0;
    let snake;
    let island;
    let build;

    const foods = [
      { x: 0.70, y: 0.25, number: 8 },
      { x: 0.80, y: 0.53, number: 16 },
      { x: 0.49, y: 0.73, number: 4 },
      { x: 0.17, y: 0.57, number: 8 },
      { x: 0.27, y: 0.25, number: 16 }
    ];
    const directionAngles = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };
    const directionNames = { up: '上', right: '右', down: '下', left: '左' };
    const turnOrder = ['up', 'left', 'down', 'right'];
    let nextTurn = 0;

    function announce(message) {
      status.textContent = message;
    }

    function policyPaused() {
      return reducedQuery.matches || userPaused || (lowPerformance && !enabledOnLowPerformance);
    }

    function mayAnimate() {
      return available && !policyPaused() && inView && !document.hidden && pageActive;
    }

    function cancelFrame() {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      lastFrame = 0;
      lastUpdate = 0;
    }

    function syncPlayback() {
      root.dataset.paused = String(!mayAnimate());
      root.dataset.reduced = String(reducedQuery.matches);
      root.dataset.reducedMotion = String(reducedQuery.matches);
      root.dataset.lowPerformance = String(lowPerformance);
      root.dataset.inView = String(inView);
      pause.setAttribute('aria-pressed', String(!available || policyPaused()));
      pause.disabled = reducedQuery.matches;
      pause.textContent = reducedQuery.matches
        ? '減少動態模式'
        : policyPaused() ? (lowPerformance && !enabledOnLowPerformance ? '啟用動態' : '繼續動態') : '暫停動態';
      pause.title = reducedQuery.matches ? '已依系統減少動態設定關閉動畫；仍可操作場景。' : '';
      if (!mayAnimate()) {
        cancelFrame();
      } else if (frameId === null) {
        lastUpdate = performance.now();
        frameId = requestAnimationFrame(frame);
      }
    }

    function resetState() {
      sceneTime = 0;
      const trail = [];
      for (let i = 0; i < 70; i += 1) {
        const progress = i / 69;
        trail.push({
          x: 0.66 - progress * 0.51,
          y: 0.56 + Math.sin(progress * Math.PI * 2) * 0.115
        });
      }
      snake = { x: 0.66, y: 0.56, angle: -0.9, trail, target: 0, value: 64, manualFor: 0, burst: null };
      island = { position: 0, die: 3, from: 0, destination: 0, steps: 0, elapsed: 0, rolling: false, idle: 0, manual: false };
      build = { progress: policyPaused() ? 3.4 : 0, completed: false, manual: false };
    }

    function applyScene(nextScene, announceChange = true) {
      if (!scenes[nextScene]) return;
      cancelFrame();
      scene = nextScene;
      const details = scenes[scene];
      root.dataset.scene = scene;
      image.src = details.image;
      image.alt = details.alt;
      title.textContent = details.title;
      description.textContent = details.description;
      link.href = details.href;
      link.setAttribute('aria-label', `開啟完整作品：${details.title}`);
      action.textContent = details.action;
      viewport.setAttribute('aria-label', available ? details.label : `${details.title}作品預覽`);
      viewport.setAttribute('role', available ? 'group' : 'img');
      if (available) viewport.setAttribute('aria-describedby', 'lab-status');
      viewport.tabIndex = available ? 0 : -1;
      sceneButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.scene === scene)));
      if (directions) directions.hidden = !available || scene !== 'snake';
      resetState();
      draw();
      syncPlayback();
      if (announceChange) announce(available ? details.instruction : `目前顯示${details.title}原作預覽。可開啟完整作品。`);
    }

    function roundRect(x, y, rectWidth, rectHeight, radius) {
      const r = Math.min(radius, rectWidth / 2, rectHeight / 2);
      context.beginPath();
      context.moveTo(x + r, y);
      context.lineTo(x + rectWidth - r, y);
      context.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + r);
      context.lineTo(x + rectWidth, y + rectHeight - r);
      context.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - r, y + rectHeight);
      context.lineTo(x + r, y + rectHeight);
      context.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - r);
      context.lineTo(x, y + r);
      context.quadraticCurveTo(x, y, x + r, y);
      context.closePath();
    }

    function textAt(text, x, y, size, color = '#f2f8f3', weight = 650, align = 'left') {
      context.font = `${weight} ${size}px system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif`;
      context.fillStyle = color;
      context.textAlign = align;
      context.textBaseline = 'middle';
      context.fillText(text, x, y);
    }

    function background() {
      context.fillStyle = '#101c17';
      context.fillRect(0, 0, width, height);
      context.lineWidth = 1;
      context.strokeStyle = '#21352b';
      const grid = Math.max(30, Math.min(width, height) / 9);
      context.beginPath();
      for (let x = grid; x < width; x += grid) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let y = grid; y < height; y += grid) {
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();
    }

    function updateSnake(delta) {
      sceneTime += delta;
      snake.manualFor = Math.max(0, snake.manualFor - delta);
      if (snake.manualFor === 0) {
        const target = foods[snake.target];
        const desired = Math.atan2((target.y - snake.y) * height, (target.x - snake.x) * width);
        const difference = Math.atan2(Math.sin(desired - snake.angle), Math.cos(desired - snake.angle));
        snake.angle += difference * Math.min(1, delta * 4.8);
      }
      const speed = Math.min(width, height) * 0.21;
      snake.x += Math.cos(snake.angle) * speed * delta / width;
      snake.y += Math.sin(snake.angle) * speed * delta / height;
      if (snake.x < 0.08 || snake.x > 0.86) {
        snake.x = Math.max(0.08, Math.min(0.86, snake.x));
        snake.angle = Math.PI - snake.angle;
        snake.manualFor = 0.55;
      }
      if (snake.y < 0.18 || snake.y > 0.80) {
        snake.y = Math.max(0.18, Math.min(0.80, snake.y));
        snake.angle = -snake.angle;
        snake.manualFor = 0.55;
      }
      const current = snake.trail[0];
      if (Math.hypot((current.x - snake.x) * width, (current.y - snake.y) * height) > 2) {
        snake.trail.unshift({ x: snake.x, y: snake.y });
        // Trim by physical length, so the snake stays readable on all viewport ratios.
        let length = 0;
        let keep = 1;
        for (; keep < snake.trail.length; keep += 1) {
          length += Math.hypot((snake.trail[keep].x - snake.trail[keep - 1].x) * width,
            (snake.trail[keep].y - snake.trail[keep - 1].y) * height);
          if (length > Math.min(width * 0.65, height * 0.82)) break;
        }
        snake.trail.length = Math.min(snake.trail.length, Math.max(keep + 1, 2));
      }
      const target = foods[snake.target];
      if (Math.hypot((target.x - snake.x) * width, (target.y - snake.y) * height) < Math.min(width, height) * 0.052) {
        snake.burst = { x: target.x, y: target.y, number: target.number, age: 0 };
        snake.value = snake.value === 256 ? 32 : snake.value * 2;
        snake.target = (snake.target + 1) % foods.length;
      }
      if (snake.burst) {
        snake.burst.age += delta;
        if (snake.burst.age > 0.9) snake.burst = null;
      }
    }

    function drawSnake() {
      const scale = Math.min(width, height);
      const thickness = Math.max(20, Math.min(40, scale * 0.08));
      foods.forEach((food, index) => {
        const active = index === snake.target;
        const size = active ? thickness * 1.04 : thickness * 0.82;
        const x = food.x * width;
        const y = food.y * height;
        context.fillStyle = active ? '#d8f994' : '#263f2e';
        context.strokeStyle = active ? '#d8f994' : '#709471';
        context.lineWidth = 1.5;
        roundRect(x - size / 2, y - size / 2, size, size, size * 0.26);
        context.fill();
        context.stroke();
        textAt(String(food.number), x, y + 1, Math.max(12, size * 0.49), active ? '#16241b' : '#bbd7b9', 750, 'center');
      });
      const trail = snake.trail;
      context.beginPath();
      trail.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x * width, point.y * height);
        else context.lineTo(point.x * width, point.y * height);
      });
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = thickness + 9;
      context.strokeStyle = '#294e35';
      context.stroke();
      context.lineWidth = thickness;
      context.strokeStyle = '#7cbf69';
      context.stroke();
      const indices = [Math.floor(trail.length * 0.90), Math.floor(trail.length * 0.73), Math.floor(trail.length * 0.56),
        Math.floor(trail.length * 0.38), Math.floor(trail.length * 0.20)];
      indices.forEach((index, i) => {
        const point = trail[Math.min(index, trail.length - 1)];
        textAt(String(2 ** (i + 1)), point.x * width, point.y * height + 1, Math.max(12, thickness * 0.42), '#15351f', 750, 'center');
      });
      const x = snake.x * width;
      const y = snake.y * height;
      context.save();
      context.translate(x, y);
      context.rotate(snake.angle);
      context.fillStyle = '#d8f994';
      const headSize = Math.max(38, thickness * 1.5);
      roundRect(-headSize / 2, -headSize / 2, headSize, headSize, headSize * 0.3);
      context.fill();
      context.restore();
      textAt(String(snake.value), x, y + 1, Math.max(16, thickness * 0.53), '#152519', 800, 'center');
      if (snake.burst) {
        const burst = snake.burst;
        const progress = burst.age / 0.9;
        context.globalAlpha = 1 - progress;
        textAt(`+${burst.number}`, burst.x * width, burst.y * height - 25 - progress * 35, thickness * 0.9, '#d8f994', 800, 'center');
        context.globalAlpha = 1;
      }
    }

    function islandNode(index) {
      const angle = -Math.PI / 2 + (index % 20) / 20 * Math.PI * 2;
      const ovalX = Math.cos(angle) * width * 0.145;
      const ovalY = Math.sin(angle) * height * 0.31;
      return { x: width * 0.43 + ovalX + ovalY * 0.23, y: height * 0.49 + ovalY };
    }

    function rollDie(manual = true) {
      if (!available) return;
      const die = 1 + Math.floor(Math.random() * 6);
      const from = Math.round(island.position) % 20;
      island = { position: from, die, from, destination: (from + die) % 20, steps: die, elapsed: 0,
        rolling: !policyPaused(), idle: 0, manual };
      if (policyPaused()) island.position = island.destination;
      if (manual) announce(`擲出 ${die}，${policyPaused() ? '走到' : '前往'}第 ${island.destination + 1} 格。這是首頁互動演示。`);
      if (manual) draw();
    }

    function updateIsland(delta) {
      sceneTime += delta;
      if (island.rolling) {
        island.elapsed += delta;
        const travel = Math.max(0, island.elapsed - 0.32) / 0.26;
        island.position = island.from + Math.min(island.steps, travel);
        if (travel >= island.steps) {
          island.position = island.destination;
          island.rolling = false;
          if (island.manual) announce(`擲出 ${island.die}，已走到第 ${island.destination + 1} 格。`);
          island.manual = false;
        }
      } else {
        island.idle += delta;
        if (island.idle > 2.8) rollDie(false);
      }
    }

    function drawIsland() {
      const polygon = [[0.56, 0.13], [0.585, 0.21], [0.61, 0.28], [0.575, 0.37], [0.535, 0.48],
        [0.485, 0.59], [0.43, 0.70], [0.36, 0.84], [0.33, 0.86], [0.315, 0.77], [0.28, 0.71],
        [0.28, 0.64], [0.32, 0.54], [0.36, 0.43], [0.385, 0.34], [0.45, 0.25], [0.49, 0.18]];
      context.beginPath();
      polygon.forEach((point, index) => {
        if (index === 0) context.moveTo(point[0] * width, point[1] * height);
        else context.lineTo(point[0] * width, point[1] * height);
      });
      context.closePath();
      context.fillStyle = '#294f36';
      context.fill();
      context.strokeStyle = '#69a365';
      context.lineWidth = 2;
      context.stroke();
      context.beginPath();
      for (let i = 0; i <= 20; i += 1) {
        const point = islandNode(i);
        if (i === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      }
      context.strokeStyle = '#91b97f';
      context.lineWidth = 2;
      context.stroke();
      const compact = width < 400 || height < 210;
      const radius = compact ? 5 : Math.max(10, Math.min(13, Math.min(width, height) * 0.031));
      for (let i = 0; i < 20; i += 1) {
        const point = islandNode(i);
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = '#d1e5b9';
        context.fill();
        if (!compact) textAt(String(i + 1), point.x, point.y + 0.5, Math.max(12, radius * 0.95), '#16331f', 700, 'center');
      }
      const current = Math.floor(island.position);
      const fraction = island.position - current;
      const start = islandNode(current);
      const end = islandNode(current + 1);
      const pawnX = start.x + (end.x - start.x) * fraction;
      const pawnY = start.y + (end.y - start.y) * fraction;
      context.beginPath();
      const pawnRadius = Math.max(14, radius * 1.48);
      context.arc(pawnX, pawnY, pawnRadius, 0, Math.PI * 2);
      context.fillStyle = '#d8f994';
      context.fill();
      context.strokeStyle = '#122b19';
      context.lineWidth = 3;
      context.stroke();
      textAt(String(Math.round(island.position) % 20 + 1), pawnX, pawnY + 1, Math.max(14, radius * 1.16), '#16281b', 800, 'center');
      const dieSize = Math.max(36, Math.min(62, width * 0.115));
      const dieX = width * 0.79;
      const dieY = height * 0.29;
      context.save();
      context.translate(dieX, dieY);
      if (island.rolling && island.elapsed < 0.32) context.rotate(Math.sin(island.elapsed * 35) * 0.20);
      context.fillStyle = '#d8f994';
      roundRect(-dieSize / 2, -dieSize / 2, dieSize, dieSize, dieSize * 0.20);
      context.fill();
      const dots = {
        1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
        4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
        6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
      };
      const face = island.rolling && island.elapsed < 0.32 ? Math.floor(island.elapsed * 32) % 6 + 1 : island.die;
      context.fillStyle = '#193321';
      dots[face].forEach(([x, y]) => {
        context.beginPath();
        context.arc(x * dieSize * 0.24, y * dieSize * 0.24, dieSize * 0.075, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();
      textAt('擲骰', dieX, dieY + dieSize * 0.86, Math.max(14, Math.min(20, width * 0.037)), '#d1e5b9', 650, 'center');
      textAt(`第 ${Math.round(island.position) % 20 + 1} 格`, dieX, dieY + dieSize * 1.5,
        Math.max(14, Math.min(18, width * 0.032)), '#d1e5b9', 650, 'center');
    }

    function replayBuild(manual = true) {
      build = { progress: policyPaused() ? 3.4 : 0, completed: policyPaused(), manual };
      if (manual) announce(policyPaused()
        ? '建站演示完成：整理想法、撰寫 Prompt、整理 Code、Publish 發佈網站。'
        : '重播建站演示：想法將依序經過 Prompt、Code、Publish，成為網站。');
      if (manual) draw();
    }

    function updateBuild(delta) {
      sceneTime += delta;
      build.progress += delta;
      if (build.progress >= 3.4 && !build.completed) {
        build.completed = true;
        if (build.manual) announce('建站演示完成：想法經過 Prompt、Code、Publish，成為網站。');
        build.manual = false;
      }
      if (build.progress > 6.8) replayBuild(false);
    }

    function drawBuild() {
      const size = Math.max(25, Math.min(55, width * 0.077));
      const baseline = height * 0.32;
      textAt('想法', width * 0.09, baseline, size, '#f2f8f3', 800);
      const arrowX = width * 0.37;
      context.strokeStyle = '#89c87a';
      context.lineWidth = Math.max(2, size * 0.055);
      const arrowEnd = arrowX + Math.min(1, build.progress / 0.8) * width * 0.15;
      context.beginPath();
      context.moveTo(arrowX, baseline);
      context.lineTo(arrowEnd, baseline);
      if (build.progress > 0.6) {
        context.lineTo(arrowEnd - size * 0.16, baseline - size * 0.16);
        context.moveTo(arrowEnd, baseline);
        context.lineTo(arrowEnd - size * 0.16, baseline + size * 0.16);
      }
      context.stroke();
      const completed = build.progress >= 3;
      textAt('網站', width * 0.59, baseline, size, completed ? '#d8f994' : '#6b8470', 800);
      const stepX = [0.18, 0.43, 0.69];
      const labels = ['Prompt', 'Code', 'Publish'];
      const y = height * 0.53;
      const radius = Math.max(10, Math.min(15, width * 0.025));
      labels.forEach((label, i) => {
        const x = width * stepX[i];
        const progress = Math.max(0, Math.min(1, (build.progress - i * 0.95) / 0.75));
        if (i < 2) {
          context.strokeStyle = '#415d48';
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(x + radius + 4, y);
          context.lineTo(width * stepX[i + 1] - radius - 4, y);
          context.stroke();
          if (progress > 0) {
            context.strokeStyle = '#b4df8a';
            context.beginPath();
            context.moveTo(x + radius + 4, y);
            context.lineTo(x + radius + 4 + (width * (stepX[i + 1] - stepX[i]) - radius * 2 - 8) * progress, y);
            context.stroke();
          }
        }
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = progress === 1 ? '#d8f994' : '#294f36';
        context.fill();
        textAt(String(i + 1), x, y + 1, radius * 1.05, progress === 1 ? '#193321' : '#d0dfd0', 750, 'center');
        textAt(label, x, y + radius + 22, Math.max(13, Math.min(18, width * 0.031)), progress > 0 ? '#f2f8f3' : '#9eb4a1', 650, 'center');
      });
      const codeY = height * 0.79;
      const codeSize = Math.max(17, Math.min(25, width * 0.038));
      textAt('</>', width * 0.10, codeY, codeSize, '#9dcf88', 700);
      const blocks = Math.floor(Math.max(0, Math.min(1, (build.progress - 1) / 2.3)) * 9);
      const blockWidth = Math.max(8, Math.min(17, width * 0.027));
      for (let i = 0; i < 9; i += 1) {
        context.fillStyle = i < blocks ? '#a7d781' : '#2d4534';
        roundRect(width * 0.23 + i * (blockWidth + 4), codeY - 9, blockWidth, 18, 3);
        context.fill();
      }
    }

    function failCanvas() {
      available = false;
      cancelFrame();
      root.dataset.canvas = 'unavailable';
      root.dataset.paused = 'true';
      canvas.hidden = true;
      action.hidden = true;
      pause.hidden = true;
      if (directions) directions.hidden = true;
      viewport.tabIndex = -1;
      viewport.setAttribute('role', 'img');
      viewport.removeAttribute('aria-describedby');
      viewport.setAttribute('aria-label', `${scenes[scene].title}作品預覽`);
    }

    function draw() {
      if (!available) return;
      try {
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.globalAlpha = 1;
        background();
        if (scene === 'snake') drawSnake();
        else if (scene === 'island') drawIsland();
        else drawBuild();
      } catch (_error) {
        failCanvas();
        announce('互動場景無法顯示，仍可查看作品預覽與開啟原作。');
      }
    }

    function frame(timestamp) {
      frameId = null;
      if (!mayAnimate()) return;
      // A single loop owns every scene. All canvas redraws are capped at 30 fps.
      if (timestamp - lastFrame >= 1000 / 30) {
        const delta = Math.min(0.08, Math.max(0, (timestamp - lastUpdate) / 1000));
        lastUpdate = timestamp;
        lastFrame = timestamp;
        if (scene === 'snake') updateSnake(delta);
        else if (scene === 'island') updateIsland(delta);
        else updateBuild(delta);
        draw();
      }
      if (mayAnimate()) frameId = requestAnimationFrame(frame);
    }

    function resize() {
      if (!available) return;
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(bounds.width));
      const nextHeight = Math.max(1, Math.round(bounds.height));
      const nextRatio = Math.min(1.5, window.devicePixelRatio || 1);
      if (nextWidth === width && nextHeight === height && nextRatio === pixelRatio) return;
      width = nextWidth;
      height = nextHeight;
      pixelRatio = nextRatio;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      draw();
    }

    function steer(angle, message) {
      snake.angle = angle;
      snake.manualFor = 2.5;
      if (policyPaused()) updateSnake(0.65);
      announce(message);
      draw();
    }

    function performAction() {
      if (!available) return;
      if (scene === 'snake') {
        const direction = turnOrder[nextTurn % turnOrder.length];
        nextTurn += 1;
        steer(directionAngles[direction], `數字蛇向${directionNames[direction]}轉。可用方向鍵或點場景選擇方向。`);
      } else if (scene === 'island') rollDie();
      else replayBuild();
    }

    sceneButtons.forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.scene !== scene) applyScene(button.dataset.scene);
      else announce(available ? scenes[scene].instruction : `目前顯示${scenes[scene].title}原作預覽。可開啟完整作品。`);
    }));
    action.addEventListener('click', performAction);
    pause.addEventListener('click', () => {
      if (reducedQuery.matches) return;
      const wasPaused = policyPaused();
      userPaused = !wasPaused;
      if (wasPaused && lowPerformance) enabledOnLowPerformance = true;
      // Freeze ongoing steps where they are; manual actions can still produce an immediate result.
      syncPlayback();
      announce(policyPaused() ? '動態已暫停；仍可操作場景並立即查看結果。' : '動態已繼續。');
    });
    if (directions) directions.querySelectorAll('button[data-direction]').forEach((button) => {
      button.addEventListener('click', () => {
        const direction = button.dataset.direction;
        if (scene === 'snake' && direction in directionAngles) {
          steer(directionAngles[direction], `數字蛇向${directionNames[direction]}轉。`);
        }
      });
    });
    viewport.addEventListener('keydown', (event) => {
      if (!available || event.target !== viewport || event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' }[event.key];
      if (direction && scene === 'snake') {
        event.preventDefault();
        steer(directionAngles[direction], `數字蛇向${directionNames[direction]}轉。`);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        performAction();
      }
    });
    viewport.addEventListener('click', (event) => {
      if (!available || event.target.closest('a, button')) return;
      if (scene !== 'snake') {
        performAction();
        return;
      }
      const bounds = canvas.getBoundingClientRect();
      const targetX = (event.clientX - bounds.left) / bounds.width;
      const targetY = (event.clientY - bounds.top) / bounds.height;
      const angle = Math.atan2((targetY - snake.y) * height, (targetX - snake.x) * width);
      steer(angle, '數字蛇已轉向你選的位置。');
    });
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('pagehide', () => { pageActive = false; cancelFrame(); });
    window.addEventListener('pageshow', () => { pageActive = true; syncPlayback(); });
    const onReducedChange = () => {
      if (reducedQuery.matches) {
        if (scene === 'build') {
          build.progress = 3.4;
          build.completed = true;
          build.manual = false;
        }
        if (scene === 'island' && island.rolling) {
          island.position = island.destination;
          island.rolling = false;
          island.manual = false;
        }
      }
      syncPlayback();
      draw();
    };
    if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', onReducedChange);
    else reducedQuery.addListener(onReducedChange);
    if (connection && connection.addEventListener) connection.addEventListener('change', () => {
      lowPerformance = Boolean(lowHardware || connection.saveData);
      syncPlayback();
    });

    try {
      context = canvas.getContext('2d', { alpha: false });
      available = Boolean(context);
    } catch (_error) { available = false; }
    root.dataset.enhanced = 'true';
    root.dataset.canvas = available ? 'available' : 'unavailable';
    if (!available) failCanvas();
    applyScene(scene, false);
    if (available) {
      resize();
      if ('ResizeObserver' in window) new ResizeObserver(resize).observe(viewport);
      else window.addEventListener('resize', resize, { passive: true });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          inView = entries[0].isIntersecting;
          syncPlayback();
        }, { threshold: 0.01 }).observe(viewport);
      }
    }
    if (!available) announce(`目前顯示${scenes[scene].title}原作預覽。互動場景無法顯示，可開啟完整作品。`);
    else if (reducedQuery.matches) announce('已依系統減少動態設定顯示靜態場景；操作會立即顯示結果。');
    else if (lowPerformance) announce('已為節省裝置資源暫停動態；可操作場景，或按啟用動態。');
    else announce(scenes[scene].instruction);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialiseLab, { once: true });
  else initialiseLab();
})();
