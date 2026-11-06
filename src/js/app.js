/* ==========================================================================
   CLIPFORGE - MAIN CONTROLLER, ASSET MANAGER & APP INITIALIZATION
   ========================================================================== */
async function addAssetFromFile(file) {
  const id = "asset_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const url = URL.createObjectURL(file);
  let type = "video";
  if (file.type.startsWith("image/")) type = "image";
  else if (file.type.startsWith("audio/")) type = "audio";

  const asset = {
    id,
    name: file.name,
    type,
    url,
    duration: 5.0,
    width: 1080,
    height: 1920
  };

  if (type === "video") {
    const vid = document.createElement("video");
    vid.src = url;
    vid.muted = true;
    vid.playsInline = true;
    await new Promise((resolve) => {
      vid.onloadedmetadata = () => {
        asset.duration = vid.duration || 5.0;
        asset.width = vid.videoWidth || 1080;
        asset.height = vid.videoHeight || 1920;
        loadedVideos.set(id, vid);
        resolve();
      };
      vid.onerror = () => resolve();
    });
  } else if (type === "image") {
    const img = new Image();
    img.src = url;
    await new Promise((resolve) => {
      img.onload = () => {
        asset.width = img.naturalWidth || 1080;
        asset.height = img.naturalHeight || 1920;
        loadedImages.set(id, img);
        resolve();
      };
      img.onerror = () => resolve();
    });
  } else if (type === "audio") {
    try {
      const ctx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      asset.duration = audioBuffer.duration;
      audioSampleBuffers.set(id, audioBuffer);
    } catch (e) {
      console.warn("Failed to decode audio:", e);
    }
  }

  project.assets.push(asset);
  renderAssetList();
  saveState("Thêm tài sản: " + file.name);
  return asset;
}

function createProceduralSampleCanvas(title, sub, color1, color2) {
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 720;
  const ctx = c.getContext("2d");
  
  const grad = ctx.createLinearGradient(0, 0, 1280, 720);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  for (let x = 0; x < 1280; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke();
  }
  for (let y = 0; y < 720; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px Montserrat, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, 640, 330);

  ctx.fillStyle = "#ffeb3b";
  ctx.font = "bold 32px Montserrat, sans-serif";
  ctx.fillText(sub, 640, 400);

  return c;
}

async function loadSampleProject() {
  project.clips = [];
  project.assets = [];

  const c1 = createProceduralSampleCanvas("CLIPFORGE 9:16", "DỰNG VIDEO TIKTOK TRÊN WEB", "#0f2027", "#2c5364");
  const url1 = c1.toDataURL("image/png");
  const img1 = new Image();
  img1.src = url1;
  await new Promise(r => img1.onload = r);
  const asset1 = {
    id: "asset_sample_1",
    name: "Video_Ngang_Trend.mp4",
    type: "image",
    url: url1,
    duration: 7.0,
    width: 1280,
    height: 720
  };
  loadedImages.set(asset1.id, img1);
  project.assets.push(asset1);

  const c2 = createProceduralSampleCanvas("HIỆU ỨNG TREND", "RGB SPLIT • GLITCH • VHS", "#8A2387", "#F27121");
  const url2 = c2.toDataURL("image/png");
  const img2 = new Image();
  img2.src = url2;
  await new Promise(r => img2.onload = r);
  const asset2 = {
    id: "asset_sample_2",
    name: "Clip_Mau_2.mp4",
    type: "image",
    url: url2,
    duration: 8.0,
    width: 1280,
    height: 720
  };
  loadedImages.set(asset2.id, img2);
  project.assets.push(asset2);

  const beatBuffer = generateProceduralSynthBeat();
  const assetAudio = {
    id: "asset_sample_audio",
    name: "TikTok_LoFi_Beat.mp3",
    type: "audio",
    url: "",
    duration: 15.0,
    width: 0,
    height: 0
  };
  audioSampleBuffers.set(assetAudio.id, beatBuffer);
  project.assets.push(assetAudio);

  project.clips.push({
    id: "clip_main_1",
    trackId: "track-main",
    assetId: asset1.id,
    type: "image",
    name: asset1.name,
    start: 0.0,
    duration: 7.0,
    inPoint: 0.0,
    speed: 1.0,
    volume: 1.0,
    fadeIn: 0.5,
    fadeOut: 0.5,
    transform: { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "blur_fill", cropX: 0.5 },
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
    effects: [
      { id: "fx_rgb", type: "rgb_split", intensity: 40, params: {} }
    ],
    transitionIn: { type: "zoom_in", duration: 0.6 },
    keyframes: {
      scale: [
        { time: 0.0, value: 1.0, easing: "easeInOut" },
        { time: 2.5, value: 1.15, easing: "easeOut" }
      ],
      rotation: [],
      opacity: []
    }
  });

  project.clips.push({
    id: "clip_main_2",
    trackId: "track-main",
    assetId: asset2.id,
    type: "image",
    name: asset2.name,
    start: 7.0,
    duration: 8.0,
    inPoint: 0.0,
    speed: 1.0,
    volume: 1.0,
    fadeIn: 0.0,
    fadeOut: 0.8,
    transform: { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover", cropX: 0.5 },
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
    effects: [
      { id: "fx_vhs", type: "vhs", intensity: 50, params: {} }
    ],
    transitionIn: { type: "flash", duration: 0.5 },
    keyframes: {
      scale: [],
      rotation: [],
      opacity: []
    }
  });

  project.clips.push({
    id: "clip_text_1",
    trackId: "track-text",
    assetId: null,
    type: "text",
    name: "Hook: TIÊU ĐỀ NẢY",
    start: 0.5,
    duration: 4.5,
    inPoint: 0.0,
    speed: 1.0,
    volume: 1.0,
    fadeIn: 0,
    fadeOut: 0,
    transform: { x: 540, y: 550, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
    text: {
      content: "TIKTOK TREND 2026 🔥",
      font: "Anton",
      size: 72,
      color: "#ffffff",
      stroke: "#000000",
      strokeWidth: 6,
      bg: "rgba(255, 59, 92, 0.9)",
      bgPadding: 18,
      align: "center",
      shadow: true,
      animIn: "bounce",
      animOut: "none"
    },
    textAnimator: { enabled: true, unit: "char", animType: "scale_bounce", stagger: 0.05 },
    effects: [],
    transitionIn: { type: "none", duration: 0 },
    keyframes: {
      scale: [
        { time: 0.0, value: 0.6, easing: "easeInOut" },
        { time: 0.6, value: 1.0, easing: "easeOut" }
      ],
      rotation: [],
      opacity: []
    }
  });

  project.clips.push({
    id: "clip_text_2",
    trackId: "track-text",
    assetId: null,
    type: "text",
    name: "Phụ đề: ClipForge",
    start: 5.0,
    duration: 7.0,
    inPoint: 0.0,
    speed: 1.0,
    volume: 1.0,
    fadeIn: 0,
    fadeOut: 0,
    captionStyle: "karaoke",
    transform: { x: 540, y: 1350, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
    text: {
      content: "Dựng video 9:16 có hiệu ứng\nnhanh ngay trên trình duyệt!",
      font: "Montserrat",
      size: 46,
      color: "#ffff00",
      stroke: "#000000",
      strokeWidth: 4,
      bg: "rgba(0, 0, 0, 0.75)",
      bgPadding: 16,
      align: "center",
      shadow: true,
      animIn: "typewriter",
      animOut: "none"
    },
    tokens: [
      { word: "Dựng", start: 5.0, end: 5.8 },
      { word: "video", start: 5.8, end: 6.6 },
      { word: "9:16", start: 6.6, end: 7.4 },
      { word: "có", start: 7.4, end: 8.2 },
      { word: "hiệu", start: 8.2, end: 9.0 },
      { word: "ứng", start: 9.0, end: 9.8 },
      { word: "nhanh", start: 9.8, end: 10.6 },
      { word: "trên", start: 10.6, end: 11.4 },
      { word: "web!", start: 11.4, end: 12.0 }
    ],
    effects: [],
    transitionIn: { type: "none", duration: 0 },
    keyframes: { scale: [], rotation: [], opacity: [] }
  });

  project.clips.push({
    id: "clip_audio_1",
    trackId: "track-audio",
    assetId: assetAudio.id,
    type: "audio",
    name: assetAudio.name,
    start: 0.0,
    duration: 15.0,
    inPoint: 0.0,
    speed: 1.0,
    volume: 1.0,
    fadeIn: 0.5,
    fadeOut: 1.0,
    transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, fit: "cover" },
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
    effects: [],
    transitionIn: { type: "none", duration: 0 },
    keyframes: { scale: [], rotation: [], opacity: [] }
  });

  renderAssetList();
  renderTimeline();
  activeClipId = "clip_main_1";
  updateInspector();
  drawPreview();
  saveState("Khởi tạo dự án mẫu");
}

function renderAssetList() {
  const container = document.getElementById("assetGrid");
  if (!container) return;
  container.innerHTML = "";
  project.assets.forEach(asset => {
    const card = document.createElement("div");
    card.className = "asset-card";
    let thumbContent = "";
    if (asset.type === "image" || asset.type === "video") {
      thumbContent = `<img src="${asset.url}" class="asset-thumb-img" alt="${asset.name}" />`;
    } else {
      thumbContent = `<div style="font-size:24px; color:var(--track-audio);">🎵</div>`;
    }

    card.innerHTML = `
      <div class="asset-thumb-box">
        ${thumbContent}
        <div class="asset-badge">${Math.round(asset.duration)}s</div>
      </div>
      <div class="asset-info">
        <div class="asset-title" title="${asset.name}">${asset.name}</div>
        <div class="asset-actions">
          <span style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">${asset.type}</span>
          <button class="btn-add-asset" data-asset-id="${asset.id}">+ Thêm</button>
        </div>
      </div>
    `;

    card.querySelector('.btn-add-asset').addEventListener('click', (e) => {
      e.stopPropagation();
      addAssetToTimeline(asset.id);
    });

    container.appendChild(card);
  });
}

function addAssetToTimeline(assetId) {
  const asset = project.assets.find(a => a.id === assetId);
  if (!asset) return;

  let targetTrackId = "track-main";
  if (asset.type === "audio") targetTrackId = "track-audio";

  const newClip = {
    id: "clip_" + Date.now(),
    trackId: targetTrackId,
    assetId: asset.id,
    type: asset.type,
    name: asset.name,
    start: playheadTime,
    duration: Math.min(asset.duration, 5.0),
    inPoint: 0.0,
    speed: 1.0,
    volume: 1.0,
    fadeIn: 0.0,
    fadeOut: 0.0,
    transform: { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "blur_fill", cropX: 0.5 },
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
    effects: [],
    transitionIn: { type: "none", duration: 0 },
    keyframes: { scale: [], rotation: [], opacity: [] }
  };

  project.clips.push(newClip);
  activeClipId = newClip.id;
  renderTimeline();
  updateInspector();
  drawPreview();
  saveState("Thêm clip: " + asset.name);
}

function addTextClipToTimeline(textStr, font, size, color, animIn) {
  const newClip = {
    id: "clip_text_" + Date.now(),
    trackId: "track-text",
    assetId: null,
    type: "text",
    name: textStr.substring(0, 14),
    start: playheadTime,
    duration: 4.0,
    inPoint: 0.0,
    speed: 1.0,
    volume: 1.0,
    fadeIn: 0,
    fadeOut: 0,
    transform: { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
    text: {
      content: textStr,
      font: font || "Montserrat",
      size: size || 60,
      color: color || "#ffffff",
      stroke: "#000000",
      strokeWidth: 5,
      bg: "rgba(0,0,0,0.7)",
      bgPadding: 16,
      align: "center",
      shadow: true,
      animIn: animIn || "bounce",
      animOut: "none"
    },
    effects: [],
    transitionIn: { type: "none", duration: 0 },
    keyframes: { scale: [], rotation: [], opacity: [] }
  };

  project.clips.push(newClip);
  activeClipId = newClip.id;
  renderTimeline();
  updateInspector();
  drawPreview();
  saveState("Thêm chữ: " + textStr);
}

function init() {
  fitPreviewCanvas();
  window.addEventListener("resize", fitPreviewCanvas);

  openDatabase().then(() => {
    loadSampleProject();
  });

  populateLibraries();
  if (typeof initSupabase === "function") initSupabase();

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
      return;
    }

    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      stepFrame(e.shiftKey ? -project.fps : -1);
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      stepFrame(e.shiftKey ? project.fps : 1);
    } else if (e.code === "KeyS" || (e.ctrlKey && e.code === "KeyB")) {
      e.preventDefault();
      splitActiveClipAtPlayhead();
    } else if (e.code === "Delete" || e.code === "Backspace") {
      e.preventDefault();
      deleteActiveClip();
    } else if (e.ctrlKey && e.code === "KeyD") {
      e.preventDefault();
      duplicateActiveClip();
    } else if (e.ctrlKey && e.code === "KeyZ") {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (e.ctrlKey && e.code === "KeyY") {
      e.preventDefault();
      redo();
    }
  });

  // Playback buttons
  document.getElementById("btnPlayPause").addEventListener("click", togglePlay);
  document.getElementById("btnStepBack").addEventListener("click", () => stepFrame(-1));
  document.getElementById("btnStepForward").addEventListener("click", () => stepFrame(1));

  // Toolbar Actions
  document.getElementById("btnSplitClip").addEventListener("click", splitActiveClipAtPlayhead);
  document.getElementById("btnDeleteClip").addEventListener("click", deleteActiveClip);
  document.getElementById("btnDuplicateClip").addEventListener("click", duplicateActiveClip);

  document.getElementById("btnToggleSnap").addEventListener("click", () => {
    isSnapping = !isSnapping;
    document.getElementById("lblSnapState").innerText = isSnapping ? I18N[currentLang].snapOn : I18N[currentLang].snapOff;
  });

  document.getElementById("zoomTimelineSlider").addEventListener("input", (e) => {
    pixelsPerSecond = parseInt(e.target.value);
    renderTimeline();
  });

  // Header buttons
  document.getElementById("btnUndo").addEventListener("click", undo);
  document.getElementById("btnRedo").addEventListener("click", redo);
  document.getElementById("btnExportVideo").addEventListener("click", openExportModal);
  document.getElementById("btnCloseExportModal").addEventListener("click", closeExportModal);
  document.getElementById("btnCancelExport").addEventListener("click", closeExportModal);
  document.getElementById("btnStartExport").addEventListener("click", executeExport);

  // Safe Zone Overlay Toggle
  document.getElementById("btnToggleSafeZone").addEventListener("click", () => {
    project.safeZone.enabled = !project.safeZone.enabled;
    const ov = document.getElementById("safeZoneOverlay");
    if (project.safeZone.enabled) ov.classList.remove("hidden");
    else ov.classList.add("hidden");
    drawPreview();
  });

  // Language Toggle
  document.getElementById("btnLangToggle").addEventListener("click", () => {
    currentLang = (currentLang === "vi") ? "en" : "vi";
    document.getElementById("btnLangToggle").innerText = (currentLang === "vi") ? "🇻🇳 VI" : "🇬🇧 EN";
    document.getElementById("lblExportAction").innerText = I18N[currentLang].exportAction;
    document.getElementById("lblSafeZone").innerText = I18N[currentLang].safeZone;
    document.getElementById("lblDropPrompt").innerText = I18N[currentLang].dropPrompt;
    document.getElementById("lblAssetListHeader").innerText = I18N[currentLang].assetHeader;
    document.getElementById("btnLoadSampleAssets").innerText = I18N[currentLang].sampleBtn;
    document.getElementById("btnAddTextQuick").innerText = I18N[currentLang].addText;
    document.getElementById("lblInspectorTitle").innerText = I18N[currentLang].inspectorTitle;
    document.getElementById("lblExportModalTitle").innerText = I18N[currentLang].exportModalTitle;
    document.getElementById("btnStartExport").innerText = I18N[currentLang].startExport;
    document.getElementById("btnCancelExport").innerText = I18N[currentLang].cancel;
    document.getElementById("lblSnapState").innerText = isSnapping ? I18N[currentLang].snapOn : I18N[currentLang].snapOff;
    updateInspector();
  });

  // Tab switching
  document.querySelectorAll(".drawer-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".drawer-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      const allPanels = ["media", "text", "fx", "trans", "hook", "caption", "template", "sticker", "shape", "particle", "tts"];
      allPanels.forEach(p => {
        const panelEl = document.getElementById("panel" + p.charAt(0).toUpperCase() + p.slice(1));
        if (panelEl) panelEl.classList.toggle("hidden", target !== p);
      });
    });
  });

  // Quick Add Text Buttons
  document.getElementById("btnAddTextQuick").addEventListener("click", () => {
    addTextClipToTimeline("VĂN BẢN MỚI", "Montserrat", 64, "#ffffff", "bounce");
  });
  document.querySelectorAll(".preset-text-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      if (p === "hook") addTextClipToTimeline("HOOK TIKTOK GIẬT GÂN 💥", "Anton", 76, "#ffeb3b", "bounce");
      else if (p === "sub") addTextClipToTimeline("Phụ đề chạy chữ nội dung", "Montserrat", 48, "#ffffff", "pop");
      else if (p === "typewriter") addTextClipToTimeline("Từng từ xuất hiện liên tục...", "Roboto", 52, "#00ffcc", "typewriter");
    });
  });

  // Dropzone Media
  const dropzone = document.getElementById("dropzoneMedia");
  const fileInput = document.getElementById("inputFileMedia");
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files) {
        for (let f of e.dataTransfer.files) {
          await addAssetFromFile(f);
        }
      }
    });
    fileInput.addEventListener("change", async (e) => {
      if (e.target.files) {
        for (let f of e.target.files) {
          await addAssetFromFile(f);
        }
      }
    });
  }

  document.getElementById("btnLoadSampleAssets").addEventListener("click", () => {
    loadSampleProject();
  });

  document.getElementById("btnProjectExport").addEventListener("click", () => {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    downloadBlob(blob, `${project.name || 'Du_An_TikTok'}.clipforge.json`);
  });

  const inputImport = document.getElementById("inputImportJson");
  document.getElementById("btnProjectImport").addEventListener("click", () => inputImport.click());
  inputImport.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        project = JSON.parse(ev.target.result);
        activeClipId = project.clips[0]?.id || null;
        renderAssetList();
        renderTimeline();
        updateInspector();
        drawPreview();
        saveState("Nhập file dự án");
      } catch (err) {
        alert("File dự án không hợp lệ!");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("projectNameInput").addEventListener("input", (e) => {
    project.name = e.target.value;
  });
  document.getElementById("projectNameInput").addEventListener("change", () => {
    saveState("Đổi tên dự án");
  });

  // Timeline Ruler scrubbing
  if (timelineRuler) {
    timelineRuler.addEventListener("mousedown", (e) => {
      const rect = timelineRuler.getBoundingClientRect();
      function updateScrub(ev) {
        const x = ev.clientX - rect.left;
        seekTo(Math.max(0, x / pixelsPerSecond));
      }
      updateScrub(e);
      function onMove(ev) { updateScrub(ev); }
      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  const phead = document.getElementById("timelinePlayheadHead");
  if (phead) {
    phead.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      const scrollRect = timelineContainer.getBoundingClientRect();
      function onMove(ev) {
        const x = ev.clientX - scrollRect.left;
        seekTo(Math.max(0, x / pixelsPerSecond));
      }
      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  // Hook Lab Population
  const hookContainer = document.getElementById("hookPresetsList");
  if (hookContainer) {
    hookContainer.innerHTML = "";
    HOOK_PRESETS.forEach(hp => {
      const card = document.createElement("div");
      card.className = "hook-card";
      card.innerHTML = `
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="hook-badge">3 GIÂY ĐẦU</span>
            <span style="font-weight:700; font-size:12px;">${hp.name}</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${hp.desc}</div>
        </div>
        <button class="btn btn-sm btn-primary" style="margin-left:8px;">Áp Dụng</button>
      `;
      card.querySelector("button").addEventListener("click", () => {
        hp.apply(project);
        renderTimeline();
        updateInspector();
        drawPreview();
        seekTo(0.0);
        play();
        saveState("Áp dụng Hook: " + hp.name);
      });
      hookContainer.appendChild(card);
    });
  }

  // Caption Studio Controller
  let selectedCaptionStyle = "karaoke";
  document.querySelectorAll(".caption-style-card").forEach(c => {
    c.addEventListener("click", () => {
      document.querySelectorAll(".caption-style-card").forEach(x => x.classList.remove("selected"));
      c.classList.add("selected");
      selectedCaptionStyle = c.dataset.style;
    });
  });

  const btnImportSrt = document.getElementById("btnImportSrtFile");
  const inputSrt = document.getElementById("inputSrtFile");
  if (btnImportSrt && inputSrt) {
    btnImportSrt.addEventListener("click", () => inputSrt.click());
    inputSrt.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const entries = parseSrt(ev.target.result);
        if (entries.length > 0) {
          entries.forEach((en, idx) => {
            const words = en.content.trim().split(/\s+/);
            const wordDur = en.duration / words.length;
            const tokens = words.map((w, wIdx) => ({
              word: w,
              start: en.start + wIdx * wordDur,
              end: en.start + (wIdx + 1) * wordDur
            }));
            project.clips.push({
              id: "clip_sub_" + Date.now() + "_" + idx,
              trackId: "track-text",
              assetId: null,
              type: "text",
              captionStyle: selectedCaptionStyle,
              name: en.content.substring(0, 16),
              start: en.start,
              duration: en.duration,
              inPoint: 0,
              speed: 1,
              volume: 1,
              fadeIn: 0,
              fadeOut: 0,
              tokens,
              transform: { x: 540, y: 1420, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
              crop: { left: 0, top: 0, right: 0, bottom: 0 },
              text: {
                content: en.content,
                font: "Montserrat",
                size: 52,
                color: "#ffffff",
                stroke: "#000000",
                strokeWidth: 5,
                bg: "rgba(0,0,0,0.7)",
                bgPadding: 16,
                align: "center",
                shadow: true,
                animIn: "bounce",
                animOut: "none"
              },
              effects: [],
              transitionIn: { type: "none", duration: 0 },
              keyframes: { scale: [], rotation: [], opacity: [] }
            });
          });
          renderTimeline();
          drawPreview();
          saveState("Nhập phụ đề .SRT");
          alert(`Đã nhập thành công ${entries.length} dòng phụ đề vào Timeline!`);
        }
      };
      reader.readAsText(file);
    });
  }

  const btnGenCaptions = document.getElementById("btnGenerateCaptionsToTimeline");
  if (btnGenCaptions) {
    btnGenCaptions.addEventListener("click", () => {
      const script = document.getElementById("captionScriptInput").value;
      if (!script.trim()) {
        alert("Vui lòng dán nội dung kịch bản hoặc lời bài hát trước!");
        return;
      }
      const caps = generateCaptionsFromScript(script, project.duration, playheadTime);
      caps.forEach((en, idx) => {
        project.clips.push({
          id: "clip_cap_" + Date.now() + "_" + idx,
          trackId: "track-text",
          assetId: null,
          type: "text",
          captionStyle: selectedCaptionStyle,
          name: en.content.substring(0, 14),
          start: en.start,
          duration: en.duration,
          inPoint: 0,
          speed: 1,
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
          tokens: en.tokens,
          transform: { x: 540, y: 1400, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
          crop: { left: 0, top: 0, right: 0, bottom: 0 },
          text: {
            content: en.content,
            font: "Montserrat",
            size: 54,
            color: "#ffffff",
            stroke: "#000000",
            strokeWidth: 5,
            bg: "rgba(0,0,0,0.7)",
            bgPadding: 16,
            align: "center",
            shadow: true,
            animIn: "bounce",
            animOut: "none"
          },
          effects: [],
          transitionIn: { type: "none", duration: 0 },
          keyframes: { scale: [], rotation: [], opacity: [] }
        });
      });
      renderTimeline();
      drawPreview();
      saveState("Tạo phụ đề từ kịch bản");
      alert(`Đã chia đều và thêm ${caps.length} dòng phụ đề vào Timeline!`);
    });
  }

  // Beat Sync Modal
  const modalBeatSync = document.getElementById("modalBeatSync");
  if (modalBeatSync) {
    document.getElementById("btnOpenBeatSync").addEventListener("click", () => {
      modalBeatSync.classList.add("open");
    });
    document.getElementById("btnCloseBeatSync").addEventListener("click", () => modalBeatSync.classList.remove("open"));
    document.getElementById("btnCloseBeatSyncFooter").addEventListener("click", () => modalBeatSync.classList.remove("open"));

    document.getElementById("btnRunBeatAnalysis").addEventListener("click", () => {
      const audioClip = project.clips.find(c => c.type === "audio");
      if (!audioClip) {
        alert("Dự án chưa có clip âm thanh nào trên track Audio để phân tích nhịp!");
        return;
      }
      const buf = audioSampleBuffers.get(audioClip.assetId);
      if (!buf) {
        alert("Đang tải dữ liệu âm thanh, vui lòng thử lại sau giây lát.");
        return;
      }
      const beats = analyzeAudioBeats(buf);
      project.beatMarkers = beats;
      const estBpm = beats.length > 2 ? Math.round(60 / ((beats[beats.length - 1] - beats[0]) / (beats.length - 1))) : 120;
      document.getElementById("beatAnalysisResult").innerHTML = `
        ✅ <b>Đã phân tích xong!</b> Phát hiện <b>${beats.length} nhịp</b>. Nhịp độ ước tính: <b>~${estBpm} BPM</b>.
        <br><span style="color:var(--accent-coral);">Đã hiển thị các mốc nhịp kim cương cyan trên thước Timeline.</span>
      `;
      renderTimeline();
      saveState("Phân tích Beat Sync");
    });

    document.getElementById("btnApplyCutToBeat").addEventListener("click", () => {
      if (!project.beatMarkers || project.beatMarkers.length === 0) {
        alert("Vui lòng nhấn 'Phân Tích Nhịp Âm Thanh' trước!");
        return;
      }
      const clip = project.clips.find(c => c.id === activeClipId && (c.type === "video" || c.type === "image"));
      if (!clip) {
        alert("Vui lòng chọn 1 clip video hoặc ảnh trên timeline để cắt theo nhịp!");
        return;
      }
      const relevantBeats = project.beatMarkers.filter(b => b > (clip.start + 0.2) && b < (clip.start + clip.duration - 0.2));
      if (relevantBeats.length === 0) {
        alert("Không có nhịp nào nằm trong khoảng thời lượng của clip đang chọn.");
        return;
      }

      let curStart = clip.start;
      let curIn = clip.inPoint;
      const baseSpeed = clip.speed || 1.0;
      const pieces = [];

      relevantBeats.forEach(b => {
        const dur = b - curStart;
        const piece = JSON.parse(JSON.stringify(clip));
        piece.id = "clip_beat_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        piece.start = curStart;
        piece.duration = dur;
        piece.inPoint = curIn;
        pieces.push(piece);
        curStart = b;
        curIn += dur * baseSpeed;
      });

      const lastDur = (clip.start + clip.duration) - curStart;
      if (lastDur > 0.1) {
        const lastPiece = JSON.parse(JSON.stringify(clip));
        lastPiece.id = "clip_beat_" + Date.now() + "_last";
        lastPiece.start = curStart;
        lastPiece.duration = lastDur;
        lastPiece.inPoint = curIn;
        pieces.push(lastPiece);
      }

      project.clips = project.clips.filter(c => c.id !== clip.id).concat(pieces);
      activeClipId = pieces[0]?.id || null;
      renderTimeline();
      drawPreview();
      saveState("Cắt clip theo nhịp");
      modalBeatSync.classList.remove("open");
      alert(`Đã cắt clip thành ${pieces.length} đoạn theo nhịp trống!`);
    });

    document.getElementById("btnApplyBeatPulse").addEventListener("click", () => {
      if (!project.beatMarkers || project.beatMarkers.length === 0) {
        alert("Vui lòng phân tích nhịp âm thanh trước!");
        return;
      }
      const fxType = document.getElementById("selBeatEffectType").value;
      const intensity = parseInt(document.getElementById("inpBeatEffectIntensity").value);
      project.beatPulseEffect = { type: fxType, intensity };
      drawPreview();
      saveState("Bật nháy hiệu ứng theo nhịp");
      modalBeatSync.classList.remove("open");
      alert(`Đã kích hoạt hiệu ứng ${fxType.toUpperCase()} nháy theo nhịp bài hát!`);
    });
  }

  // Loop Check Toggle
  const btnLoopCheck = document.getElementById("btnToggleLoopCheck");
  if (btnLoopCheck) {
    btnLoopCheck.addEventListener("click", () => {
      isLoopChecking = !isLoopChecking;
      const lbl = document.getElementById("lblLoopCheckState");
      let badge = document.getElementById("loopCheckBadge");

      if (isLoopChecking) {
        btnLoopCheck.classList.add("btn-primary");
        if (lbl) lbl.innerText = "Loop: Đang kiểm tra";
        if (!badge) {
          badge = document.createElement("div");
          badge.id = "loopCheckBadge";
          badge.className = "loop-check-indicator";
          badge.innerText = "🔁 ĐANG DUYỆT VÒNG LẶP (LOOP CHECK)";
          document.getElementById("phoneBox").appendChild(badge);
        }
        seekTo(Math.max(0, project.duration - 1.5));
        play();
      } else {
        btnLoopCheck.classList.remove("btn-primary");
        if (lbl) lbl.innerText = "Loop Check";
        if (badge) badge.remove();
      }
    });
  }

  // Adjustment Layer
  const btnAddAdj = document.getElementById("btnAddAdjustmentLayer");
  if (btnAddAdj) {
    btnAddAdj.addEventListener("click", () => {
      const adjClip = {
        id: "clip_adj_" + Date.now(),
        trackId: "track-overlay",
        assetId: null,
        type: "adjustment",
        name: "✨ Lớp Điều Chỉnh (FX & Màu)",
        start: playheadTime,
        duration: 5.0,
        inPoint: 0,
        speed: 1,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        blendMode: "normal",
        colorGrading: { exposure: 10, contrast: 15, saturation: 20, temperature: 10, tint: 0 },
        effects: [{ id: "fx_vignette", type: "vignette", intensity: 45 }],
        transform: { x: 540, y: 960, scale: 1, rotation: 0, opacity: 1, fit: "cover" },
        crop: { left: 0, top: 0, right: 0, bottom: 0 },
        keyframes: { scale: [], rotation: [], opacity: [] }
      };
      project.clips.push(adjClip);
      activeClipId = adjClip.id;
      renderTimeline();
      updateInspector();
      drawPreview();
      saveState("Thêm Lớp Điều Chỉnh");
    });
  }

  // Template Studio
  const btnSaveTpl = document.getElementById("btnSaveAsTemplate");
  if (btnSaveTpl) {
    btnSaveTpl.addEventListener("click", () => {
      const templateData = { ...project, isTemplate: true, templateCreatedAt: new Date().toISOString() };
      const jsonStr = JSON.stringify(templateData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      downloadBlob(blob, `${project.name || 'TikTok_Template'}.clipforge.template.json`);
      alert("Đã lưu Template thành công! Bạn có thể gửi file này cho creator khác hoặc tái sử dụng.");
    });
  }

  const btnOpenTpl = document.getElementById("btnOpenTemplateFile");
  const inputTpl = document.getElementById("inputTemplateFile");
  if (btnOpenTpl && inputTpl) {
    btnOpenTpl.addEventListener("click", () => inputTpl.click());
    inputTpl.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          project = JSON.parse(ev.target.result);
          renderAssetList();
          renderTimeline();
          updateInspector();
          drawPreview();
          saveState("Mở Template");
          renderTemplateSlots();
          alert("Đã mở Template! Hãy xem danh sách ô Media Slot bên dưới để thay video/ảnh mới.");
        } catch (err) {
          alert("File template không hợp lệ!");
        }
      };
      reader.readAsText(file);
    });
  }
  renderTemplateSlots();

  // Graph Editor Canvas Mouse Drag
  const graphCanvas = document.getElementById("graphCanvas");
  if (graphCanvas) {
    graphCanvas.addEventListener("mousedown", (e) => {
      const rect = graphCanvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (graphCanvas.width / rect.width);
      const my = (e.clientY - rect.top) * (graphCanvas.height / rect.height);

      const padX = 40, padY = 40;
      const graphW = graphCanvas.width - padX * 2;
      const graphH = graphCanvas.height - padY * 2;
      const px1 = padX + p1.x * graphW;
      const py1 = (graphCanvas.height - padY) - p1.y * graphH;
      const px2 = padX + p2.x * graphW;
      const py2 = (graphCanvas.height - padY) - p2.y * graphH;

      if (Math.hypot(mx - px1, my - py1) < 20) {
        draggingPoint = "p1";
      } else if (Math.hypot(mx - px2, my - py2) < 20) {
        draggingPoint = "p2";
      }

      function onMouseMove(ev) {
        if (!draggingPoint) return;
        const curX = (ev.clientX - rect.left) * (graphCanvas.width / rect.width);
        const curY = (ev.clientY - rect.top) * (graphCanvas.height / rect.height);
        const normX = Math.max(0, Math.min(1, (curX - padX) / graphW));
        const normY = (graphCanvas.height - padY - curY) / graphH;

        if (draggingPoint === "p1") {
          p1.x = normX;
          p1.y = normY;
        } else if (draggingPoint === "p2") {
          p2.x = normX;
          p2.y = normY;
        }
        drawGraphEditorCanvas();
      }

      function onMouseUp() {
        draggingPoint = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  document.querySelectorAll(".btn-preset-easing").forEach(btn => {
    btn.addEventListener("click", () => {
      const pr = btn.dataset.preset;
      if (pr === "linear") { p1 = { x: 0.0, y: 0.0 }; p2 = { x: 1.0, y: 1.0 }; }
      else if (pr === "ease") { p1 = { x: 0.25, y: 0.1 }; p2 = { x: 0.25, y: 1.0 }; }
      else if (pr === "easeIn") { p1 = { x: 0.42, y: 0.0 }; p2 = { x: 1.0, y: 1.0 }; }
      else if (pr === "easeOut") { p1 = { x: 0.0, y: 0.0 }; p2 = { x: 0.58, y: 1.0 }; }
      else if (pr === "easeInOut") { p1 = { x: 0.42, y: 0.0 }; p2 = { x: 0.58, y: 1.0 }; }
      else if (pr === "bounce") { p1 = { x: 0.175, y: 0.885 }; p2 = { x: 0.32, y: 1.275 }; }
      else if (pr === "overshoot") { p1 = { x: 0.34, y: 1.56 }; p2 = { x: 0.64, y: 1.0 }; }
      drawGraphEditorCanvas();
    });
  });

  const btnApplyCurve = document.getElementById("btnApplyGraphCurve");
  if (btnApplyCurve) {
    btnApplyCurve.addEventListener("click", () => {
      if (currentGraphClip && currentGraphClip.keyframes && currentGraphClip.keyframes[currentGraphProp]) {
        currentGraphClip.keyframes[currentGraphProp].forEach(kf => {
          kf.bezier = [parseFloat(p1.x.toFixed(3)), parseFloat(p1.y.toFixed(3)), parseFloat(p2.x.toFixed(3)), parseFloat(p2.y.toFixed(3))];
        });
        drawPreview();
        saveState("Áp dụng Bezier Curve cho " + currentGraphProp);
      }
      document.getElementById("modalGraphEditor").classList.remove("open");
      alert("Đã cập nhật đường cong Bezier cho các Keyframe của thuộc tính!");
    });
  }

  const btnCloseG1 = document.getElementById("btnCloseGraphEditor");
  if (btnCloseG1) btnCloseG1.addEventListener("click", () => document.getElementById("modalGraphEditor").classList.remove("open"));
  const btnCancelG1 = document.getElementById("btnCancelGraphEditor");
  if (btnCancelG1) btnCancelG1.addEventListener("click", () => document.getElementById("modalGraphEditor").classList.remove("open"));

  // Sticker Library
  const STICKER_LIST = [
    { type: "hot", name: "🔥 HOT Flame" },
    { type: "new", name: "⚡ NEW Badge" },
    { type: "follow", name: "➕ Follow Button" },
    { type: "arrow", name: "⬇️ Down Arrow" },
    { type: "warning", name: "⚠️ Warning Alert" },
    { type: "top", name: "⭐ 100% Top Rating" }
  ];
  const stickerContainer = document.getElementById("stickerLibraryList");
  if (stickerContainer) {
    stickerContainer.innerHTML = "";
    STICKER_LIST.forEach(stk => {
      const card = document.createElement("div");
      card.className = "sticker-card";
      card.innerHTML = `
        <div class="sticker-preview-box">${stk.name.slice(0, 2)}</div>
        <div style="font-size:11px; font-weight:600;">${stk.name}</div>
      `;
      card.addEventListener("click", () => {
        const newClip = {
          id: "clip_stk_" + Date.now(),
          trackId: "track-overlay",
          assetId: null,
          type: "sticker",
          stickerType: stk.type,
          name: stk.name,
          start: playheadTime,
          duration: 4.0,
          inPoint: 0,
          speed: 1,
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
          transform: { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
          crop: { left: 0, top: 0, right: 0, bottom: 0 },
          effects: [],
          transitionIn: { type: "pop", duration: 0.3 },
          keyframes: { scale: [], rotation: [], opacity: [] }
        };
        project.clips.push(newClip);
        activeClipId = newClip.id;
        renderTimeline();
        updateInspector();
        drawPreview();
        saveState("Thêm Sticker: " + stk.name);
      });
      stickerContainer.appendChild(card);
    });
  }

  // Shape Creation Buttons
  document.querySelectorAll(".btn-add-shape").forEach(btn => {
    btn.addEventListener("click", () => {
      const shapeKind = btn.dataset.shape;
      const newClip = {
        id: "clip_shp_" + Date.now(),
        trackId: "track-overlay",
        assetId: null,
        type: "shape",
        name: "Hình: " + shapeKind,
        start: playheadTime,
        duration: 5.0,
        inPoint: 0,
        speed: 1,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        shape: { type: shapeKind, fill: "#ff3b5c", stroke: "#ffffff", strokeWidth: 5, trimStart: 0, trimEnd: 100, trimOffset: 0 },
        transform: { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
        crop: { left: 0, top: 0, right: 0, bottom: 0 },
        effects: [],
        transitionIn: { type: "none", duration: 0 },
        keyframes: { scale: [], rotation: [], opacity: [] }
      };
      project.clips.push(newClip);
      activeClipId = newClip.id;
      renderTimeline();
      updateInspector();
      drawPreview();
      saveState("Thêm Hình khối: " + shapeKind);
    });
  });

  // Particle Creation Buttons
  document.querySelectorAll(".btn-add-particle").forEach(btn => {
    btn.addEventListener("click", () => {
      const pPreset = btn.dataset.particle;
      const newClip = {
        id: "clip_part_" + Date.now(),
        trackId: "track-overlay",
        assetId: null,
        type: "particle",
        particlePreset: pPreset,
        particleCount: 80,
        particleSpeed: 1.0,
        particleSize: 18,
        name: "Hạt: " + pPreset,
        start: playheadTime,
        duration: 6.0,
        inPoint: 0,
        speed: 1,
        volume: 1,
        fadeIn: 0.3,
        fadeOut: 0.5,
        transform: { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
        crop: { left: 0, top: 0, right: 0, bottom: 0 },
        effects: [],
        transitionIn: { type: "none", duration: 0 },
        keyframes: { scale: [], rotation: [], opacity: [] }
      };
      project.clips.push(newClip);
      activeClipId = newClip.id;
      renderTimeline();
      updateInspector();
      drawPreview();
      saveState("Thêm Hạt " + pPreset);
    });
  });

  // Text-To-Speech (TTS)
  let availableVoices = [];
  function populateTtsVoices() {
    if (!("speechSynthesis" in window)) return;
    availableVoices = window.speechSynthesis.getVoices();
    const sel = document.getElementById("ttsVoiceSelect");
    if (!sel || availableVoices.length === 0) return;
    sel.innerHTML = "";
    availableVoices.forEach((v, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.innerText = `${v.name} (${v.lang})`;
      if (v.lang.startsWith("vi")) opt.selected = true;
      sel.appendChild(opt);
    });
  }
  if ("speechSynthesis" in window) {
    populateTtsVoices();
    window.speechSynthesis.onvoiceschanged = populateTtsVoices;
  }

  const btnPrevTts = document.getElementById("btnPreviewTts");
  if (btnPrevTts) {
    btnPrevTts.addEventListener("click", () => {
      const text = document.getElementById("ttsTextInput").value;
      if (!text.trim()) { alert("Vui lòng nhập nội dung cần đọc!"); return; }
      if (!("speechSynthesis" in window)) { alert("Trình duyệt không hỗ trợ Web Speech API!"); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const selIdx = parseInt(document.getElementById("ttsVoiceSelect").value);
      if (availableVoices[selIdx]) u.voice = availableVoices[selIdx];
      u.rate = parseFloat(document.getElementById("ttsSpeedSlider").value);
      window.speechSynthesis.speak(u);
    });
  }

  const btnGenTts = document.getElementById("btnGenerateTtsClip");
  if (btnGenTts) {
    btnGenTts.addEventListener("click", () => {
      const text = document.getElementById("ttsTextInput").value;
      if (!text.trim()) { alert("Vui lòng nhập nội dung!"); return; }
      
      const speed = parseFloat(document.getElementById("ttsSpeedSlider").value);
      const wordCount = text.trim().split(/\s+/).length;
      const estimatedDuration = Math.max(1.5, (wordCount * 0.38) / speed);

      const ctx = getAudioContext();
      const sampleRate = ctx.sampleRate;
      const length = Math.floor(sampleRate * estimatedDuration);
      const audioBuffer = ctx.createBuffer(2, length, sampleRate);
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const mod = Math.sin(t * 12) * Math.sin(t * 3);
        const s = (Math.sin(2 * Math.PI * 180 * t) + Math.sin(2 * Math.PI * 340 * t) * 0.5) * mod * 0.2;
        left[i] = s;
        right[i] = s;
      }

      const ttsAssetId = "asset_tts_" + Date.now();
      audioSampleBuffers.set(ttsAssetId, audioBuffer);
      project.assets.push({
        id: ttsAssetId,
        name: "TTS: " + text.substring(0, 14),
        type: "audio",
        url: "",
        duration: estimatedDuration
      });

      project.clips.push({
        id: "clip_tts_" + Date.now(),
        trackId: "track-audio",
        assetId: ttsAssetId,
        type: "audio",
        name: "TTS: " + text.substring(0, 14),
        start: playheadTime,
        duration: estimatedDuration,
        inPoint: 0,
        speed: 1.0,
        volume: 1.0,
        fadeIn: 0.1,
        fadeOut: 0.2,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, fit: "cover" },
        crop: { left: 0, top: 0, right: 0, bottom: 0 },
        effects: [],
        transitionIn: { type: "none", duration: 0 },
        keyframes: { scale: [], rotation: [], opacity: [] }
      });

      renderAssetList();
      renderTimeline();
      drawPreview();
      saveState("Tạo giọng đọc TTS");
      alert(`Đã tạo clip âm thanh giọng đọc dài ${estimatedDuration.toFixed(1)}s trên timeline!`);
    });
  }

  // Pre-comp Grouping
  const btnPrecomp = document.getElementById("btnGroupPrecomp");
  if (btnPrecomp) {
    btnPrecomp.addEventListener("click", () => {
      const clipsToGroup = project.clips.filter(c => c.type !== "audio");
      if (clipsToGroup.length < 2) {
        alert("Cần có ít nhất 2 clip video/ảnh/chữ để gộp thành Pre-comp!");
        return;
      }

      const minStart = Math.min(...clipsToGroup.map(c => c.start));
      const maxEnd = Math.max(...clipsToGroup.map(c => c.start + c.duration));
      const precompDuration = maxEnd - minStart;

      const subClips = clipsToGroup.map(c => ({
        ...c,
        start: c.start - minStart
      }));

      const precompClip = {
        id: "clip_precomp_" + Date.now(),
        trackId: "track-main",
        assetId: null,
        type: "precomp",
        name: "📦 Nhóm Pre-comp (" + subClips.length + " clips)",
        start: minStart,
        duration: precompDuration,
        inPoint: 0,
        speed: 1,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        subClips,
        transform: { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "cover" },
        crop: { left: 0, top: 0, right: 0, bottom: 0 },
        effects: [],
        transitionIn: { type: "none", duration: 0 },
        keyframes: { scale: [], rotation: [], opacity: [] }
      };

      const groupedIds = new Set(clipsToGroup.map(c => c.id));
      project.clips = project.clips.filter(c => !groupedIds.has(c.id)).concat([precompClip]);
      activeClipId = precompClip.id;

      renderTimeline();
      updateInspector();
      drawPreview();
      saveState("Gộp nhóm Pre-comp");
      alert("Đã gộp thành công " + subClips.length + " clips thành một Pre-comp thống nhất!");
    });
  }

  // Point Tracking Crosshair Drag
  const crosshair = document.getElementById("trackingCrosshair");
  if (crosshair) {
    crosshair.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      const phoneBox = document.getElementById("phoneBox");
      function onMouseMove(ev) {
        const rect = phoneBox.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));
        crosshair.style.left = x + "px";
        crosshair.style.top = y + "px";
      }
      function onMouseUp() {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }
  const btnToggleTrack = document.getElementById("btnTogglePointTracking");
  if (btnToggleTrack) {
    btnToggleTrack.addEventListener("click", () => {
      const ch = document.getElementById("trackingCrosshair");
      if (ch) ch.classList.toggle("hidden");
    });
  }

  // Dismiss Onboarding Banner
  const btnDismiss = document.getElementById("btnDismissOnboarding");
  if (btnDismiss) {
    btnDismiss.addEventListener("click", () => {
      document.getElementById("onboardingBanner").classList.add("hidden");
    });
  }
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
