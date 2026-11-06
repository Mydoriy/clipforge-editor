/* ==========================================================================
   CLIPFORGE - SUPABASE CLOUD DATABASE & AUTHENTICATION
   Quản lý xác thực người dùng (Auth), tuyến bảo vệ (Protected Routes) & RLS
   ========================================================================== */

const SB_STORAGE_KEYS = {
  url: "clipforge_supabase_url",
  key: "clipforge_supabase_key",
  autoSync: "clipforge_supabase_autosync",
  protectApp: "clipforge_protect_app"
};

let supabaseClient = null;
let isSupabaseConnected = false;
let isAutoSyncEnabled = false;
let isAppProtectionEnabled = false;
let currentUser = null;
let cloudSyncTimer = null;

// Khởi tạo Supabase từ LocalStorage khi khởi động
function initSupabase() {
  const savedUrl = localStorage.getItem(SB_STORAGE_KEYS.url);
  const savedKey = localStorage.getItem(SB_STORAGE_KEYS.key);
  const savedAutoSync = localStorage.getItem(SB_STORAGE_KEYS.autoSync);
  const savedProtectApp = localStorage.getItem(SB_STORAGE_KEYS.protectApp);

  isAutoSyncEnabled = (savedAutoSync === "true");
  isAppProtectionEnabled = (savedProtectApp === "true");

  const inputUrl = document.getElementById("sbProjectUrl");
  const inputKey = document.getElementById("sbAnonKey");
  const chkAutoSync = document.getElementById("sbAutoSyncCheck");
  const chkProtectApp = document.getElementById("sbProtectAppCheck");

  if (inputUrl && savedUrl) inputUrl.value = savedUrl;
  if (inputKey && savedKey) inputKey.value = savedKey;
  if (chkAutoSync) chkAutoSync.checked = isAutoSyncEnabled;
  if (chkProtectApp) chkProtectApp.checked = isAppProtectionEnabled;

  if (savedUrl && savedKey) {
    setupSupabaseClient(savedUrl, savedKey, false);
  } else {
    updateSupabaseUIStatus(false, "Chưa kết nối");
    checkAppProtectionGate();
  }

  bindSupabaseEvents();
  bindAuthEvents();
}

// Thiết lập Supabase Client và Auth Listener
async function setupSupabaseClient(url, key, isManualTest = false) {
  const statusEl = document.getElementById("sbConnectionStatus");
  if (statusEl) statusEl.innerHTML = `<span style="color:#f59e0b;">⏳ Đang kiểm tra kết nối...</span>`;

  try {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Thư viện Supabase JS chưa được tải. Hãy kiểm tra kết nối mạng!");
    }

    const client = window.supabase.createClient(url.trim(), key.trim());
    
    // Kiểm tra phiên đăng nhập hiện tại
    const { data: { session } } = await client.auth.getSession();
    currentUser = session ? session.user : null;

    // Lắng nghe thay đổi trạng thái xác thực (Login, Logout, Token Refresh)
    client.auth.onAuthStateChange((event, newSession) => {
      currentUser = newSession ? newSession.user : null;
      updateAuthUI();
      checkAppProtectionGate();
      if (currentUser && isSupabaseConnected) {
        loadCloudProjectsList();
      }
    });

    supabaseClient = client;
    isSupabaseConnected = true;

    localStorage.setItem(SB_STORAGE_KEYS.url, url.trim());
    localStorage.setItem(SB_STORAGE_KEYS.key, key.trim());

    updateSupabaseUIStatus(true, "Đã kết nối Cloud");
    updateAuthUI();
    checkAppProtectionGate();

    if (isManualTest) {
      alert("✅ Kết nối Supabase thành công! Giờ bạn có thể Đăng nhập / Đăng ký để lưu trữ dự án an toàn.");
    }

    if (currentUser) {
      loadCloudProjectsList();
    }
    return true;
  } catch (err) {
    console.warn("Supabase connection error:", err);
    supabaseClient = null;
    isSupabaseConnected = false;
    currentUser = null;
    updateSupabaseUIStatus(false, "Lỗi kết nối");
    updateAuthUI();
    checkAppProtectionGate();
    if (isManualTest) {
      alert("❌ Lỗi kết nối Supabase: " + (err.message || err));
    }
    return false;
  }
}

// Cập nhật trạng thái hiển thị trên Header + Modal
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

// Cập nhật giao diện Auth (Đăng nhập / Đăng xuất)
function updateAuthUI() {
  const btnAuthOpen = document.getElementById("btnOpenAuthModal");
  const userBadge = document.getElementById("userAuthBadge");
  const userEmailSpan = document.getElementById("userEmailSpan");
  const sbAuthNotice = document.getElementById("sbAuthNotice");
  const sbUserStatus = document.getElementById("sbUserStatus");

  if (currentUser) {
    // Đã đăng nhập
    if (btnAuthOpen) btnAuthOpen.style.display = "none";
    if (userBadge) userBadge.style.display = "inline-flex";
    if (userEmailSpan) userEmailSpan.innerText = "👤 " + (currentUser.email || "User");
    if (sbAuthNotice) sbAuthNotice.style.display = "none";
    if (sbUserStatus) {
      sbUserStatus.innerHTML = `<span style="color:var(--supabase-green);">Đang đăng nhập: <strong>${escapeHtml(currentUser.email)}</strong></span>`;
    }
  } else {
    // Chưa đăng nhập
    if (btnAuthOpen) btnAuthOpen.style.display = "inline-flex";
    if (userBadge) userBadge.style.display = "none";
    if (sbAuthNotice) sbAuthNotice.style.display = "block";
    if (sbUserStatus) {
      sbUserStatus.innerHTML = `<span style="color:var(--text-dim);">Chưa đăng nhập tài khoản.</span>`;
    }
  }
}

// Tuyến bảo vệ (Protected Gate) cho toàn bộ ứng dụng
function checkAppProtectionGate() {
  const gate = document.getElementById("gateProtected");
  if (!gate) return;

  if (isAppProtectionEnabled && !currentUser) {
    gate.classList.add("active");
  } else {
    gate.classList.remove("active");
  }
}

// Đăng ký tài khoản mới (Supabase Sign Up)
async function signUpUser(email, password) {
  if (!supabaseClient) {
    alert("Vui lòng kết nối Supabase trước khi tạo tài khoản!");
    openSupabaseModal();
    return;
  }

  const alertBox = document.getElementById("authAlert");
  if (alertBox) {
    alertBox.style.display = "block";
    alertBox.className = "auth-alert info";
    alertBox.innerText = "Đang tạo tài khoản...";
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email.trim(),
      password: password
    });

    if (error) throw error;

    if (alertBox) {
      alertBox.className = "auth-alert success";
      if (data.session) {
        alertBox.innerText = "🎉 Đăng ký thành công! Đang đăng nhập...";
        setTimeout(() => closeAuthModal(), 1200);
      } else {
        alertBox.innerText = "📧 Đăng ký thành công! Vui lòng kiểm tra hộp thư email để kích hoạt tài khoản.";
      }
    }
  } catch (err) {
    console.error("Sign up error:", err);
    if (alertBox) {
      alertBox.className = "auth-alert error";
      alertBox.innerText = "❌ Lỗi đăng ký: " + (err.message || err);
    }
  }
}

// Đăng nhập tài khoản (Supabase Sign In with Password)
async function signInUser(email, password) {
  if (!supabaseClient) {
    alert("Vui lòng kết nối Supabase trước khi đăng nhập!");
    openSupabaseModal();
    return;
  }

  const alertBox = document.getElementById("authAlert");
  if (alertBox) {
    alertBox.style.display = "block";
    alertBox.className = "auth-alert info";
    alertBox.innerText = "Đang xác thực tài khoản...";
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) throw error;

    if (alertBox) {
      alertBox.className = "auth-alert success";
      alertBox.innerText = "🎉 Đăng nhập thành công!";
    }

    setTimeout(() => {
      closeAuthModal();
      checkAppProtectionGate();
    }, 800);
  } catch (err) {
    console.error("Sign in error:", err);
    if (alertBox) {
      alertBox.className = "auth-alert error";
      alertBox.innerText = "❌ Lỗi đăng nhập: " + (err.message || err);
    }
  }
}

// Đăng xuất tài khoản (Supabase Sign Out)
async function signOutUser() {
  if (!confirm("Bạn có chắc chắn muốn đăng xuất tài khoản Supabase?")) return;

  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  currentUser = null;
  updateAuthUI();
  checkAppProtectionGate();
  
  const container = document.getElementById("sbProjectsList");
  if (container) {
    container.innerHTML = `<div class="empty-state-notice">Vui lòng đăng nhập để xem danh sách dự án cá nhân của bạn.</div>`;
  }
}

// Lưu dự án hiện tại lên Supabase (Gắn với user_id của tài khoản đăng nhập)
async function saveProjectToSupabase(silent = false) {
  if (!isSupabaseConnected || !supabaseClient) {
    if (!silent) alert("Vui lòng kết nối Supabase trước khi lưu dự án lên Cloud!");
    openSupabaseModal();
    return false;
  }

  if (!currentUser) {
    if (!silent) {
      alert("🔒 Vui lòng đăng nhập tài khoản Supabase để lưu dự án cá nhân của bạn!");
    }
    openAuthModal();
    return false;
  }

  try {
    if (!project.id) {
      project.id = "proj_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    }

    const payload = {
      id: project.id,
      user_id: currentUser.id,
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
      alert(`🎉 Đã lưu dự án "${project.name}" lên Cloud an toàn cho tài khoản ${currentUser.email}!`);
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

// Lấy danh sách dự án từ Supabase (Được lọc tự động bởi RLS của Supabase theo user_id)
async function loadCloudProjectsList() {
  const container = document.getElementById("sbProjectsList");
  if (!container) return;

  if (!isSupabaseConnected || !supabaseClient) {
    container.innerHTML = `<div class="empty-state-notice">Chưa kết nối Supabase. Hãy nhập URL và Key ở trên để tải danh sách.</div>`;
    return;
  }

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state-notice">
        🔒 Bạn cần <a href="javascript:void(0)" onclick="openAuthModal()" style="color:var(--supabase-green); text-decoration:underline;">đăng nhập tài khoản</a> để quản lý các dự án cá nhân được bảo vệ.
      </div>
    `;
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
          Chưa có dự án nào trên Supabase cho tài khoản <strong>${escapeHtml(currentUser.email)}</strong>.<br/>
          Nhấp vào <strong>"Lưu dự án hiện tại lên Supabase"</strong> để lưu dự án đầu tiên!
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

    const projNameInput = document.getElementById("projectNameInput");
    if (projNameInput) projNameInput.value = project.name || "Dự án TikTok";

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
  if (supabaseClient) {
    supabaseClient.auth.signOut();
  }
  supabaseClient = null;
  isSupabaseConnected = false;
  currentUser = null;

  const inputUrl = document.getElementById("sbProjectUrl");
  const inputKey = document.getElementById("sbAnonKey");
  if (inputUrl) inputUrl.value = "";
  if (inputKey) inputKey.value = "";

  updateSupabaseUIStatus(false, "Đã ngắt kết nối");
  updateAuthUI();
  checkAppProtectionGate();
  loadCloudProjectsList();
}

// Kích hoạt đồng bộ đám mây (Cloud Auto-sync)
function triggerCloudAutoSync() {
  if (!isSupabaseConnected || !isAutoSyncEnabled || !currentUser) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    saveProjectToSupabase(true);
  }, 3000);
}

// Mở & Đóng Modal Supabase
function openSupabaseModal() {
  const modal = document.getElementById("modalSupabase");
  if (modal) modal.classList.add("open");
  if (isSupabaseConnected && currentUser) {
    loadCloudProjectsList();
  }
}

function closeSupabaseModal() {
  const modal = document.getElementById("modalSupabase");
  if (modal) modal.classList.remove("open");
}

// Mở & Đóng Modal Auth
function openAuthModal(mode = "signin") {
  const modal = document.getElementById("modalAuth");
  if (!modal) return;
  modal.classList.add("open");

  const alertBox = document.getElementById("authAlert");
  if (alertBox) alertBox.style.display = "none";

  setAuthTab(mode);
}

function closeAuthModal() {
  const modal = document.getElementById("modalAuth");
  if (modal) modal.classList.remove("open");
}

function setAuthTab(tab) {
  const tabSignIn = document.getElementById("tabAuthSignIn");
  const tabSignUp = document.getElementById("tabAuthSignUp");
  const btnSubmit = document.getElementById("btnAuthSubmit");

  if (tab === "signup") {
    if (tabSignUp) tabSignUp.classList.add("active");
    if (tabSignIn) tabSignIn.classList.remove("active");
    if (btnSubmit) {
      btnSubmit.innerText = "Tạo Tài Khoản Mới";
      btnSubmit.dataset.action = "signup";
    }
  } else {
    if (tabSignIn) tabSignIn.classList.add("active");
    if (tabSignUp) tabSignUp.classList.remove("active");
    if (btnSubmit) {
      btnSubmit.innerText = "Đăng Nhập";
      btnSubmit.dataset.action = "signin";
    }
  }
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
  const chkProtectApp = document.getElementById("sbProtectAppCheck");

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

  if (chkProtectApp) {
    chkProtectApp.addEventListener("change", (e) => {
      isAppProtectionEnabled = e.target.checked;
      localStorage.setItem(SB_STORAGE_KEYS.protectApp, isAppProtectionEnabled ? "true" : "false");
      checkAppProtectionGate();
    });
  }

  if (btnCopySql) {
    btnCopySql.addEventListener("click", () => {
      const sqlText = `-- CLIPFORGE SUPABASE AUTH & RLS SCHEMA
CREATE TABLE IF NOT EXISTS public.clipforge_projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    duration NUMERIC NOT NULL DEFAULT 15,
    fps INTEGER NOT NULL DEFAULT 30,
    width INTEGER NOT NULL DEFAULT 1080,
    height INTEGER NOT NULL DEFAULT 1920,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clipforge_projects_user_updated ON public.clipforge_projects (user_id, updated_at DESC);
ALTER TABLE public.clipforge_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own projects" ON public.clipforge_projects FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert their own projects" ON public.clipforge_projects FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own projects" ON public.clipforge_projects FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own projects" ON public.clipforge_projects FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);`;

      navigator.clipboard.writeText(sqlText).then(() => {
        btnCopySql.innerText = "✓ Đã sao chép SQL!";
        setTimeout(() => { btnCopySql.innerText = "📋 Sao chép mã SQL"; }, 2000);
      }).catch(() => {
        alert("Không thể sao chép tự động. Bạn có thể mở file supabase_schema.sql trong thư mục dự án!");
      });
    });
  }
}

// Gắn các sự kiện điều khiển Auth Modal & Form
function bindAuthEvents() {
  const btnOpenAuth = document.getElementById("btnOpenAuthModal");
  const btnCloseAuth = document.getElementById("btnCloseAuthModal");
  const btnSignOut = document.getElementById("btnSignOut");
  const tabSignIn = document.getElementById("tabAuthSignIn");
  const tabSignUp = document.getElementById("tabAuthSignUp");
  const btnSubmit = document.getElementById("btnAuthSubmit");
  const btnGateLogin = document.getElementById("btnGateLogin");
  const btnGateBypass = document.getElementById("btnGateBypass");

  if (btnOpenAuth) btnOpenAuth.addEventListener("click", () => openAuthModal("signin"));
  if (btnCloseAuth) btnCloseAuth.addEventListener("click", closeAuthModal);
  if (btnSignOut) btnSignOut.addEventListener("click", signOutUser);

  if (tabSignIn) tabSignIn.addEventListener("click", () => setAuthTab("signin"));
  if (tabSignUp) tabSignUp.addEventListener("click", () => setAuthTab("signup"));

  if (btnSubmit) {
    btnSubmit.addEventListener("click", () => {
      const email = document.getElementById("authEmail").value;
      const pass = document.getElementById("authPassword").value;
      if (!email || !pass) {
        alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
        return;
      }
      if (pass.length < 6) {
        alert("Mật khẩu phải có ít nhất 6 ký tự!");
        return;
      }

      if (btnSubmit.dataset.action === "signup") {
        signUpUser(email, pass);
      } else {
        signInUser(email, pass);
      }
    });
  }

  if (btnGateLogin) {
    btnGateLogin.addEventListener("click", () => openAuthModal("signin"));
  }

  if (btnGateBypass) {
    btnGateBypass.addEventListener("click", () => {
      const gate = document.getElementById("gateProtected");
      if (gate) gate.classList.remove("active");
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
