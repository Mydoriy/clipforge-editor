/* ==========================================================================
   CLIPFORGE - STATE & DATA MODEL
   ========================================================================== */
const I18N = {
  vi: {
    exportAction: "Xuất video",
    safeZone: "Vùng an toàn TikTok",
    dropPrompt: "Kéo thả Video / Ảnh / Âm thanh vào đây",
    dropSub: "hoặc nhấp chuột để chọn tệp từ máy tính",
    assetHeader: "Tài sản dự án",
    sampleBtn: "Tải mẫu",
    addText: "+ Thêm Chữ Mặc Định",
    inspectorTitle: "THUỘC TÍNH CLIP",
    noClipSelected: "Chưa chọn clip",
    emptyInspector: "Nhấp chuột vào một clip trên timeline để chỉnh sửa thuộc tính, hiệu ứng và keyframe.",
    snapOn: "Hít: Bật",
    snapOff: "Hít: Tắt",
    cut: "Cắt",
    delete: "Xóa",
    duplicate: "Nhân đôi",
    saved: "Đã lưu vào máy",
    saving: "Đang lưu...",
    saveErr: "Chưa thể tự lưu",
    exportModalTitle: "Xuất Video TikTok MP4",
    startExport: "Bắt đầu xuất video",
    cancel: "Hủy",
    renderingFrames: "Đang xử lý khung hình...",
    encodingComplete: "Đã hoàn thành! Đang tải file về máy...",
    fitBlur: "Nền mờ (Blur Fill)",
    fitCover: "Lấp khung (Cover)",
    fitContain: "Vừa khung (Contain)"
  },
  en: {
    exportAction: "Export Video",
    safeZone: "TikTok Safe Zone",
    dropPrompt: "Drop Video / Image / Audio files here",
    dropSub: "or click to browse from your computer",
    assetHeader: "Project Assets",
    sampleBtn: "Load Sample",
    addText: "+ Add Default Text",
    inspectorTitle: "CLIP INSPECTOR",
    noClipSelected: "No clip selected",
    emptyInspector: "Click a clip on the timeline to adjust transforms, effects and keyframes.",
    snapOn: "Snap: ON",
    snapOff: "Snap: OFF",
    cut: "Split",
    delete: "Delete",
    duplicate: "Duplicate",
    saved: "Saved to disk",
    saving: "Saving...",
    saveErr: "Auto-save disabled",
    exportModalTitle: "Export TikTok MP4 Video",
    startExport: "Start Exporting",
    cancel: "Cancel",
    renderingFrames: "Rendering frames...",
    encodingComplete: "Complete! Downloading file...",
    fitBlur: "Blur Fill",
    fitCover: "Cover Fill",
    fitContain: "Fit Contain"
  }
};
let currentLang = 'vi';

const DEFAULT_PROJECT = {
  name: "Dự án TikTok #1",
  width: 1080,
  height: 1920,
  fps: 30,
  duration: 15.0,
  safeZone: { top: 160, bottom: 480, left: 120, right: 160, enabled: true },
  assets: [],
  tracks: [
    { id: "track-text", type: "text", name: "Chữ (Text)" },
    { id: "track-overlay", type: "video", name: "Lớp phủ" },
    { id: "track-main", type: "video", name: "Video chính" },
    { id: "track-audio", type: "audio", name: "Âm thanh" }
  ],
  clips: []
};

let project = JSON.parse(JSON.stringify(DEFAULT_PROJECT));
let activeClipId = null;
let playheadTime = 0.0;
let isPlaying = false;
let playbackSpeed = 1.0;
let isSnapping = true;
let snapThreshold = 0.2;
let pixelsPerSecond = 45;
let animationFrameId = null;
let lastRenderTimestamp = 0;

// Command History for Undo/Redo
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 40;

function saveState(actionName) {
  redoStack.length = 0;
  undoStack.push(JSON.stringify(project));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  updateUndoRedoUI();
  scheduleAutoSave();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(project));
  const previous = undoStack.pop();
  project = JSON.parse(previous);
  updateUndoRedoUI();
  renderTimeline();
  updateInspector();
  drawPreview();
  scheduleAutoSave();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(project));
  const next = redoStack.pop();
  project = JSON.parse(next);
  updateUndoRedoUI();
  renderTimeline();
  updateInspector();
  drawPreview();
  scheduleAutoSave();
}

function updateUndoRedoUI() {
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  if (btnUndo) btnUndo.disabled = (undoStack.length === 0);
  if (btnRedo) btnRedo.disabled = (redoStack.length === 0);
}

// IndexedDB Storage
const DB_NAME = "ClipForgeStorage";
const DB_VERSION = 1;
let dbInstance = null;
let autoSaveTimer = null;

function openDatabase() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
      };
      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = (e) => {
        console.warn("IndexedDB error:", e);
        resolve(null);
      };
    } catch (err) {
      console.warn("IndexedDB not accessible in this context:", err);
      resolve(null);
    }
  });
}

function scheduleAutoSave() {
  setStorageStatus("saving");
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    try {
      if (!dbInstance) {
        setStorageStatus("saved");
        return;
      }
      const tx = dbInstance.transaction(["projects"], "readwrite");
      const store = tx.objectStore("projects");
      const projectToSave = JSON.parse(JSON.stringify(project));
      store.put({ id: "current_project", data: projectToSave, updatedAt: Date.now() });
      setStorageStatus("saved");
      if (typeof triggerCloudAutoSync === "function") {
        triggerCloudAutoSync();
      }
    } catch (e) {
      console.warn("Autosave failed:", e);
      setStorageStatus("warn");
    }
  }, 1000);
}

function setStorageStatus(status) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (!dot || !text) return;
  if (status === "saving") {
    dot.className = "status-dot saving";
    text.innerText = I18N[currentLang].saving;
  } else if (status === "warn") {
    dot.className = "status-dot warn";
    text.innerText = I18N[currentLang].saveErr;
  } else {
    dot.className = "status-dot";
    text.innerText = I18N[currentLang].saved;
  }
}
