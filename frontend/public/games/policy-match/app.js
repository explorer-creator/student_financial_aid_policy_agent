const PAIRS = [
  { id: "k12", policy: "义务教育「两免一补」", audience: "小学生/初中生" },
  { id: "high-school", policy: "普通高中国家助学金", audience: "普通高中生" },
  { id: "vocational", policy: "中职免学费", audience: "中职学生" },
  { id: "undergrad", policy: "本专科生国家奖学金", audience: "大学生" },
  { id: "graduate", policy: "研究生国家奖学金", audience: "研究生" },
];

const policyList = document.getElementById("policyList");
const audienceList = document.getElementById("audienceList");
const linesLayer = document.getElementById("linesLayer");
const matchBoard = document.getElementById("matchBoard");
const counter = document.getElementById("counter");
const resetButton = document.getElementById("resetButton");
const feedback = document.getElementById("feedback");
const celebrationLayer = document.getElementById("celebrationLayer");
const fireworksCanvas = document.getElementById("fireworksCanvas");

const FIREWORKS_DURATION_MS = 2000;
const FIREWORK_COLORS = ["#ff4d4f", "#ffa940", "#ffd666", "#73d13d", "#40a9ff", "#9254de", "#f759ab"];

let selectedPolicyId = null;
let matchedCount = 0;
let matchedIds = new Set();
let permanentLines = [];
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
  counter.textContent = `${matchedCount}/${PAIRS.length}`;
}

function cardCenter(el) {
  const boardRect = matchBoard.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - boardRect.left,
    y: rect.top + rect.height / 2 - boardRect.top,
  };
}

function curvePathD(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  const bend = Math.min(36, Math.abs(x2 - x1) * 0.14);
  const c1x = x1 + (midX - x1) * 0.62;
  const c2x = x2 - (x2 - midX) * 0.62;
  const c1y = y1 - bend * 0.35;
  const c2y = y2 + bend * 0.35;
  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
}

function drawLine(x1, y1, x2, y2, { stroke = "#f5a623", width = 2.5, dash = "", opacity = 1, className = "" } = {}) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", curvePathD(x1, y1, x2, y2));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", String(width));
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("opacity", String(opacity));
  if (dash) path.setAttribute("stroke-dasharray", dash);
  if (className) path.setAttribute("class", className);
  linesLayer.appendChild(path);
  return path;
}

function clearTempLines() {
  linesLayer.querySelectorAll(".temp-line").forEach((node) => node.remove());
}

function redrawPermanentLines() {
  linesLayer.querySelectorAll(".perm-line").forEach((node) => node.remove());
  permanentLines.forEach(({ policyEl, audienceEl }) => {
    const p = cardCenter(policyEl);
    const a = cardCenter(audienceEl);
    drawLine(p.x, p.y, a.x, a.y, {
      stroke: "url(#perm-line-gradient)",
      width: 3,
      opacity: 0.88,
      className: "perm-line",
    });
  });
}

function markSelected(policyId) {
  document.querySelectorAll(".match-card.policy").forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.id === policyId);
  });
}

function lockPair(pairId, policyEl, audienceEl) {
  matchedIds.add(pairId);
  matchedCount += 1;
  policyEl.classList.remove("is-selected", "is-wrong");
  audienceEl.classList.remove("is-wrong");
  policyEl.classList.add("is-matched");
  audienceEl.classList.add("is-matched");
  policyEl.setAttribute("aria-disabled", "true");
  audienceEl.setAttribute("aria-disabled", "true");
  permanentLines.push({ policyEl, audienceEl });
  selectedPolicyId = null;
  markSelected(null);
  redrawPermanentLines();
  updateCounter();
  setFeedback("匹配正确！", "ok");
  if (matchedCount === PAIRS.length) {
    showCelebration();
  }
}

function flashWrong(policyEl, audienceEl) {
  policyEl.classList.add("is-wrong");
  audienceEl.classList.add("is-wrong");
  setFeedback("再想想，这条政策和对象还不对应。", "bad");
  window.setTimeout(() => {
    policyEl.classList.remove("is-wrong", "is-selected");
    audienceEl.classList.remove("is-wrong");
  }, 450);
}

function tryMatch(policyId, audienceId) {
  if (matchedIds.has(policyId)) return;
  const policyEl = document.querySelector(`.match-card.policy[data-id="${policyId}"]`);
  const audienceEl = document.querySelector(`.match-card.audience[data-id="${audienceId}"]`);
  if (!policyEl || !audienceEl) return;

  if (policyId === audienceId) {
    lockPair(policyId, policyEl, audienceEl);
  } else {
    const p = cardCenter(policyEl);
    const a = cardCenter(audienceEl);
    clearTempLines();
    drawLine(p.x, p.y, a.x, a.y, {
      stroke: "#d4a5e8",
      width: 2.5,
      dash: "5 6",
      opacity: 0.58,
      className: "temp-line is-wrong-line",
    });
    flashWrong(policyEl, audienceEl);
    window.setTimeout(clearTempLines, 450);
    selectedPolicyId = null;
    markSelected(null);
  }
}

function onPolicyClick(el) {
  const id = el.dataset.id;
  if (matchedIds.has(id)) return;
  selectedPolicyId = id;
  markSelected(id);
  setFeedback("请在右侧选择对应适合对象。");
}

function onAudienceClick(el) {
  const id = el.dataset.id;
  if (matchedIds.has(id)) return;
  if (!selectedPolicyId) {
    setFeedback("请先在左侧选择一条政策。");
    return;
  }
  tryMatch(selectedPolicyId, id);
}

function createCard(item, side) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `match-card ${side}`;
  btn.dataset.id = item.id;
  btn.textContent = side === "policy" ? item.policy : item.audience;
  btn.setAttribute("aria-label", `${side === "policy" ? "政策" : "适合对象"}：${btn.textContent}`);

  if (side === "policy") {
    btn.addEventListener("click", () => onPolicyClick(btn));
    btn.addEventListener("pointerdown", (e) => startDrag(e, btn));
  } else {
    btn.addEventListener("click", () => onAudienceClick(btn));
    btn.addEventListener("pointerenter", () => {
      if (dragState) dragState.hoverAudience = btn;
    });
    btn.addEventListener("pointerleave", () => {
      if (dragState && dragState.hoverAudience === btn) dragState.hoverAudience = null;
    });
  }

  li.appendChild(btn);
  return li;
}

function renderLists() {
  policyList.innerHTML = "";
  audienceList.innerHTML = "";
  shuffle(PAIRS).forEach((item) => policyList.appendChild(createCard(item, "policy")));
  shuffle(PAIRS).forEach((item) => audienceList.appendChild(createCard(item, "audience")));
}

function pointerPos(e) {
  const boardRect = matchBoard.getBoundingClientRect();
  return {
    x: e.clientX - boardRect.left,
    y: e.clientY - boardRect.top,
  };
}

function startDrag(e, policyEl) {
  if (matchedIds.has(policyEl.dataset.id)) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  selectedPolicyId = policyEl.dataset.id;
  markSelected(selectedPolicyId);
  dragState = {
    policyEl,
    start: cardCenter(policyEl),
    hoverAudience: null,
  };
  policyEl.setPointerCapture(e.pointerId);
  clearTempLines();
  setFeedback("拖到右侧对应对象上松开。");
}

function moveDrag(e) {
  if (!dragState) return;
  const pos = pointerPos(e);
  clearTempLines();
  drawLine(dragState.start.x, dragState.start.y, pos.x, pos.y, {
    stroke: "url(#temp-line-gradient)",
    width: 2.5,
    dash: "6 5",
    opacity: 0.78,
    className: "temp-line",
  });
}

function endDrag(e) {
  if (!dragState) return;
  const target = dragState.hoverAudience;
  dragState.policyEl.releasePointerCapture(e.pointerId);
  clearTempLines();
  if (target) {
    tryMatch(dragState.policyEl.dataset.id, target.dataset.id);
  }
  dragState = null;
}

function resizeFireworksCanvas() {
  const shell = celebrationLayer.parentElement;
  const rect = shell.getBoundingClientRect();
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
  setFeedback("太棒了，全部连对！", "ok");
}

function resetGame() {
  selectedPolicyId = null;
  matchedCount = 0;
  matchedIds = new Set();
  permanentLines = [];
  dragState = null;
  linesLayer.querySelectorAll("path").forEach((node) => node.remove());
  hideCelebration();
  renderLists();
  updateCounter();
  setFeedback("");
}

matchBoard.addEventListener("pointermove", moveDrag);
matchBoard.addEventListener("pointerup", endDrag);
matchBoard.addEventListener("pointercancel", endDrag);
resetButton.addEventListener("click", resetGame);
window.addEventListener("resize", () => {
  redrawPermanentLines();
  if (!celebrationLayer.hidden) resizeFireworksCanvas();
});

resetGame();
