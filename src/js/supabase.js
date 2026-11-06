/* ==========================================================================
   CLIPFORGE - SUPABASE CLOUD DATABASE INTEGRATION
   Quản lý dự án, lưu trữ mẫu và đồng bộ đám mây qua Supabase Postgres
   ========================================================================== */

const SB_STORAGE_KEYS = {
  url: "clipforge_supabase_url",
  key: "clipforge_supabase_key",
  autoSync: "clipforge_supabase_autosync"
};

let supabaseClient = null;
let isSupabaseConnected = false;
let isAutoSyncEnabled = false;
let cloudSyncTimer = null;

// Khởi tạo Supabase từ LocalStorage khi khởi động
function initSupabase() {
  const savedUrl = localStorage.getItem(SB_STORAGE_KEYS.url);
  const savedKey = localStorage.getItem(SB_STORAGE_KEYS.key);
  const savedAutoSync = localStorage.getItem(SB_STORAGE_KEYS.autoSync);

  isAutoSyncEnabled = (savedAutoSync === "true");

  const inputUrl = document.getElementById("sbProjectUrl");
  const inputKey = document.getElementById("sbAnonKey");
  const chkAutoSync = document.getElementById("sbAutoSyncCheck");

  if (inputUrl && savedUrl) inputUrl.value = savedUrl;
  if (inputKey && savedKey) inputKey.value = savedKey;
  if (chkAutoSync) chkAutoSync.checked = isAutoSyncEnabled;

  if (savedUrl && savedKey) {
    setupSupabaseClient(savedUrl, savedKey, false);
  } else {
    updateSupabaseUIStatus(false, "Chưa kết nối");
  }

  bindSupabaseEvents();
}

// Thiết lập Supabase Client
async function setupSupabaseClient(url, key, isManualTest = false) {
  const statusEl = document.getElementById("sbConnectionStatus");
  if (statusEl) statusEl.innerHTML = `<span style="color:#f59e0b;">⏳ Đang kiểm tra kết nối...</span>`;

  try {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Thư viện Supabase JS chưa được tải. Hãy kiểm tra kết nối mạng!");
    }

    const client = window.supabase.createClient(url.trim(), key.trim());
    
    // Kiểm tra kết nối thực tế bằng truy vấn SELECT đơn giản
    const { data, error } = await client.from("clipforge_projects").select("id").limit(1);

    if (error) {
      if (error.code === "PGRST204" || error.code === "42P01" || error.message.includes("relation") || error.message.includes("does not exist")) {
        throw new Error("Kết nối được tới Supabase nhưng chưa tạo bảng 'clipforge_projects'. Hãy chạy mã SQL ở tab hướng dẫn!");
      }
      throw error;
    }

    // Kết nối thành công
    supabaseClient = client;
    isSupabaseConnected = true;

    localStorage.setItem(SB_STORAGE_KEYS.url, url.trim());
    localStorage.setItem(SB_STORAGE_KEYS.key, key.trim());

    updateSupabaseUIStatus(true, "Đã kết nối Cloud");
    if (isManualTest) {
      alert("✅ Kết nối Supabase thành công! Giờ bạn có thể lưu trữ và quản lý dự án trên Cloud.");
    }

    loadCloudProjectsList();
    return true;
  } catch (err) {
    console.warn("Supabase connection error:", err);
    supabaseClient = null;
    isSupabaseConnected = false;
    updateSupabaseUIStatus(false, "Lỗi kết nối");
    if (isManualTest) {
      alert("❌ Lỗi kết nối Supabase: " + (err.message || err));
    }
    return false;
  }
}

// Cập nhật trạng thái hiển thị trên giao diện (Header + Modal)
function updateSupabaseUIStatus(connected, message) {
  const headerBtn = document.getElementById("btnSupabaseModal");
  const headerLabel = document.getElementById("lblSupabaseStatus");
  const statusEl = document.getElementById("sbConnectionStatus");
  const connectedControls = document.getElementById("sbConnectedControls");
  const disconnectBtn = document.getElementById("btnSbDisconnect");

  if (connected) {
    if (headerLabel) headerLabel.innerText = "Supabase (Online)";
    if (headerBtn) headerBtn.style.borderColor = "var(--supabase-green)";
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:var(--supabase-green); font-weight:600;">🟢 Đã kết nối Supabase Postgres</span>`;
    }
    if (connectedControls) connectedControls.style.display = "block";
    if (disconnectBtn) disconnectBtn.style.display = "inline-flex";
  } else {
    if (headerLabel) headerLabel.innerText = "Supabase";
    if (headerBtn) headerBtn.style.borderColor = "var(--border-subtle)";
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:var(--text-dim);">⚪ ${message || "Chưa kết nối"}</span>`;
    }
    if (connectedControls) connectedControls.style.display = "none";
    if (disconnectBtn) disconnectBtn.style.display = "none";
  }
}

// Lưu dự án hiện tại lên Supabase
async function saveProjectToSupabase(silent = false) {
  if (!isSupabaseConnected || !supabaseClient) {
    if (!silent) alert("Vui lòng kết nối Supabase trước khi lưu dự án lên Cloud!");
    openSupabaseModal();
    return false;
  }

  try {
    if (!project.id) {
      project.id = "proj_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    }

    const payload = {
      id: project.id,
      name: project.name || "Dự án TikTok #1",
      duration: project.duration || 15.0,
      fps: project.fps || 30,
      width: project.width || 1080,
      height: project.height || 1920,
      data: JSON.parse(JSON.stringify(project)),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from("clipforge_projects")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;

    if (!silent) {
      alert(`🎉 Đã lưu dự án "${project.name}" lên cơ sở dữ liệu Supabase thành công!`);
    }
    loadCloudProjectsList();
    return true;
  } catch (err) {
    console.error("Lỗi khi lưu lên Supabase:", err);
    if (!silent) {
      alert("❌ Lưu lên Supabase thất bại: " + (err.message || err));
    }
    return false;
  }
}

// Lấy danh sách dự án từ Supabase
async function loadCloudProjectsList() {
  const container = document.getElementById("sbProjectsList");
  if (!container) return;

  if (!isSupabaseConnected || !supabaseClient) {
    container.innerHTML = `<div class="empty-state-notice">Chưa kết nối Supabase. Hãy nhập URL và Key ở trên để tải danh sách.</div>`;
    return;
  }

  container.innerHTML = `<div style="padding:15px; text-align:center; color:var(--text-muted); font-size:12px;">Đang tải danh sách từ Cloud...</div>`;

  try {
    const { data, error } = await supabaseClient
      .from("clipforge_projects")
      .select("id, name, duration, fps, width, height, updated_at")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state-notice">
          Chưa có dự án nào trên Supabase. Nhấp vào <strong>"Lưu dự án hiện tại lên Supabase"</strong> để lưu dự án đầu tiên!
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "supabase-project-card";
      
      const dateStr = item.updated_at ? new Date(item.updated_at).toLocaleString("vi-VN") : "Gần đây";
      const isCurrent = (project.id === item.id);

      card.innerHTML = `
        <div class="sb-card-info">
          <div class="sb-card-title">
            <span>${escapeHtml(item.name || "Dự án không tên")}</span>
            ${isCurrent ? '<span class="sb-badge-current">Đang mở</span>' : ''}
          </div>
          <div class="sb-card-meta">
            <span>⏱️ ${Number(item.duration).toFixed(1)}s</span>
            <span>🎬 ${item.fps || 30}fps</span>
            <span>📐 ${item.width || 1080}×${item.height || 1920}</span>
            <span>🕒 ${dateStr}</span>
          </div>
        </div>
        <div class="sb-card-actions">
          <button class="btn btn-sm btn-primary btn-sb-load" data-id="${item.id}">Mở</button>
          <button class="btn btn-sm btn-icon btn-sb-delete" data-id="${item.id}" data-name="${escapeHtml(item.name)}" title="Xóa khỏi Supabase" style="color:var(--accent-coral);">✕</button>
        </div>
      `;

      card.querySelector(".btn-sb-load").addEventListener("click", () => {
        loadProjectFromSupabase(item.id);
      });

      card.querySelector(".btn-sb-delete").addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name;
        deleteProjectFromSupabase(id, name);
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Lỗi khi tải danh sách dự án:", err);
    container.innerHTML = `<div class="empty-state-notice" style="color:var(--accent-coral);">Lỗi tải dự án: ${err.message || err}</div>`;
  }
}

// Tải một dự án cụ thể từ Supabase về màn hình biên tập ClipForge
async function loadProjectFromSupabase(id) {
  if (!confirm("Bạn có muốn mở dự án này từ Supabase? Mọi thay đổi chưa lưu trên máy cục bộ sẽ được thay thế.")) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("clipforge_projects")
      .select("data")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data || !data.data) throw new Error("Dữ liệu dự án trống hoặc bị hỏng.");

    project = data.data;

    // Cập nhật tên vào input header
    const projNameInput = document.getElementById("projectNameInput");
    if (projNameInput) projNameInput.value = project.name || "Dự án TikTok";

    // Cập nhật toàn bộ hệ thống
    saveState("Mở dự án từ Supabase");
    renderTimeline();
    updateInspector();
    drawPreview();
    scheduleAutoSave();

    closeSupabaseModal();
    alert(`Đã mở dự án "${project.name}" từ Supabase!`);
  } catch (err) {
    console.error("Lỗi tải chi tiết dự án:", err);
    alert("❌ Không thể tải dự án từ Supabase: " + (err.message || err));
  }
}

// Xóa một dự án khỏi Supabase
async function deleteProjectFromSupabase(id, name) {
  if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn dự án "${name}" trên Supabase không?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("clipforge_projects")
      .delete()
      .eq("id", id);

    if (error) throw error;

    loadCloudProjectsList();
  } catch (err) {
    console.error("Lỗi xóa dự án:", err);
    alert("❌ Không thể xóa dự án: " + (err.message || err));
  }
}

// Ngắt kết nối Supabase
function disconnectSupabase() {
  if (!confirm("Bạn có muốn ngắt kết nối Supabase khỏi trình duyệt này?")) return;

  localStorage.removeItem(SB_STORAGE_KEYS.url);
  localStorage.removeItem(SB_STORAGE_KEYS.key);
  supabaseClient = null;
  isSupabaseConnected = false;

  const inputUrl = document.getElementById("sbProjectUrl");
  const inputKey = document.getElementById("sbAnonKey");
  if (inputUrl) inputUrl.value = "";
  if (inputKey) inputKey.value = "";

  updateSupabaseUIStatus(false, "Đã ngắt kết nối");
  loadCloudProjectsList();
}

// Kích hoạt đồng bộ đám mây (Cloud Auto-sync)
function triggerCloudAutoSync() {
  if (!isSupabaseConnected || !isAutoSyncEnabled) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    saveProjectToSupabase(true);
  }, 3000);
}

// Mở & Đóng Modal Supabase
function openSupabaseModal() {
  const modal = document.getElementById("modalSupabase");
  if (modal) modal.classList.add("open");
  if (isSupabaseConnected) {
    loadCloudProjectsList();
  }
}

function closeSupabaseModal() {
  const modal = document.getElementById("modalSupabase");
  if (modal) modal.classList.remove("open");
}

// Gắn các sự kiện điều khiển Supabase UI
function bindSupabaseEvents() {
  const btnOpen = document.getElementById("btnSupabaseModal");
  const btnClose = document.getElementById("btnCloseSupabaseModal");
  const btnConnect = document.getElementById("btnSbConnect");
  const btnDisconnect = document.getElementById("btnSbDisconnect");
  const btnSaveCurrent = document.getElementById("btnSbSaveCurrent");
  const btnRefresh = document.getElementById("btnSbRefresh");
  const btnCopySql = document.getElementById("btnSbCopySql");
  const chkAutoSync = document.getElementById("sbAutoSyncCheck");

  if (btnOpen) btnOpen.addEventListener("click", openSupabaseModal);
  if (btnClose) btnClose.addEventListener("click", closeSupabaseModal);

  if (btnConnect) {
    btnConnect.addEventListener("click", () => {
      const url = document.getElementById("sbProjectUrl").value;
      const key = document.getElementById("sbAnonKey").value;
      if (!url || !key) {
        alert("Vui lòng nhập cả Supabase Project URL và Anon Key!");
        return;
      }
      setupSupabaseClient(url, key, true);
    });
  }

  if (btnDisconnect) {
    btnDisconnect.addEventListener("click", disconnectSupabase);
  }

  if (btnSaveCurrent) {
    btnSaveCurrent.addEventListener("click", () => saveProjectToSupabase(false));
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", loadCloudProjectsList);
  }

  if (chkAutoSync) {
    chkAutoSync.addEventListener("change", (e) => {
      isAutoSyncEnabled = e.target.checked;
      localStorage.setItem(SB_STORAGE_KEYS.autoSync, isAutoSyncEnabled ? "true" : "false");
    });
  }

  if (btnCopySql) {
    btnCopySql.addEventListener("click", () => {
      const sqlText = `-- CLIPFORGE SUPABASE SCHEMA
CREATE TABLE IF NOT EXISTS public.clipforge_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration NUMERIC NOT NULL DEFAULT 15,
    fps INTEGER NOT NULL DEFAULT 30,
    width INTEGER NOT NULL DEFAULT 1080,
    height INTEGER NOT NULL DEFAULT 1920,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clipforge_projects_updated_at ON public.clipforge_projects (updated_at DESC);
ALTER TABLE public.clipforge_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Projects" ON public.clipforge_projects FOR ALL USING (true) WITH CHECK (true);`;

      navigator.clipboard.writeText(sqlText).then(() => {
        btnCopySql.innerText = "✓ Đã sao chép SQL!";
        setTimeout(() => { btnCopySql.innerText = "📋 Sao chép mã SQL"; }, 2000);
      }).catch(() => {
        alert("Không thể sao chép tự động. Bạn có thể mở file supabase_schema.sql trong thư mục dự án!");
      });
    });
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

