const STATIONS = [
  {
    id: "primary",
    name: "小学站",
    icon: "🎒",
    correct: ["免费教科书", "生活补助"],
    decoys: ["国家奖学金", "助学贷款"],
  },
  {
    id: "junior",
    name: "初中站",
    icon: "📚",
    correct: ["免费教科书", "营养膳食补助"],
    decoys: ["免学杂费", "绿色通道"],
  },
  {
    id: "high",
    name: "高中站",
    icon: "🎓",
    correct: ["国家助学金", "免学杂费"],
    decoys: ["免学费", "生活补助"],
  },
  {
    id: "vocational",
    name: "中职站",
    icon: "🔧",
    correct: ["免学费", "国家助学金", "国家奖学金"],
    decoys: ["营养膳食补助", "国家励志奖学金"],
  },
  {
    id: "university",
    name: "大学站",
    icon: "🏛️",
    correct: ["国家奖学金", "国家励志奖学金", "国家助学金", "助学贷款", "绿色通道"],
    decoys: ["免费教科书", "生活补助", "免学杂费"],
  },
];

const pathTrack = document.getElementById("pathTrack");
const walker = document.getElementById("walker");
const stationTitle = document.getElementById("stationTitle");
const stationSub = document.getElementById("stationSub");
const supplyList = document.getElementById("supplyList");
const backpackList = document.getElementById("backpackList");
const counter = document.getElementById("counter");
const resetButton = document.getElementById("resetButton");
const feedback = document.getElementById("feedback");
const celebrationLayer = document.getElementById("celebrationLayer");
const fireworksCanvas = document.getElementById("fireworksCanvas");
const gameShell = document.querySelector(".game-shell");

const FIREWORKS_DURATION_MS = 2200;
const FIREWORK_COLORS = ["#ff4d4f", "#ffa940", "#ffd666", "#73d13d", "#40a9ff", "#9254de", "#f759ab"];

let stationIndex = 0;
let collectedAtStation = new Set();
let fireworksFrameId = 0;
let fireworksStopTimer = 0;

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function currentStation() {
  return STATIONS[stationIndex];
}

function setFeedback(text, kind = "") {
  feedback.textContent = text;
  feedback.className = `feedback${kind ? ` is-${kind}` : ""}`;
}

function updateCounter() {
  const station = currentStation();
  counter.textContent = `${station.name} ${collectedAtStation.size}/${station.correct.length}`;
}

function updateWalkerPosition() {
  const pct = 10 + stationIndex * 20;
  walker.style.left = `${pct}%`;
}

function renderPath() {
  pathTrack.innerHTML = '<div class="path-line" aria-hidden="true"></div>';
  STATIONS.forEach((station, index) => {
    const node = document.createElement("div");
    node.className = "path-node";
    if (index < stationIndex) node.classList.add("is-done");
    if (index === stationIndex) node.classList.add("is-current");
    node.innerHTML = `
      <span class="path-dot" aria-hidden="true"></span>
      <span class="path-icon" aria-hidden="true">${station.icon}</span>
      <span class="path-label">${station.name.replace("站", "")}</span>
    `;
    pathTrack.appendChild(node);
  });
  updateWalkerPosition();
}

function renderBackpack() {
  backpackList.innerHTML = "";
  STATIONS.slice(0, stationIndex).forEach((station) => {
    station.correct.forEach((name) => {
      const li = document.createElement("li");
      li.className = "backpack-item";
      li.textContent = name;
      backpackList.appendChild(li);
    });
  });
  collectedAtStation.forEach((name) => {
    const li = document.createElement("li");
    li.className = "backpack-item";
    li.textContent = name;
    backpackList.appendChild(li);
  });
}

function renderSupplies() {
  const station = currentStation();
  stationTitle.textContent = station.name;
  stationSub.textContent = `为本站收集 ${station.correct.length} 项正确补给`;
  supplyList.innerHTML = "";

  const options = shuffle([
    ...station.correct.map((name) => ({ name, correct: true })),
    ...station.decoys.map((name) => ({ name, correct: false })),
  ]);

  options.forEach((option) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "supply-card";
    btn.textContent = option.name;
    btn.dataset.name = option.name;
    btn.dataset.correct = option.correct ? "1" : "0";

    if (collectedAtStation.has(option.name)) {
      btn.classList.add("is-collected");
      btn.disabled = true;
    }

    btn.addEventListener("click", () => onSupplyClick(btn, option));
    li.appendChild(btn);
    supplyList.appendChild(li);
  });

  updateCounter();
  renderBackpack();
}

function onSupplyClick(btn, option) {
  if (collectedAtStation.has(option.name)) return;

  if (option.correct) {
    collectedAtStation.add(option.name);
    btn.classList.add("is-collected");
    btn.disabled = true;
    setFeedback(`收集成功：${option.name}`, "ok");
    updateCounter();
    renderBackpack();

    const station = currentStation();
    if (collectedAtStation.size === station.correct.length) {
      window.setTimeout(advanceStation, 500);
    }
    return;
  }

  btn.classList.add("is-wrong");
  setFeedback(`「${option.name}」不是本站的正确补给，再试试。`, "bad");
  window.setTimeout(() => btn.classList.remove("is-wrong"), 450);
}

function advanceStation() {
  if (stationIndex >= STATIONS.length - 1) {
    renderPath();
    setFeedback("逐梦抵达大学，一路补给齐全！", "ok");
    showCelebration();
    return;
  }

  stationIndex += 1;
  collectedAtStation = new Set();
  renderPath();
  renderSupplies();
  setFeedback(`到达${currentStation().name}，继续收集吧！`, "ok");
}

function resizeFireworksCanvas() {
  const rect = gameShell.getBoundingClientRect();
  fireworksCanvas.width = Math.floor(rect.width);
  fireworksCanvas.height = Math.floor(rect.height);
}

function stopFireworks() {
  if (fireworksFrameId) cancelAnimationFrame(fireworksFrameId);
  fireworksFrameId = 0;
  if (fireworksStopTimer) clearTimeout(fireworksStopTimer);
  fireworksStopTimer = 0;
  const ctx = fireworksCanvas.getContext("2d");
  if (ctx) ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
}

function launchBurst(particles, x, y, color) {
  const count = 24 + Math.floor(Math.random() * 12);
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
    const speed = 2 + Math.random() * 3;
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
      launchBurst(
        particles,
        fireworksCanvas.width * (0.15 + Math.random() * 0.7),
        fireworksCanvas.height * (0.12 + Math.random() * 0.45),
        FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
      );
      nextBurstAt += 180 + Math.random() * 220;
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
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
    }
  };

  fireworksFrameId = requestAnimationFrame(tick);
  fireworksStopTimer = window.setTimeout(stopFireworks, FIREWORKS_DURATION_MS);
}

function hideCelebration() {
  stopFireworks();
  celebrationLayer.hidden = true;
  celebrationLayer.setAttribute("aria-hidden", "true");
}

function showCelebration() {
  celebrationLayer.hidden = false;
  celebrationLayer.setAttribute("aria-hidden", "false");
  startFireworks();
}

function resetGame() {
  stationIndex = 0;
  collectedAtStation = new Set();
  hideCelebration();
  renderPath();
  renderSupplies();
  setFeedback("");
}

resetButton.addEventListener("click", resetGame);
window.addEventListener("resize", () => {
  if (!celebrationLayer.hidden) resizeFireworksCanvas();
});

resetGame();
