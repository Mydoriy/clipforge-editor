/* ==========================================================================
   CLIPFORGE - BEZIER CURVE SOLVER, EASING PHYSICS & SPEED RAMP
   ========================================================================== */
function solveCubicBezier(t, x1, y1, x2, y2) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let low = 0, high = 1, u = t;
  for (let i = 0; i < 16; i++) {
    const cu = 1 - u;
    const x = 3 * cu * cu * u * x1 + 3 * cu * u * u * x2 + u * u * u;
    if (Math.abs(x - t) < 0.001) break;
    if (x < t) low = u; else high = u;
    u = (low + high) * 0.5;
  }
  const cu = 1 - u;
  return 3 * cu * cu * u * y1 + 3 * cu * u * u * y2 + u * u * u;
}

function bounceEasing(t) {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

const SPEED_RAMP_PRESETS = {
  montage: [
    { t: 0.0, s: 2.5 },
    { t: 0.3, s: 1.0 },
    { t: 0.7, s: 1.0 },
    { t: 1.0, s: 2.5 }
  ],
  hero: [
    { t: 0.0, s: 1.0 },
    { t: 0.35, s: 0.25 },
    { t: 0.65, s: 0.25 },
    { t: 1.0, s: 1.0 }
  ],
  bullet: [
    { t: 0.0, s: 2.0 },
    { t: 0.25, s: 0.12 },
    { t: 0.65, s: 0.12 },
    { t: 1.0, s: 2.5 }
  ]
};

function getRampedSourceTime(clip, clipRelTime) {
  if (!clip.speedRamp || !clip.speedRamp.enabled || !clip.speedRamp.points || clip.speedRamp.points.length === 0) {
    return clipRelTime * (clip.speed || 1.0);
  }
  const pts = [...clip.speedRamp.points].sort((a, b) => a.t - b.t);
  const normT = Math.max(0, Math.min(1, clipRelTime / (clip.duration || 1.0)));
  
  let sourceIntegral = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const pA = pts[i];
    const pB = pts[i + 1];
    if (normT >= pB.t) {
      sourceIntegral += ((pA.s + pB.s) * 0.5) * (pB.t - pA.t);
    } else if (normT > pA.t) {
      const u = (normT - pA.t) / (pB.t - pA.t || 0.001);
      const sCur = pA.s + (pB.s - pA.s) * u;
      sourceIntegral += ((pA.s + sCur) * 0.5) * (normT - pA.t);
      break;
    }
  }
  return sourceIntegral * clip.duration;
}

// Graph Editor State
let currentGraphClip = null;
let currentGraphProp = "scale";
let p1 = { x: 0.42, y: 0.0 };
let p2 = { x: 0.58, y: 1.0 };
let draggingPoint = null;

function openGraphEditorForClip(clip, prop) {
  currentGraphClip = clip;
  currentGraphProp = prop;
  const modal = document.getElementById("modalGraphEditor");
  if (modal) {
    modal.classList.add("open");
    drawGraphEditorCanvas();
  }
}

function drawGraphEditorCanvas() {
  const c = document.getElementById("graphCanvas");
  if (!c) return;
  const ctx = c.getContext("2d");
  const W = c.width;
  const H = c.height;

  ctx.fillStyle = "#111215";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 44) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 44) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const padX = 40;
  const padY = 40;
  const graphW = W - padX * 2;
  const graphH = H - padY * 2;

  const x0 = padX, y0 = H - padY;
  const x3 = W - padX, y3 = padY;

  const px1 = x0 + p1.x * graphW;
  const py1 = y0 - p1.y * graphH;
  const px2 = x0 + p2.x * graphW;
  const py2 = y0 - p2.y * graphH;

  ctx.strokeStyle = "rgba(255, 59, 92, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(px1, py1); ctx.stroke();
  ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
  ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(px2, py2); ctx.stroke();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(px1, py1, px2, py2, x3, y3);
  ctx.stroke();

  ctx.fillStyle = "#ff3b5c";
  ctx.beginPath(); ctx.arc(px1, py1, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#06b6d4";
  ctx.beginPath(); ctx.arc(px2, py2, 7, 0, Math.PI * 2); ctx.fill();

  const lbl1 = document.getElementById("lblGraphP1");
  const lbl2 = document.getElementById("lblGraphP2");
  if (lbl1) lbl1.innerText = `P1: (${p1.x.toFixed(2)}, ${p1.y.toFixed(2)})`;
  if (lbl2) lbl2.innerText = `P2: (${p2.x.toFixed(2)}, ${p2.y.toFixed(2)})`;
}
