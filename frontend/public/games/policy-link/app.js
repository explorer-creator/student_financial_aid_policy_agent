const gridData = [
  ["国", "家", "奖", "学", "金", "三", "信", "国"],
  ["家", "勤", "工", "助", "学", "助", "用", "家"],
  ["励", "免", "砺", "励", "业", "一", "助", "助"],
  ["志", "学", "志", "行", "奖", "辅", "学", "学"],
  ["奖", "杂", "", "团", "学", "三", "贷", "金"],
  ["学", "费", "减", "免", "金", "支", "", "免"],
  ["金", "新", "生", "资", "助", "一", "教", "学"],
  ["绿", "色", "通", "道", "", "扶", "育", "费"],
];

const frameColors = [
  "hsl(20 86% 42%)",
  "hsl(43 86% 40%)",
  "hsl(66 82% 35%)",
  "hsl(89 76% 36%)",
  "hsl(112 72% 36%)",
  "hsl(135 72% 34%)",
  "hsl(158 74% 33%)",
  "hsl(181 82% 34%)",
  "hsl(204 86% 42%)",
  "hsl(227 82% 46%)",
  "hsl(250 78% 48%)",
  "hsl(273 78% 45%)",
  "hsl(296 74% 40%)",
  "hsl(319 76% 42%)",
];

const answers = [
  { id: "国家奖学金", row: 1, col: 1, dir: "h", length: 5, color: frameColors[0] },
  { id: "新生资助", row: 7, col: 2, dir: "h", length: 4, color: frameColors[1] },
  { id: "三助一辅", row: 1, col: 6, dir: "v", length: 4, color: frameColors[2] },
  { id: "国家励志奖学金", row: 1, col: 1, dir: "v", length: 7, color: frameColors[3] },
  { id: "学业奖学金", row: 2, col: 5, dir: "v", length: 5, color: frameColors[4] },
  { id: "学费减免", row: 6, col: 1, dir: "h", length: 4, color: frameColors[5] },
  { id: "勤工助学", row: 2, col: 2, dir: "h", length: 4, color: frameColors[6] },
  { id: "信用助学贷", row: 1, col: 7, dir: "v", length: 5, color: frameColors[7] },
  { id: "免学杂费", row: 3, col: 2, dir: "v", length: 4, color: frameColors[8] },
  { id: "绿色通道", row: 8, col: 1, dir: "h", length: 4, color: frameColors[9] },
  { id: "国家助学金", row: 1, col: 8, dir: "v", length: 5, color: frameColors[10] },
  { id: "三支一扶", row: 5, col: 6, dir: "v", length: 4, color: frameColors[11] },
];

const wordGrid = document.getElementById("wordGrid");
const foundLayer = document.getElementById("foundLayer");
const hintList = document.getElementById("hintList");
const counter = document.getElementById("counter");
const resetButton = document.getElementById("resetButton");
const celebrationLayer = document.getElementById("celebrationLayer");
const fireworksCanvas = document.getElementById("fireworksCanvas");
const celebrationMessage = document.getElementById("celebrationMessage");

const selectedCells = new Set();
const foundAnswers = new Set();
const GAME_TITLE = "砺志励行团 资助政策连连看";
const FIREWORKS_DURATION_MS = 2000;
const FIREWORK_COLORS = ["#ff4d4f", "#ffa940", "#ffd666", "#73d13d", "#40a9ff", "#9254de", "#f759ab"];
const ACHIEVEMENT_TRIGGER = 8;

let fireworksFrameId = 0;
let fireworksStopTimer = 0;
let celebrationHideTimer = 0;
let celebrationTriggered = false;

function keyOf(row, col) {
  return `${row}-${col}`;
}

function cellsForAnswer(answer) {
  return Array.from({ length: answer.length }, (_, index) => {
    const row = answer.dir === "v" ? answer.row + index : answer.row;
    const col = answer.dir === "h" ? answer.col + index : answer.col;
    return keyOf(row, col);
  });
}

function sameCellSet(selected, answerCells) {
  if (selected.size !== answerCells.length) {
    return false;
  }

  return answerCells.every((cellKey) => selected.has(cellKey));
}

function renderGrid() {
  wordGrid.innerHTML = "";
  let emptyStarIndex = 0;

  gridData.forEach((rowData, rowIndex) => {
    rowData.forEach((char, colIndex) => {
      const row = rowIndex + 1;
      const col = colIndex + 1;
      const button = document.createElement("button");
      const cellKey = keyOf(row, col);

      button.type = "button";
      button.dataset.key = cellKey;
      button.dataset.row = String(row);
      button.dataset.col = String(col);

      if (char) {
        button.className = "cell";
        button.textContent = char;
        button.setAttribute("aria-label", `${row}行${col}列：${char}`);
        button.addEventListener("click", () => toggleCell(cellKey));
      } else {
        button.className = `cell empty star-size-${emptyStarIndex % 3}`;
        emptyStarIndex += 1;
        const star = document.createElement("span");
        star.className = "empty-star";
        star.setAttribute("aria-hidden", "true");
        star.textContent = "★";
        button.appendChild(star);
        button.setAttribute("aria-label", `${row}行${col}列：装饰星`);
        button.disabled = true;
      }

      wordGrid.appendChild(button);
    });
  });
}

function renderHints() {
  hintList.innerHTML = "";

  answers.forEach((answer) => {
    const item = document.createElement("li");
    item.textContent = answer.id;
    item.className = foundAnswers.has(answer.id) ? "is-found" : "";
    hintList.appendChild(item);
  });
}

function renderSelection() {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.toggle("is-selected", selectedCells.has(cell.dataset.key));
  });
}

function renderFoundFrames() {
  foundLayer.innerHTML = "";

  answers.forEach((answer) => {
    if (!foundAnswers.has(answer.id)) {
      return;
    }

    const frame = document.createElement("div");
    const rowIndex = answer.row - 1;
    const colIndex = answer.col - 1;
    const widthCells = answer.dir === "h" ? answer.length : 1;
    const heightCells = answer.dir === "v" ? answer.length : 1;

    frame.className = "found-frame";
    frame.style.setProperty("--frame-color", answer.color);
    frame.style.left = `${colIndex * 12.5}%`;
    frame.style.top = `${rowIndex * 12.5}%`;
    frame.style.width = `${widthCells * 12.5}%`;
    frame.style.height = `${heightCells * 12.5}%`;
    foundLayer.appendChild(frame);
  });
}

function updateCounter() {
  counter.textContent = `${foundAnswers.size}/${answers.length}`;
}

function resizeFireworksCanvas() {
  const shell = celebrationLayer.parentElement;
  const rect = shell.getBoundingClientRect();
  fireworksCanvas.width = Math.floor(rect.width);
  fireworksCanvas.height = Math.floor(rect.height);
}

function stopFireworks() {
  if (fireworksFrameId) {
    cancelAnimationFrame(fireworksFrameId);
    fireworksFrameId = 0;
  }
  if (fireworksStopTimer) {
    clearTimeout(fireworksStopTimer);
    fireworksStopTimer = 0;
  }
  const ctx = fireworksCanvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
  }
}

function launchBurst(particles, x, y, color) {
  const count = 26 + Math.floor(Math.random() * 14);
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
    const speed = 2.2 + Math.random() * 3.4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.012 + Math.random() * 0.012,
      color,
      size: 2 + Math.random() * 2,
    });
  }
}

function startFireworks() {
  stopFireworks();
  resizeFireworksCanvas();
  const ctx = fireworksCanvas.getContext("2d");
  const particles = [];
  const startedAt = performance.now();
  let nextBurstAt = startedAt;

  const tick = (now) => {
    ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

    while (now >= nextBurstAt && now - startedAt < FIREWORKS_DURATION_MS) {
      const x = fireworksCanvas.width * (0.15 + Math.random() * 0.7);
      const y = fireworksCanvas.height * (0.12 + Math.random() * 0.45);
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      launchBurst(particles, x, y, color);
      nextBurstAt += 180 + Math.random() * 220;
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.vx *= 0.985;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (now - startedAt < FIREWORKS_DURATION_MS || particles.length > 0) {
      fireworksFrameId = requestAnimationFrame(tick);
    } else {
      fireworksFrameId = 0;
      ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    }
  };

  fireworksFrameId = requestAnimationFrame(tick);
  fireworksStopTimer = window.setTimeout(stopFireworks, FIREWORKS_DURATION_MS);
}

function hideCelebration() {
  stopFireworks();
  if (celebrationHideTimer) {
    clearTimeout(celebrationHideTimer);
    celebrationHideTimer = 0;
  }
  celebrationLayer.hidden = true;
  celebrationLayer.setAttribute("aria-hidden", "true");
  celebrationMessage.classList.remove("is-title");
}

function showFireworks(message, { autoHide = false } = {}) {
  if (celebrationHideTimer) {
    clearTimeout(celebrationHideTimer);
    celebrationHideTimer = 0;
  }

  celebrationMessage.textContent = message;
  celebrationMessage.classList.toggle("is-title", message === GAME_TITLE);
  celebrationLayer.hidden = false;
  celebrationLayer.setAttribute("aria-hidden", "false");
  startFireworks();

  if (autoHide) {
    celebrationHideTimer = window.setTimeout(hideCelebration, FIREWORKS_DURATION_MS);
  }
}

function showAchievementCelebration() {
  showFireworks("恭喜达成8个成就");
}

function checkWin() {
  if (!celebrationTriggered && foundAnswers.size >= ACHIEVEMENT_TRIGGER) {
    celebrationTriggered = true;
    showAchievementCelebration();
  }
}

function syncView() {
  renderSelection();
  renderFoundFrames();
  renderHints();
  updateCounter();
}

function checkSelectedAnswer() {
  for (const answer of answers) {
    const answerCells = cellsForAnswer(answer);

    if (sameCellSet(selectedCells, answerCells)) {
      foundAnswers.add(answer.id);
      selectedCells.clear();
      syncView();
      checkWin();
      return;
    }
  }

  renderSelection();
}

function toggleCell(cellKey) {
  if (selectedCells.has(cellKey)) {
    selectedCells.delete(cellKey);
    renderSelection();
    return;
  }

  selectedCells.add(cellKey);
  checkSelectedAnswer();
}

function resetGame() {
  selectedCells.clear();
  foundAnswers.clear();
  celebrationTriggered = false;
  hideCelebration();
  syncView();
  showFireworks(GAME_TITLE, { autoHide: true });
}

resetButton.addEventListener("click", resetGame);
window.addEventListener("resize", () => {
  if (!celebrationLayer.hidden) {
    resizeFireworksCanvas();
  }
});

renderGrid();
syncView();
