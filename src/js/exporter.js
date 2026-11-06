/* ==========================================================================
   CLIPFORGE - MP4 EXPORT ENGINE (WEBCODECS & MEDIARECORDER)
   ========================================================================== */
const modalExport = document.getElementById("modalExport");
const exportCanvas = document.getElementById("exportCanvas");
let isExportCancelled = false;

function openExportModal() {
  pause();
  document.getElementById("exportProgressSection").classList.add("hidden");
  document.getElementById("btnStartExport").disabled = false;
  document.getElementById("btnCancelExport").innerText = I18N[currentLang].cancel;
  modalExport.classList.add("open");
}

function closeExportModal() {
  isExportCancelled = true;
  modalExport.classList.remove("open");
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function executeExport() {
  isExportCancelled = false;
  const resVal = document.getElementById("exportResolution").value.split("x");
  const exportWidth = parseInt(resVal[0]);
  const exportHeight = parseInt(resVal[1]);
  const fps = parseInt(document.getElementById("exportFps").value);

  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;

  document.getElementById("exportProgressSection").classList.remove("hidden");
  document.getElementById("btnStartExport").disabled = true;

  const totalDuration = project.duration;
  const totalFrames = Math.floor(totalDuration * fps);

  const progressBar = document.getElementById("exportProgressBarFill");
  const statusText = document.getElementById("exportStatusText");
  const percentageText = document.getElementById("exportPercentage");
  const frameCounter = document.getElementById("exportFrameCounter");

  statusText.innerText = I18N[currentLang].renderingFrames;

  if (window.VideoEncoder && window.Mp4Muxer) {
    try {
      const muxer = new window.Mp4Muxer.Muxer({
        target: new window.Mp4Muxer.ArrayBufferTarget(),
        video: {
          codec: "avc",
          width: exportWidth,
          height: exportHeight
        },
        fastStart: "in-memory"
      });

      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (err) => console.error("WebCodecs VideoEncoder Error:", err)
      });

      await encoder.configure({
        codec: "avc1.640028",
        width: exportWidth,
        height: exportHeight,
        bitrate: 8_000_000,
        framerate: fps
      });

      for (let f = 0; f < totalFrames; f++) {
        if (isExportCancelled) {
          encoder.close();
          return;
        }
        const time = f / fps;
        renderFrame(project, time, exportCanvas, { isExport: true });

        const frame = new VideoFrame(exportCanvas, {
          timestamp: Math.round(time * 1_000_000)
        });
        encoder.encode(frame, { keyFrame: f % (fps * 2) === 0 });
        frame.close();

        const pct = Math.round(((f + 1) / totalFrames) * 100);
        progressBar.style.width = pct + "%";
        percentageText.innerText = pct + "%";
        frameCounter.innerText = `Khung hình: ${f + 1} / ${totalFrames}`;

        if (f % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }

      statusText.innerText = "Đang đóng gói file MP4...";
      await encoder.flush();
      muxer.finalize();

      const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
      downloadBlob(blob, `${project.name || 'ClipForge'}_TikTok_9x16.mp4`);
      statusText.innerText = I18N[currentLang].encodingComplete;
      setTimeout(() => closeExportModal(), 1200);
      return;
    } catch (webcodecsErr) {
      console.warn("WebCodecs export failed, falling back to MediaRecorder:", webcodecsErr);
    }
  }

  try {
    statusText.innerText = "Đang xuất bằng MediaRecorder...";
    const stream = exportCanvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      downloadBlob(blob, `${project.name || 'ClipForge'}_TikTok_9x16.webm`);
      statusText.innerText = I18N[currentLang].encodingComplete;
      setTimeout(() => closeExportModal(), 1200);
    };

    recorder.start();
    for (let f = 0; f < totalFrames; f++) {
      if (isExportCancelled) { recorder.stop(); return; }
      const time = f / fps;
      renderFrame(project, time, exportCanvas, { isExport: true });
      const pct = Math.round(((f + 1) / totalFrames) * 100);
      progressBar.style.width = pct + "%";
      percentageText.innerText = pct + "%";
      frameCounter.innerText = `Khung hình: ${f + 1} / ${totalFrames}`;
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
    recorder.stop();
  } catch (recErr) {
    alert("Lỗi xuất video: Trình duyệt không hỗ trợ WebCodecs và MediaRecorder.");
    closeExportModal();
  }
}
