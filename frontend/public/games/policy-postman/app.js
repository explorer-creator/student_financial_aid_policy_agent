const SCHOOLS = [
  { id: "primary", name: "小学", badge: "🎒" },
  { id: "junior", name: "初中", badge: "📚" },
  { id: "high", name: "高中", badge: "🎓" },
  { id: "vocational", name: "中职", badge: "🔧" },
  { id: "university", name: "大学", badge: "🏛️" },
  { id: "graduate", name: "研究生院", badge: "🔬" },
];

const LETTERS = [
  {
    id: "textbooks",
    title: "免费教科书",
    hint: "义务教育阶段学生",
    targets: ["primary", "junior"],
  },
  {
    id: "meal",
    title: "营养膳食补助",
    hint: "农村义务教育学生",
    targets: ["primary", "junior"],
  },
  {
    id: "grant",
    title: "国家助学金",
    hint: "符合条件家庭经济困难学生",
    targets: ["high", "vocational", "university", "graduate"],
  },
  {
    id: "scholarship",
    title: "国家奖学金",
    hint: "品学兼优的优秀学生",
    targets: ["vocational", "university", "graduate"],
  },
];

const letterList = document.getElementById("letterList");
const schoolGrid = document.getElementById("schoolGrid");
const counter = document.getElementById("counter");
const resetButton = document.getElementById("resetButton");
const feedback = document.getElementById("feedback");
const celebrationLayer = document.getElementById("celebrationLayer");
const fireworksCanvas = document.getElementById("fireworksCanvas");
const gameShell = document.querySelector(".game-shell");

const FIREWORKS_DURATION_MS = 2000;
const FIREWORK_COLORS = ["#ff4d4f", "#ffa940", "#ffd666", "#73d13d", "#40a9ff", "#9254de", "#f759ab"];

let selectedLetterId = null;
let deliveredCount = 0;
let deliveredIds = new Set();
let dragState = null;
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

function setFeedback(text, kind = "") {
  feedback.textContent = text;
  feedback.className = `feedback${kind ? ` is-${kind}` : ""}`;
}

function updateCounter() {
  counter.textContent = `${deliveredCount}/${LETTERS.length}`;
}

function markSelected(letterId) {
  document.querySelectorAll(".letter-card").forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.id === letterId);
  });
}

function getLetter(id) {
  return LETTERS.find((item) => item.id === id);
}

function isCorrectDelivery(letterId, schoolId) {
  const letter = getLetter(letterId);
  return letter ? letter.targets.includes(schoolId) : false;
}

function deliverLetter(letterId, schoolId, letterEl, schoolEl) {
  deliveredIds.add(letterId);
  deliveredCount += 1;
  selectedLetterId = null;
  markSelected(null);

  letterEl.classList.remove("is-selected", "is-wrong", "is-dragging");
  letterEl.classList.add("is-delivered");
  letterEl.setAttribute("aria-disabled", "true");

  schoolEl.classList.remove("is-wrong", "is-hover");
  schoolEl.classList.add("is-hit");

  updateCounter();
  setFeedback(`投递成功：${getLetter(letterId).title} → ${schoolEl.querySelector(".school-name").textContent}`, "ok");

  if (deliveredCount === LETTERS.length) {
    showCelebration();
  }
}

function flashWrong(letterEl, schoolEl) {
  letterEl.classList.add("is-wrong");
  schoolEl.classList.add("is-wrong");
  setFeedback("这封政策信还没投对门口，再想想学段与政策对象。", "bad");
  window.setTimeout(() => {
    letterEl.classList.remove("is-wrong", "is-selected");
    schoolEl.classList.remove("is-wrong");
  }, 450);
  selectedLetterId = null;
  markSelected(null);
}

function tryDeliver(letterId, schoolId) {
  if (deliveredIds.has(letterId)) return;
  const letterEl = document.querySelector(`.letter-card[data-id="${letterId}"]`);
  const schoolEl = document.querySelector(`.school-door[data-id="${schoolId}"]`);
  if (!letterEl || !schoolEl) return;

  if (isCorrectDelivery(letterId, schoolId)) {
    deliverLetter(letterId, schoolId, letterEl, schoolEl);
  } else {
    flashWrong(letterEl, schoolEl);
  }
}

function onLetterClick(el) {
  const id = el.dataset.id;
  if (deliveredIds.has(id)) return;
  selectedLetterId = id;
  markSelected(id);
  setFeedback("请选择要投递的学校门口。");
}

function onSchoolClick(el) {
  const id = el.dataset.id;
  if (!selectedLetterId) {
    setFeedback("请先从邮包里选一封政策信件。");
    return;
  }
  tryDeliver(selectedLetterId, id);
}

function createLetterCard(item) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "letter-card";
  btn.dataset.id = item.id;
  btn.innerHTML = `
    <span class="letter-icon" aria-hidden="true">✉️</span>
    <span class="letter-text">
      <span class="letter-title">${item.title}</span>
      <span class="letter-hint">${item.hint}</span>
    </span>
  `;
  btn.setAttribute("aria-label", `政策信件：${item.title}`);

  btn.addEventListener("click", () => onLetterClick(btn));
  btn.addEventListener("pointerdown", (e) => startDrag(e, btn));

  li.appendChild(btn);
  return li;
}

function createSchoolDoor(item) {
  const door = document.createElement("button");
  door.type = "button";
  door.className = "school-door";
  door.dataset.id = item.id;
  door.innerHTML = `
    <span class="school-check" aria-hidden="true">✓</span>
    <span class="school-badge" aria-hidden="true">${item.badge}</span>
    <span class="school-gate" aria-hidden="true"></span>
    <span class="school-name">${item.name}</span>
  `;
  door.setAttribute("aria-label", `${item.name}门口`);

  door.addEventListener("click", () => onSchoolClick(door));
  door.addEventListener("pointerenter", () => {
    if (dragState) dragState.hoverSchool = door;
    if (selectedLetterId && !door.classList.contains("is-hit")) {
      door.classList.add("is-hover");
    }
  });
  door.addEventListener("pointerleave", () => {
    if (dragState && dragState.hoverSchool === door) dragState.hoverSchool = null;
    door.classList.remove("is-hover");
  });

  return door;
}

function renderBoard() {
  letterList.innerHTML = "";
  schoolGrid.innerHTML = "";
  shuffle(LETTERS).forEach((item) => letterList.appendChild(createLetterCard(item)));
  SCHOOLS.forEach((item) => schoolGrid.appendChild(createSchoolDoor(item)));
}

function findDropTarget(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  return el ? el.closest(".school-door") : null;
}

function startDrag(e, letterEl) {
  if (deliveredIds.has(letterEl.dataset.id)) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  selectedLetterId = letterEl.dataset.id;
  markSelected(selectedLetterId);

  const rect = letterEl.getBoundingClientRect();
  dragState = {
    letterEl,
    pointerId: e.pointerId,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    hoverSchool: null,
    ghost: null,
  };

  letterEl.setPointerCapture(e.pointerId);
  letterEl.classList.add("is-dragging");

  const ghost = letterEl.cloneNode(true);
  ghost.classList.add("drag-ghost");
  ghost.style.position = "fixed";
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "999";
  document.body.appendChild(ghost);
  dragState.ghost = ghost;

  setFeedback("拖到对应学校门口松开。");
  e.preventDefault();
}

function moveDrag(e) {
  if (!dragState || dragState.pointerId !== e.pointerId) return;

  const ghost = dragState.ghost;
  if (ghost) {
    ghost.style.left = `${e.clientX - dragState.offsetX}px`;
    ghost.style.top = `${e.clientY - dragState.offsetY}px`;
  }

  document.querySelectorAll(".school-door.is-hover").forEach((node) => {
    if (node !== dragState.hoverSchool) node.classList.remove("is-hover");
  });

  const target = findDropTarget(e.clientX, e.clientY);
  dragState.hoverSchool = target;
  if (target && !target.classList.contains("is-hit")) {
    target.classList.add("is-hover");
  }
}

function endDrag(e) {
  if (!dragState || dragState.pointerId !== e.pointerId) return;

  const { letterEl, ghost, hoverSchool } = dragState;
  letterEl.releasePointerCapture(e.pointerId);
  letterEl.classList.remove("is-dragging");
  if (ghost) ghost.remove();

  document.querySelectorAll(".school-door.is-hover").forEach((node) => node.classList.remove("is-hover"));

  const target = hoverSchool || findDropTarget(e.clientX, e.clientY);
  if (target) {
    tryDeliver(letterEl.dataset.id, target.dataset.id);
  }

  dragState = null;
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
  setFeedback("太棒了，小邮差任务完成！", "ok");
}

function resetGame() {
  selectedLetterId = null;
  deliveredCount = 0;
  deliveredIds = new Set();
  dragState = null;
  hideCelebration();
  renderBoard();
  updateCounter();
  setFeedback("");
}

document.addEventListener("pointermove", moveDrag);
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);
resetButton.addEventListener("click", resetGame);
window.addEventListener("resize", () => {
  if (!celebrationLayer.hidden) resizeFireworksCanvas();
});

resetGame();
