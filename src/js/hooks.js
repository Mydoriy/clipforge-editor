/* ==========================================================================
   CLIPFORGE - HOOK LAB, LOOP CHECK & TEMPLATE STUDIO
   ========================================================================== */
let isLoopChecking = false;

const HOOK_PRESETS = [
  {
    id: "zoom_shock",
    name: "Zoom Punch & Shockwave",
    desc: "Zoom nảy 1.4x đột ngột tại giây 0.4 kèm nháy sáng",
    apply: (proj) => {
      const clip = proj.clips.find(c => c.trackId === "track-main" && c.start <= 0.5);
      if (clip) {
        clip.keyframes = clip.keyframes || {};
        clip.keyframes.scale = [
          { time: 0.0, value: 1.0, easing: "easeInOut" },
          { time: 0.4, value: 1.45, easing: "bounce" },
          { time: 1.2, value: 1.05, easing: "easeOut" }
        ];
        clip.effects = clip.effects || [];
        clip.effects.push({ id: "fx_zoom", type: "zoom_punch", intensity: 75 });
      }
    }
  },
  {
    id: "flash_glitch",
    name: "Flash Glitch Giật Gân",
    desc: "Chớp trắng kép + biến dạng lát cắt kỹ thuật số",
    apply: (proj) => {
      const clip = proj.clips.find(c => c.trackId === "track-main" && c.start <= 0.5);
      if (clip) {
        clip.effects = clip.effects || [];
        clip.effects.push({ id: "fx_flash", type: "flash", intensity: 90 });
        clip.effects.push({ id: "fx_glitch", type: "glitch", intensity: 65 });
      }
    }
  },
  {
    id: "rgb_shake",
    name: "RGB Split & Camera Rung",
    desc: "Tách dải màu neon + camera rung giật như quay tay",
    apply: (proj) => {
      const clip = proj.clips.find(c => c.trackId === "track-main" && c.start <= 0.5);
      if (clip) {
        clip.effects = clip.effects || [];
        clip.effects.push({ id: "fx_rgb", type: "rgb_split", intensity: 60 });
        clip.effects.push({ id: "fx_shake", type: "shake", intensity: 55 });
      }
    }
  },
  {
    id: "countdown",
    name: "Đếm Ngược 3 - 2 - 1",
    desc: "Chữ số đếm ngược khổng lồ phóng to nảy vào tâm",
    apply: (proj) => {
      addTextClipToTimeline("3... 2... 1... GO!", "Anton", 80, "#ffeb3b", "bounce");
    }
  },
  {
    id: "whip_pan",
    name: "Whip Pan Xé Gió",
    desc: "Chuyển động lướt cực nhanh từ mép phải vào",
    apply: (proj) => {
      const clip = proj.clips.find(c => c.trackId === "track-main" && c.start <= 0.5);
      if (clip) {
        clip.transitionIn = { type: "slide", duration: 0.4 };
        clip.effects = clip.effects || [];
        clip.effects.push({ id: "fx_shake", type: "shake", intensity: 40 });
      }
    }
  },
  {
    id: "strobe",
    name: "Nháy Strobe Nhịp Điệu",
    desc: "Nháy chớp sáng 4Hz tạo cảm giác khẩn cấp",
    apply: (proj) => {
      const clip = proj.clips.find(c => c.trackId === "track-main" && c.start <= 0.5);
      if (clip) {
        clip.effects = clip.effects || [];
        clip.effects.push({ id: "fx_flash", type: "flash", intensity: 85 });
      }
    }
  },
  {
    id: "dramatic_vignette",
    name: "Vignette Điện Ảnh Siêu Gần",
    desc: "Viền tối 4 góc + creep zoom từ từ vào khuôn mặt",
    apply: (proj) => {
      const clip = proj.clips.find(c => c.trackId === "track-main" && c.start <= 0.5);
      if (clip) {
        clip.effects = clip.effects || [];
        clip.effects.push({ id: "fx_vignette", type: "vignette", intensity: 75 });
        clip.keyframes = clip.keyframes || {};
        clip.keyframes.scale = [
          { time: 0.0, value: 1.0, easing: "easeInOut" },
          { time: 3.0, value: 1.25, easing: "easeInOut" }
        ];
      }
    }
  },
  {
    id: "neon_bounce",
    name: "Khung Neon Bật Nảy",
    desc: "Khung viền neon quét sáng kết hợp tiêu đề nảy",
    apply: (proj) => {
      addTextClipToTimeline("TIKTOK HOOK MỚI 🚀", "Montserrat", 68, "#00ffff", "bounce");
    }
  }
];

function renderTemplateSlots() {
  const container = document.getElementById("templateSlotsContainer");
  if (!container) return;
  container.innerHTML = "";
  const slots = project.clips.filter(c => c.isSlot || c.type === "video" || c.type === "image");
  if (slots.length === 0) {
    container.innerHTML = `<div style="font-size:11px; color:var(--text-dim);">Chưa có clip nào được đánh dấu Slot. Chọn 1 clip trong timeline và tích chọn 'Media Slot' trong Inspector.</div>`;
    return;
  }
  slots.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "slot-card";
    card.innerHTML = `
      <div>
        <div style="font-weight:700; font-size:11px; color:var(--accent-coral);">SLOT ${idx + 1}: ${c.slotName || c.name || 'Media'}</div>
        <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">Thời lượng: ${c.duration.toFixed(1)}s</div>
      </div>
      <button class="btn btn-sm btn-primary btnReplaceSlot" data-clip-id="${c.id}">Thay Media</button>
    `;
    card.querySelector(".btnReplaceSlot").addEventListener("click", () => {
      const tempInput = document.createElement("input");
      tempInput.type = "file";
      tempInput.accept = "video/*,image/*";
      tempInput.onchange = async (ev) => {
        const f = ev.target.files[0];
        if (!f) return;
        const newAsset = await addAssetFromFile(f);
        c.assetId = newAsset.id;
        c.name = newAsset.name;
        renderTimeline();
        updateInspector();
        drawPreview();
        saveState("Thay thế Media Slot: " + newAsset.name);
      };
      tempInput.click();
    });
    container.appendChild(card);
  });
}
