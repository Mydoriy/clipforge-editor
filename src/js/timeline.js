/* ==========================================================================
   CLIPFORGE - TIMELINE INTERACTION & PLAYHEAD ENGINE
   ========================================================================== */
const previewCanvas = document.getElementById("previewCanvas");
const timelineContainer = document.getElementById("timelineCanvasContainer");
const timelineRuler = document.getElementById("timelineRuler");
const playheadLine = document.getElementById("timelinePlayheadLine");

function fitPreviewCanvas() {
  const container = document.getElementById("phoneBox");
  if (!container) return;
  const maxH = container.parentElement.clientHeight - 80;
  const targetH = Math.min(maxH, 720);
  const targetW = Math.round(targetH * (9 / 16));
  previewCanvas.style.width = targetW + "px";
  previewCanvas.style.height = targetH + "px";
}

function drawPreview() {
  renderFrame(project, playheadTime, previewCanvas, { isExport: false });
  updateTimecode();
  updatePlayheadPosition();
}

function togglePlay() {
  if (isPlaying) pause(); else play();
}

function play() {
  getAudioContext();
  isPlaying = true;
  lastRenderTimestamp = performance.now();
  playAudioClips();
  const icon = document.getElementById('playIconSvg');
  if (icon) icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  requestAnimationFrame(playbackLoop);
}

function pause() {
  isPlaying = false;
  stopAudioClips();
  const icon = document.getElementById('playIconSvg');
  if (icon) icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

function playbackLoop(timestamp) {
  if (!isPlaying) return;
  const delta = (timestamp - lastRenderTimestamp) / 1000;
  lastRenderTimestamp = timestamp;

  playheadTime += delta * playbackSpeed;

  if (isLoopChecking) {
    if (playheadTime >= 1.5 && playheadTime < project.duration - 1.5) {
      playheadTime = Math.max(0, project.duration - 1.5);
      playAudioClips();
    } else if (playheadTime >= project.duration) {
      playheadTime = 0.0;
      playAudioClips();
    }
  } else {
    if (playheadTime >= project.duration) {
      playheadTime = 0.0;
    }
  }

  drawPreview();
  animationFrameId = requestAnimationFrame(playbackLoop);
}

function seekTo(time) {
  playheadTime = Math.max(0, Math.min(project.duration, time));
  if (isPlaying) {
    playAudioClips();
  }
  drawPreview();
}

function stepFrame(frames) {
  pause();
  seekTo(playheadTime + (frames / project.fps));
}

function updateTimecode() {
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const curM = pad(playheadTime / 60);
  const curS = pad(playheadTime % 60);
  const curF = pad((playheadTime % 1) * 100);

  const totM = pad(project.duration / 60);
  const totS = pad(project.duration % 60);
  const totF = pad((project.duration % 1) * 100);

  const tc = document.getElementById('timecodeDisplay');
  if (tc) tc.innerText = `${curM}:${curS}.${curF} / ${totM}:${totS}.${totF}`;
}

function updatePlayheadPosition() {
  const x = playheadTime * pixelsPerSecond;
  if (playheadLine) playheadLine.style.left = x + "px";
}

function renderTimeline() {
  const totalWidth = Math.max(1200, project.duration * pixelsPerSecond + 200);
  if (timelineContainer) timelineContainer.style.width = totalWidth + "px";

  if (timelineRuler) {
    timelineRuler.innerHTML = "";
    const stepSec = pixelsPerSecond < 30 ? 2 : 1;
    for (let s = 0; s <= project.duration; s += stepSec) {
      const tick = document.createElement("div");
      tick.className = "ruler-tick major";
      tick.style.left = (s * pixelsPerSecond) + "px";
      const m = Math.floor(s / 60);
      const sec = s % 60;
      tick.innerText = `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
      timelineRuler.appendChild(tick);
    }

    if (project.beatMarkers && project.beatMarkers.length > 0) {
      project.beatMarkers.forEach(bt => {
        const bm = document.createElement("div");
        bm.className = "timeline-beat-marker";
        bm.style.left = (bt * pixelsPerSecond) + "px";
        bm.title = `Beat: ${bt}s`;
        timelineRuler.appendChild(bm);
      });
    }
  }

  const trackRows = document.querySelectorAll(".track-row");
  trackRows.forEach(row => row.innerHTML = "");

  project.clips.forEach(clip => {
    let targetRow = document.querySelector(`.track-row[data-track-id="${clip.trackId}"]`);
    if (!targetRow) targetRow = document.querySelector('.track-row[data-track-id="track-overlay"]');
    if (!targetRow) return;

    const clipEl = document.createElement("div");
    clipEl.className = `timeline-clip type-${clip.type} ${clip.id === activeClipId ? 'selected' : ''}`;
    clipEl.style.left = (clip.start * pixelsPerSecond) + "px";
    clipEl.style.width = (clip.duration * pixelsPerSecond) + "px";
    clipEl.dataset.clipId = clip.id;

    if (clip.type === "audio") {
      const waveCanvas = document.createElement("canvas");
      waveCanvas.className = "audio-waveform-canvas";
      waveCanvas.width = Math.max(10, Math.floor(clip.duration * pixelsPerSecond));
      waveCanvas.height = 40;
      drawAudioWaveform(waveCanvas, clip.assetId);
      clipEl.appendChild(waveCanvas);
    }

    const titleSpan = document.createElement("span");
    titleSpan.className = "clip-title-text";
    titleSpan.innerText = clip.name || clip.text?.content?.substring(0, 16) || "Clip";
    clipEl.appendChild(titleSpan);

    const handleL = document.createElement("div");
    handleL.className = "clip-trim-handle clip-trim-left";
    const handleR = document.createElement("div");
    handleR.className = "clip-trim-handle clip-trim-right";
    clipEl.appendChild(handleL);
    clipEl.appendChild(handleR);

    if (clip.keyframes) {
      Object.keys(clip.keyframes).forEach(prop => {
        (clip.keyframes[prop] || []).forEach(kf => {
          const kfMark = document.createElement("div");
          kfMark.className = "kf-marker-diamond";
          kfMark.style.left = (kf.time * pixelsPerSecond) + "px";
          kfMark.title = `Keyframe ${prop}: ${kf.value} (${kf.time.toFixed(2)}s)`;
          kfMark.addEventListener('click', (e) => {
            e.stopPropagation();
            seekTo(clip.start + kf.time);
          });
          clipEl.appendChild(kfMark);
        });
      });
    }

    bindClipDragEvents(clipEl, clip);
    targetRow.appendChild(clipEl);
  });

  updatePlayheadPosition();
}

function drawAudioWaveform(canvas, assetId) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  const buffer = audioSampleBuffers.get(assetId);
  if (!buffer) {
    for (let x = 0; x < canvas.width; x += 3) {
      const h = (Math.sin(x * 0.15) + Math.cos(x * 0.08) + 2) * 6;
      ctx.fillRect(x, (canvas.height - h) / 2, 2, h);
    }
    return;
  }
  const data = buffer.getChannelData(0);
  const step = Math.floor(data.length / canvas.width);
  for (let x = 0; x < canvas.width; x++) {
    let max = 0;
    for (let i = 0; i < step; i += 10) {
      const val = Math.abs(data[x * step + i] || 0);
      if (val > max) max = val;
    }
    const h = Math.max(2, max * canvas.height);
    ctx.fillRect(x, (canvas.height - h) / 2, 1, h);
  }
}

function bindClipDragEvents(clipEl, clip) {
  clipEl.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("clip-trim-handle")) {
      initiateTrim(e, clip, e.target.classList.contains("clip-trim-left"));
      return;
    }

    activeClipId = clip.id;
    renderTimeline();
    updateInspector();

    const startX = e.clientX;
    const initialStart = clip.start;
    let hasMoved = false;

    function onMouseMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      if (Math.abs(dx) > 3) hasMoved = true;
      let newStart = Math.max(0, initialStart + (dx / pixelsPerSecond));

      if (isSnapping) {
        if (Math.abs(newStart - playheadTime) < snapThreshold) {
          newStart = playheadTime;
        }
        project.clips.forEach(other => {
          if (other.id !== clip.id && other.trackId === clip.trackId) {
            if (Math.abs(newStart - (other.start + other.duration)) < snapThreshold) {
              newStart = other.start + other.duration;
            }
          }
        });
      }

      clip.start = newStart;
      clipEl.style.left = (newStart * pixelsPerSecond) + "px";
      drawPreview();
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (hasMoved) {
        renderTimeline();
        saveState("Di chuyển clip");
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });
}

function initiateTrim(e, clip, isLeft) {
  e.stopPropagation();
  const startX = e.clientX;
  const initialStart = clip.start;
  const initialDur = clip.duration;
  const initialIn = clip.inPoint;

  function onMouseMove(moveEvent) {
    const dt = (moveEvent.clientX - startX) / pixelsPerSecond;
    if (isLeft) {
      const newDur = Math.max(0.2, initialDur - dt);
      const newStart = initialStart + dt;
      clip.start = newStart;
      clip.duration = newDur;
      clip.inPoint = initialIn + dt;
    } else {
      clip.duration = Math.max(0.2, initialDur + dt);
    }
    renderTimeline();
    drawPreview();
  }

  function onMouseUp() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    saveState("Cắt mép (Trim) clip");
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function splitActiveClipAtPlayhead() {
  const clip = project.clips.find(c => c.id === activeClipId);
  if (!clip) return;
  if (playheadTime <= clip.start || playheadTime >= (clip.start + clip.duration)) return;

  const splitPoint = playheadTime - clip.start;
  const leftDuration = splitPoint;
  const rightDuration = clip.duration - splitPoint;

  const rightClip = JSON.parse(JSON.stringify(clip));
  rightClip.id = "clip_" + Date.now();
  rightClip.start = playheadTime;
  rightClip.duration = rightDuration;
  rightClip.inPoint = clip.inPoint + splitPoint * (clip.speed || 1.0);

  clip.duration = leftDuration;

  project.clips.push(rightClip);
  activeClipId = rightClip.id;
  renderTimeline();
  updateInspector();
  drawPreview();
  saveState("Cắt clip tại con trỏ");
}

function deleteActiveClip() {
  if (!activeClipId) return;
  project.clips = project.clips.filter(c => c.id !== activeClipId);
  activeClipId = null;
  renderTimeline();
  updateInspector();
  drawPreview();
  saveState("Xóa clip");
}

function duplicateActiveClip() {
  const clip = project.clips.find(c => c.id === activeClipId);
  if (!clip) return;

  const dup = JSON.parse(JSON.stringify(clip));
  dup.id = "clip_" + Date.now();
  dup.start = clip.start + clip.duration;
  project.clips.push(dup);
  activeClipId = dup.id;
  renderTimeline();
  updateInspector();
  drawPreview();
  saveState("Nhân đôi clip");
}
