/* ==========================================================================
   CLIPFORGE - PROCEDURAL SHADERS, TRANSITIONS, CHROMA KEY & COLOR GRADING
   ========================================================================== */
function applyProceduralEffect(ctx, fx, time, W, H) {
  const intensity = (fx.intensity || 50) / 100;
  if (intensity <= 0) return;

  if (fx.type === "rgb_split") {
    const shift = Math.floor(intensity * 18);
    try {
      const imgData = ctx.getImageData(0, 0, W, H);
      const data = imgData.data;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = (y * W + x) * 4;
          const rIdx = (y * W + Math.max(0, x - shift)) * 4;
          const bIdx = (y * W + Math.min(W - 1, x + shift)) * 4;
          data[idx] = data[rIdx];
          data[idx + 2] = data[bIdx + 2];
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {}
  } else if (fx.type === "glitch") {
    const sliceCount = 8;
    const sliceHeight = H / sliceCount;
    for (let i = 0; i < sliceCount; i++) {
      if (Math.sin(i * 12.0 + time * 30.0) > 0.4) {
        const shiftX = Math.sin(time * 40.0 + i) * intensity * 50;
        ctx.drawImage(ctx.canvas, 0, i * sliceHeight, W, sliceHeight, shiftX, i * sliceHeight, W, sliceHeight);
      }
    }
  } else if (fx.type === "vhs") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    for (let y = 0; y < H; y += 6) {
      ctx.fillRect(0, y, W, 2);
    }
    ctx.fillStyle = `rgba(255, 0, 80, ${intensity * 0.12})`;
    ctx.fillRect(0, 0, W, H);
  } else if (fx.type === "zoom_punch") {
    const pulse = 1.0 + Math.abs(Math.sin(time * 8.0)) * intensity * 0.15;
    ctx.translate(W / 2, H / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-W / 2, -H / 2);
  } else if (fx.type === "shake") {
    const dx = (Math.sin(time * 30.0) + Math.cos(time * 45.0)) * intensity * 15;
    const dy = (Math.cos(time * 35.0) + Math.sin(time * 50.0)) * intensity * 15;
    ctx.translate(dx, dy);
  } else if (fx.type === "vignette") {
    const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.85);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.85})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (fx.type === "film_grain") {
    ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.08})`;
    for (let i = 0; i < 400; i++) {
      const rx = Math.random() * W;
      const ry = Math.random() * H;
      ctx.fillRect(rx, ry, 2, 2);
    }
  } else if (fx.type === "flash") {
    const flashAlpha = Math.max(0, 1.0 - (time % 1.0) * 4.0) * intensity;
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function applyTransition(ctx, type, prog, W, H) {
  if (type === "dissolve") {
    ctx.globalAlpha *= prog;
  } else if (type === "slide") {
    ctx.translate((1 - prog) * W, 0);
  } else if (type === "zoom_in") {
    const z = 1.3 - prog * 0.3;
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
  } else if (type === "flash") {
    if (prog < 0.3) {
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - prog / 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function applyChromaKey(ctx, chroma, W, H) {
  if (!chroma || !chroma.enabled) return;
  try {
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    const hex = chroma.color || "#00ff00";
    const kr = parseInt(hex.slice(1, 3), 16);
    const kg = parseInt(hex.slice(3, 5), 16);
    const kb = parseInt(hex.slice(5, 7), 16);
    const tol = (chroma.tolerance || 35) * 2.55;
    const sm = (chroma.smoothness || 15) * 2.55;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);

      if (dist < tol) {
        d[i + 3] = 0;
      } else if (dist < tol + sm) {
        const factor = (dist - tol) / sm;
        d[i + 3] = Math.round(d[i + 3] * factor);
      }
      if (kg > kr && kg > kb && d[i + 3] > 0) {
        const avgOther = (r + b) * 0.5;
        if (g > avgOther) d[i + 1] = avgOther;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {}
}

function applyColorGrading(ctx, cg, W, H) {
  if (!cg) return;
  const exp = cg.exposure || 0;
  const con = cg.contrast || 0;
  const sat = cg.saturation || 0;
  const temp = cg.temperature || 0;
  const tint = cg.tint || 0;
  if (exp === 0 && con === 0 && sat === 0 && temp === 0 && tint === 0 && !cg.lutData) return;

  try {
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    const expMult = 2 ** (exp / 50);
    const conFactor = (100 + con) / 100;
    const satFactor = (100 + sat) / 100;
    const rTemp = temp * 0.35;
    const bTemp = -temp * 0.35;
    const gTint = -tint * 0.35;
    const rTint = tint * 0.2;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      r *= expMult; g *= expMult; b *= expMult;
      r += rTemp + rTint; g += gTint; b += bTemp;
      r = ((r - 128) * conFactor) + 128;
      g = ((g - 128) * conFactor) + 128;
      b = ((b - 128) * conFactor) + 128;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * satFactor;
      g = lum + (g - lum) * satFactor;
      b = lum + (b - lum) * satFactor;

      if (cg.lutData) {
        const lutRgb = lookup3dLut(r, g, b, cg.lutData);
        r = lutRgb[0]; g = lutRgb[1]; b = lutRgb[2];
      }

      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {}
}

function parseCubeLut(text) {
  const lines = text.split(/\r?\n/);
  let size = 0;
  const data = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('LUT_3D_SIZE')) {
      size = parseInt(trimmed.split(/\s+/)[1], 10);
      continue;
    }
    const parts = trimmed.split(/\s+/).map(Number);
    if (parts.length >= 3 && !isNaN(parts[0])) {
      data.push(parts[0], parts[1], parts[2]);
    }
  }
  return { size, data: new Float32Array(data) };
}

function lookup3dLut(r, g, b, lut) {
  const s = lut.size;
  const d = lut.data;
  const scale = (s - 1) / 255;
  const rx = Math.max(0, Math.min(s - 1, r * scale));
  const gx = Math.max(0, Math.min(s - 1, g * scale));
  const bx = Math.max(0, Math.min(s - 1, b * scale));

  const x0 = Math.floor(rx);
  const y0 = Math.floor(gx);
  const z0 = Math.floor(bx);

  const idx = (z0 * s * s + y0 * s + x0) * 3;
  return [
    (d[idx] || 0) * 255,
    (d[idx + 1] || 0) * 255,
    (d[idx + 2] || 0) * 255
  ];
}

const PROCEDURAL_EFFECTS_LIST = [
  { type: "zoom_punch", name: "Zoom Punch", desc: "Nảy zoom theo nhịp nhạc giật mạnh" },
  { type: "shake", name: "Shake / Rung lắc", desc: "Rung camera ngẫu nhiên như quay tay" },
  { type: "rgb_split", name: "RGB Split", desc: "Tách dải màu đỏ/xanh chuẩn TikTok" },
  { type: "glitch", name: "Glitch Kỹ thuật số", desc: "Biến dạng lát cắt pixel ngẫu nhiên" },
  { type: "vhs", name: "Băng VHS Cổ điển", desc: "Đường quét scanline và lem màu retro" },
  { type: "film_grain", name: "Hạt Phim Điện ảnh", desc: "Hạt grain cổ điển chân thực" },
  { type: "vignette", name: "Vignette Tối Góc", desc: "Làm tối 4 góc tăng kịch tính" },
  { type: "flash", name: "Chớp Sáng Flash", desc: "Nháy sáng trắng rực rỡ" }
];

const TRANSITIONS_LIST = [
  { type: "dissolve", name: "Hòa tan (Dissolve)", desc: "Mờ dần vào cảnh sau mượt mà" },
  { type: "slide", name: "Trượt ngang (Slide)", desc: "Trượt nhanh khung hình từ phải sang" },
  { type: "zoom_in", name: "Phóng to (Zoom In)", desc: "Lao nhanh xuyên qua tâm khung hình" },
  { type: "flash", name: "Chớp trắng (Flash Cut)", desc: "Chuyển cảnh qua tia chớp trắng" }
];

function populateLibraries() {
  const fxContainer = document.getElementById("fxLibraryList");
  if (fxContainer) {
    fxContainer.innerHTML = "";
    PROCEDURAL_EFFECTS_LIST.forEach(fx => {
      const item = document.createElement("div");
      item.className = "fx-item";
      item.innerHTML = `
        <div class="fx-item-left">
          <div class="fx-icon-box">⚡</div>
          <div>
            <div class="fx-name">${fx.name}</div>
            <div class="fx-desc">${fx.desc}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary">+ Áp dụng</button>
      `;
      item.addEventListener("click", () => applyFxToActiveClip(fx.type));
      fxContainer.appendChild(item);
    });
  }

  const transContainer = document.getElementById("transLibraryList");
  if (transContainer) {
    transContainer.innerHTML = "";
    TRANSITIONS_LIST.forEach(tr => {
      const item = document.createElement("div");
      item.className = "fx-item";
      item.innerHTML = `
        <div class="fx-item-left">
          <div class="fx-icon-box" style="background:rgba(6,182,212,0.15); color:#06b6d4;">↔</div>
          <div>
            <div class="fx-name">${tr.name}</div>
            <div class="fx-desc">${tr.desc}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary">+ Áp dụng</button>
      `;
      item.addEventListener("click", () => applyTransToActiveClip(tr.type));
      transContainer.appendChild(item);
    });
  }
}

function applyFxToActiveClip(fxType) {
  const clip = project.clips.find(c => c.id === activeClipId);
  if (!clip) {
    alert("Vui lòng chọn một clip trên timeline trước khi áp dụng hiệu ứng!");
    return;
  }
  if (!clip.effects) clip.effects = [];
  clip.effects.push({
    id: "fx_" + Date.now(),
    type: fxType,
    intensity: 50,
    params: {}
  });
  updateInspector();
  drawPreview();
  saveState(`Thêm hiệu ứng ${fxType}`);
}

function applyTransToActiveClip(transType) {
  const clip = project.clips.find(c => c.id === activeClipId);
  if (!clip) {
    alert("Vui lòng chọn một clip trên timeline trước khi thêm chuyển cảnh!");
    return;
  }
  clip.transitionIn = { type: transType, duration: 0.5 };
  updateInspector();
  drawPreview();
  saveState(`Thêm chuyển cảnh ${transType}`);
}
