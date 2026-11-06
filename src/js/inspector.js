/* ==========================================================================
   CLIPFORGE - INSPECTOR PANEL & PROPERTY BINDINGS
   ========================================================================== */
const inspectorContent = document.getElementById("inspectorContent");
const inspectorClipType = document.getElementById("inspectorClipType");

function hasKeyframeAt(clip, prop, time) {
  if (!clip.keyframes || !clip.keyframes[prop]) return false;
  return clip.keyframes[prop].some(k => Math.abs(k.time - time) < 0.1);
}

function toggleKeyframe(clip, prop, time, val) {
  if (!clip.keyframes) clip.keyframes = {};
  if (!clip.keyframes[prop]) clip.keyframes[prop] = [];

  const idx = clip.keyframes[prop].findIndex(k => Math.abs(k.time - time) < 0.1);
  if (idx >= 0) {
    clip.keyframes[prop].splice(idx, 1);
  } else {
    clip.keyframes[prop].push({ time, value: val, easing: "easeInOut" });
    clip.keyframes[prop].sort((a, b) => a.time - b.time);
  }
  renderTimeline();
  updateInspector();
  drawPreview();
  saveState(`Keyframe ${prop}`);
}

function updateInspector() {
  const clip = project.clips.find(c => c.id === activeClipId);
  if (!clip) {
    if (inspectorClipType) inspectorClipType.innerText = "Details";
    if (inspectorContent) {
      inspectorContent.innerHTML = `
        <div class="capcut-details-view">
          <div class="details-header-title">Details</div>
          <div class="details-row"><span class="details-label">Name:</span> <span class="details-val">${escapeHtml(project.name || "0917")}</span></div>
          <div class="details-row"><span class="details-label">Path:</span> <span class="details-val" style="word-break:break-all; font-size:10px;">Browser Storage / IndexedDB</span></div>
          <div class="details-row"><span class="details-label">Floating-point:</span> <span class="details-val">Turned off</span></div>
          <div class="details-row"><span class="details-label">Imported media:</span> <span class="details-val">Stay in original location</span></div>
          <div class="details-row"><span class="details-label">Arrange layers:</span> <span class="details-val">Turned on</span></div>
          <div class="details-row"><span class="details-label">Proxy:</span> <span class="details-val">Turned off</span></div>
          <div class="details-row"><span class="details-label">Timeline name:</span> <span class="details-val">Timeline 01</span></div>
          <div class="details-row"><span class="details-label">Aspect ratio:</span> <span class="details-val" style="color:var(--capcut-cyan); font-weight:600;">9:16 (TikTok Vertical)</span></div>
          <div class="details-row"><span class="details-label">Resolution:</span> <span class="details-val">${project.width || 1080}×${project.height || 1920}</span></div>
          <div class="details-row"><span class="details-label">Frame rate:</span> <span class="details-val">${project.fps || 30} fps</span></div>
          <div class="details-row"><span class="details-label">Duration:</span> <span class="details-val">${(project.duration || 15).toFixed(1)}s</span></div>
          <div class="details-row"><span class="details-label">Cloud Backup:</span> <span class="details-val" style="color:var(--supabase-green);">${typeof isSupabaseConnected !== 'undefined' && isSupabaseConnected ? '🟢 Supabase Synced' : '⚪ Local Offline'}</span></div>
          <div style="margin-top:20px; display:flex; justify-content:flex-end;">
            <button class="btn btn-sm" id="btnModifyProjectDetails" style="background:#2a2e38; color:var(--text-main); font-size:11px; padding:6px 14px; border-radius:4px; font-weight:600;">Modify</button>
          </div>
        </div>
      `;
      const btnMod = document.getElementById("btnModifyProjectDetails");
      if (btnMod) {
        btnMod.addEventListener("click", () => {
          const newName = prompt("Nhập tên dự án mới:", project.name || "0917");
          if (newName) {
            project.name = newName;
            const inp = document.getElementById("projectNameInput");
            if (inp) inp.value = newName;
            saveState("Đổi tên dự án");
            updateInspector();
          }
        });
      }
    }
    return;
  }

  if (inspectorClipType) inspectorClipType.innerText = `${clip.type.toUpperCase()} (${clip.duration.toFixed(1)}s)`;
  const clipRelTime = Math.max(0, playheadTime - clip.start);

  let html = `
    <div class="prop-group">
      <div class="prop-group-title">
        <span>Biến đổi (Transform)</span>
        <button class="btn btn-sm" id="btnResetTransform" style="font-size:10px; padding:1px 6px;">Đặt lại</button>
      </div>

      <div class="prop-row">
        <span class="prop-label">Chế độ khung hình:</span>
        <select class="prop-select" id="inpClipFit" style="width:140px;">
          <option value="blur_fill" ${clip.transform.fit === 'blur_fill' ? 'selected' : ''}>${I18N[currentLang].fitBlur}</option>
          <option value="crop_pan" ${clip.transform.fit === 'crop_pan' ? 'selected' : ''}>Pan & Scan (Crop theo Keyframe)</option>
          <option value="cover" ${clip.transform.fit === 'cover' ? 'selected' : ''}>${I18N[currentLang].fitCover}</option>
          <option value="contain" ${clip.transform.fit === 'contain' ? 'selected' : ''}>${I18N[currentLang].fitContain}</option>
        </select>
      </div>

      <div class="prop-row">
        <span class="prop-label">Vị trí X:</span>
        <input type="range" class="prop-slider" id="inpPosX" min="0" max="1080" value="${clip.transform.x}" />
        <span class="prop-val" id="valPosX">${Math.round(clip.transform.x)}</span>
      </div>

      <div class="prop-row">
        <span class="prop-label">Vị trí Y:</span>
        <input type="range" class="prop-slider" id="inpPosY" min="0" max="1920" value="${clip.transform.y}" />
        <span class="prop-val" id="valPosY">${Math.round(clip.transform.y)}</span>
      </div>

      <div class="prop-row">
        <span class="prop-label">Phóng to (Scale):</span>
        <input type="range" class="prop-slider" id="inpScale" min="0.2" max="3.0" step="0.05" value="${clip.transform.scale}" />
        <span class="prop-val" id="valScale">${clip.transform.scale.toFixed(2)}x</span>
        <button class="keyframe-toggle-btn ${hasKeyframeAt(clip, 'scale', clipRelTime) ? 'has-kf' : ''}" id="btnKfScale" title="Chuột trái: Thêm/Xóa Keyframe. Chuột phải: Mở Graph Editor">◆</button>
      </div>

      <div class="prop-row">
        <span class="prop-label">Xoay (Góc):</span>
        <input type="range" class="prop-slider" id="inpRot" min="-180" max="180" value="${clip.transform.rotation}" />
        <span class="prop-val" id="valRot">${clip.transform.rotation}°</span>
        <button class="keyframe-toggle-btn ${hasKeyframeAt(clip, 'rotation', clipRelTime) ? 'has-kf' : ''}" id="btnKfRot" title="Thêm/Xóa Keyframe Xoay">◆</button>
      </div>

      <div class="prop-row">
        <span class="prop-label">Độ mờ (Opacity):</span>
        <input type="range" class="prop-slider" id="inpOpacity" min="0" max="1" step="0.05" value="${clip.transform.opacity}" />
        <span class="prop-val" id="valOpacity">${Math.round(clip.transform.opacity * 100)}%</span>
        <button class="keyframe-toggle-btn ${hasKeyframeAt(clip, 'opacity', clipRelTime) ? 'has-kf' : ''}" id="btnKfOpacity" title="Thêm/Xóa Keyframe Opacity">◆</button>
      </div>
    </div>
  `;

  if (clip.transform.fit === "crop_pan") {
    html += `
      <div class="prop-group">
        <div class="prop-group-title">
          <span>Pan & Scan (Vị trí Crop ngang)</span>
          <button class="keyframe-toggle-btn ${hasKeyframeAt(clip, 'cropX', clipRelTime) ? 'has-kf' : ''}" id="btnKfCropX" title="Thêm/Xóa Keyframe Crop Pan">◆</button>
        </div>
        <div class="prop-row">
          <span class="prop-label">Trục ngang (X):</span>
          <input type="range" class="prop-slider" id="inpCropX" min="0" max="1" step="0.02" value="${clip.transform.cropX ?? 0.5}" />
          <span class="prop-val">${Math.round((clip.transform.cropX ?? 0.5) * 100)}%</span>
        </div>
      </div>
    `;
  }

  if (clip.type === "text") {
    html += `
      <div class="prop-group">
        <div class="prop-group-title">Nội dung & Phông chữ Tiếng Việt</div>
        <textarea class="prop-input-text" id="inpTextContent" rows="2">${clip.text.content}</textarea>

        <div class="prop-row">
          <span class="prop-label">Font chữ:</span>
          <select class="prop-select" id="inpTextFont" style="width:140px;">
            <option value="Montserrat" ${clip.text.font==='Montserrat'?'selected':''}>Montserrat (Hiện đại)</option>
            <option value="Anton" ${clip.text.font==='Anton'?'selected':''}>Anton (TikTok In Đậm)</option>
            <option value="Be Vietnam Pro" ${clip.text.font==='Be Vietnam Pro'?'selected':''}>Be Vietnam Pro</option>
            <option value="Playfair Display" ${clip.text.font==='Playfair Display'?'selected':''}>Playfair Display</option>
            <option value="Oswald" ${clip.text.font==='Oswald'?'selected':''}>Oswald (Vlog)</option>
            <option value="Pacifico" ${clip.text.font==='Pacifico'?'selected':''}>Pacifico (Viết tay)</option>
            <option value="Bangers" ${clip.text.font==='Bangers'?'selected':''}>Bangers (Meme/Hài)</option>
            <option value="Roboto" ${clip.text.font==='Roboto'?'selected':''}>Roboto</option>
            <option value="Dancing Script" ${clip.text.font==='Dancing Script'?'selected':''}>Dancing Script</option>
          </select>
        </div>

        <div class="prop-row">
          <span class="prop-label">Cỡ chữ (Size):</span>
          <input type="range" class="prop-slider" id="inpTextSize" min="24" max="140" value="${clip.text.size}" />
          <span class="prop-val" id="valTextSize">${clip.text.size}px</span>
        </div>

        <div class="prop-row">
          <span class="prop-label">Màu chữ:</span>
          <input type="color" id="inpTextColor" value="${clip.text.color}" style="background:none; border:none; cursor:pointer;" />
          <span class="prop-label" style="text-align:right;">Màu viền:</span>
          <input type="color" id="inpStrokeColor" value="${clip.text.stroke}" style="background:none; border:none; cursor:pointer;" />
        </div>

        <div class="prop-row">
          <span class="prop-label">Hiệu ứng xuất hiện:</span>
          <select class="prop-select" id="inpTextAnimIn" style="width:140px;">
            <option value="bounce" ${clip.text.animIn==='bounce'?'selected':''}>Nảy (Bounce)</option>
            <option value="pop" ${clip.text.animIn==='pop'?'selected':''}>Bật lên (Pop)</option>
            <option value="slide" ${clip.text.animIn==='slide'?'selected':''}>Trượt (Slide)</option>
            <option value="typewriter" ${clip.text.animIn==='typewriter'?'selected':''}>Đánh máy (Typewriter)</option>
            <option value="none" ${clip.text.animIn==='none'?'selected':''}>Không có</option>
          </select>
        </div>
      </div>
    `;

    const ta = clip.textAnimator || { enabled: false, unit: "char", animType: "fade_rise", stagger: 0.06 };
    html += `
      <div class="prop-group">
        <div class="prop-group-title">
          <span>Text Animator (After Effects)</span>
          <input type="checkbox" id="chkTextAnimEnabled" ${ta.enabled ? 'checked' : ''} style="cursor:pointer;" />
        </div>
    `;
    if (ta.enabled) {
      html += `
        <div class="prop-row">
          <span class="prop-label">Đơn vị:</span>
          <select class="prop-select" id="selTaUnit" style="width:120px;">
            <option value="char" ${ta.unit==='char'?'selected':''}>Từng Ký Tự</option>
            <option value="word" ${ta.unit==='word'?'selected':''}>Từng Từ</option>
          </select>
        </div>
        <div class="prop-row">
          <span class="prop-label">Kiểu Animator:</span>
          <select class="prop-select" id="selTaType" style="width:120px;">
            <option value="fade_rise" ${ta.animType==='fade_rise'?'selected':''}>Mờ Dần & Trồi Lên</option>
            <option value="scale_bounce" ${ta.animType==='scale_bounce'?'selected':''}>Phóng To Nảy</option>
            <option value="wave" ${ta.animType==='wave'?'selected':''}>Sóng Nhấp Nhô</option>
            <option value="spin" ${ta.animType==='spin'?'selected':''}>Xoay Xuất Hiện</option>
          </select>
        </div>
        <div class="prop-row">
          <span class="prop-label">Độ trễ (Stagger):</span>
          <input type="range" class="prop-slider" id="inpTaStagger" min="0.02" max="0.2" step="0.01" value="${ta.stagger || 0.06}" />
          <span class="prop-val">${ta.stagger || 0.06}s</span>
        </div>
      `;
    }
    html += `</div>`;
  }

  if (clip.type === "shape") {
    const shp = clip.shape || { type: "rect", fill: "#ff3b5c", stroke: "#ffffff", strokeWidth: 4, trimStart: 0, trimEnd: 100 };
    html += `
      <div class="prop-group">
        <div class="prop-group-title">Hình khối & Trim Path</div>
        <div class="prop-row">
          <span class="prop-label">Màu nền:</span>
          <input type="color" id="inpShapeFill" value="${shp.fill || '#ff3b5c'}" style="background:none; border:none; cursor:pointer;" />
          <span class="prop-label" style="text-align:right;">Màu viền:</span>
          <input type="color" id="inpShapeStroke" value="${shp.stroke || '#ffffff'}" style="background:none; border:none; cursor:pointer;" />
        </div>
        <div class="prop-row">
          <span class="prop-label">Độ dày viền:</span>
          <input type="range" class="prop-slider" id="inpShapeStrokeW" min="0" max="30" value="${shp.strokeWidth || 4}" />
          <span class="prop-val">${shp.strokeWidth || 4}px</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Trim Start:</span>
          <input type="range" class="prop-slider" id="inpShapeTrimStart" min="0" max="100" value="${shp.trimStart || 0}" />
          <span class="prop-val">${shp.trimStart || 0}%</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Trim End:</span>
          <input type="range" class="prop-slider" id="inpShapeTrimEnd" min="0" max="100" value="${shp.trimEnd ?? 100}" />
          <span class="prop-val">${shp.trimEnd ?? 100}%</span>
        </div>
      </div>
    `;
  }

  const trk = clip.tracking || { enabled: false, points: [] };
  html += `
    <div class="prop-group">
      <div class="prop-group-title">
        <span>Bám theo chuyển động (Tracking)</span>
        <input type="checkbox" id="chkTrackingEnabled" ${trk.enabled ? 'checked' : ''} style="cursor:pointer;" />
      </div>
      ${trk.enabled ? `
        <div style="font-size:11px; color:var(--text-muted);">
          Đang có ${trk.points.length} mốc tracking. Kéo hồng tâm đỏ trên màn hình Preview để đặt vị trí.
        </div>
        <button class="btn btn-sm btn-primary" id="btnAddTrackingKeyPoint" style="margin-top:4px;">
          + Đặt Mốc Tracking Tại Playhead
        </button>
      ` : ''}
    </div>
  `;

  html += `
    <div class="prop-group">
      <div class="prop-group-title">
        <span>Hiệu ứng clip (${(clip.effects||[]).length})</span>
      </div>
  `;
  if (!clip.effects || clip.effects.length === 0) {
    html += `<div style="font-size:11px; color:var(--text-dim);">Chưa có hiệu ứng. Chọn ở tab 'Hiệu ứng' bên trái để thêm.</div>`;
  } else {
    clip.effects.forEach((fx, idx) => {
      html += `
        <div style="background:var(--bg-panel); padding:8px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; color:var(--accent-coral); text-transform:uppercase; font-size:11px;">${fx.type.replace('_', ' ')}</span>
            <button class="btn btn-sm btnRemoveFx" data-fx-idx="${idx}" style="padding:1px 5px; color:#ef4444;">✕ Xóa</button>
          </div>
          <div class="prop-row">
            <span class="prop-label">Cường độ:</span>
            <input type="range" class="prop-slider inpFxIntensity" data-fx-idx="${idx}" min="0" max="100" value="${fx.intensity||50}" />
            <span class="prop-val">${fx.intensity||50}%</span>
          </div>
        </div>
      `;
    });
  }
  html += `</div>`;

  const hasSpeedRamp = clip.speedRamp && clip.speedRamp.enabled;
  html += `
    <div class="prop-group">
      <div class="prop-group-title">
        <span>Tốc độ & Speed Ramp</span>
        <button class="btn btn-sm" id="btnToggleSpeedRamp" style="font-size:10px; padding:1px 6px;">${hasSpeedRamp ? 'Tắt Ramp' : 'Bật Ramp'}</button>
      </div>
      <div class="prop-row">
        <span class="prop-label">Tốc độ cố định:</span>
        <select class="prop-select" id="inpClipSpeed" style="width:110px;" ${hasSpeedRamp ? 'disabled' : ''}>
          <option value="0.25" ${clip.speed===0.25?'selected':''}>0.25x</option>
          <option value="0.5" ${clip.speed===0.5?'selected':''}>0.5x</option>
          <option value="1.0" ${clip.speed===1.0?'selected':''}>1.0x (Chuẩn)</option>
          <option value="1.5" ${clip.speed===1.5?'selected':''}>1.5x</option>
          <option value="2.0" ${clip.speed===2.0?'selected':''}>2.0x</option>
          <option value="4.0" ${clip.speed===4.0?'selected':''}>4.0x</option>
        </select>
      </div>
  `;
  if (hasSpeedRamp) {
    html += `
      <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Preset đồ thị tốc độ:</div>
      <div style="display:flex; gap:4px; margin-top:2px;">
        <button class="btn btn-sm btn-ramp-preset" data-preset="montage" style="flex:1;">Montage</button>
        <button class="btn btn-sm btn-ramp-preset" data-preset="hero" style="flex:1;">Hero</button>
        <button class="btn btn-sm btn-ramp-preset" data-preset="bullet" style="flex:1;">Bullet Time</button>
      </div>
    `;
  }
  html += `
      <div class="prop-row" style="margin-top:6px;">
        <span class="prop-label">Âm lượng:</span>
        <input type="range" class="prop-slider" id="inpClipVolume" min="0" max="2" step="0.1" value="${clip.volume}" />
        <span class="prop-val" id="valClipVolume">${Math.round(clip.volume * 100)}%</span>
      </div>
    </div>
  `;

  const bm = clip.blendMode || "normal";
  const maskType = clip.mask?.type || "none";
  html += `
    <div class="prop-group">
      <div class="prop-group-title">Hòa trộn & Mặt nạ (Mask)</div>
      <div class="prop-row">
        <span class="prop-label">Blend Mode:</span>
        <select class="prop-select" id="inpBlendMode" style="width:130px;">
          <option value="normal" ${bm==='normal'?'selected':''}>Bình thường (Normal)</option>
          <option value="screen" ${bm==='screen'?'selected':''}>Làm sáng (Screen)</option>
          <option value="multiply" ${bm==='multiply'?'selected':''}>Nhân tối (Multiply)</option>
          <option value="overlay" ${bm==='overlay'?'selected':''}>Phủ (Overlay)</option>
          <option value="lighten" ${bm==='lighten'?'selected':''}>Lighten</option>
          <option value="darken" ${bm==='darken'?'selected':''}>Darken</option>
          <option value="color-dodge" ${bm==='color-dodge'?'selected':''}>Color Dodge</option>
          <option value="difference" ${bm==='difference'?'selected':''}>Difference</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Mặt nạ:</span>
        <select class="prop-select" id="inpMaskType" style="width:130px;">
          <option value="none" ${maskType==='none'?'selected':''}>Không có</option>
          <option value="rect" ${maskType==='rect'?'selected':''}>Hình Chữ Nhật</option>
          <option value="ellipse" ${maskType==='ellipse'?'selected':''}>Hình Elip</option>
        </select>
      </div>
    </div>
  `;

  const ck = clip.chromaKey || { enabled: false, color: "#00ff00", tolerance: 35, smoothness: 15 };
  html += `
    <div class="prop-group">
      <div class="prop-group-title">
        <span>Tách phông nền (Chroma Key)</span>
        <input type="checkbox" id="chkChromaEnabled" ${ck.enabled ? 'checked' : ''} style="cursor:pointer;" />
      </div>
  `;
  if (ck.enabled) {
    html += `
      <div class="prop-row">
        <span class="prop-label">Màu phông cần tách:</span>
        <input type="color" id="inpChromaColor" value="${ck.color || '#00ff00'}" style="background:none; border:none; cursor:pointer;" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Dung sai (Tolerance):</span>
        <input type="range" class="prop-slider" id="inpChromaTolerance" min="5" max="100" value="${ck.tolerance || 35}" />
        <span class="prop-val">${ck.tolerance || 35}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Độ mịn viền:</span>
        <input type="range" class="prop-slider" id="inpChromaSmoothness" min="0" max="50" value="${ck.smoothness || 15}" />
        <span class="prop-val">${ck.smoothness || 15}</span>
      </div>
    `;
  }
  html += `</div>`;

  const cg = clip.colorGrading || { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0 };
  html += `
    <div class="prop-group">
      <div class="prop-group-title">
        <span>Chỉnh màu & 3D LUT</span>
        <button class="btn btn-sm" id="btnResetColorGrading" style="font-size:10px; padding:1px 6px;">Đặt lại</button>
      </div>
      <div class="prop-row">
        <span class="prop-label">Phơi sáng:</span>
        <input type="range" class="prop-slider" id="inpCgExposure" min="-100" max="100" value="${cg.exposure || 0}" />
        <span class="prop-val">${cg.exposure || 0}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Độ tương phản:</span>
        <input type="range" class="prop-slider" id="inpCgContrast" min="-100" max="100" value="${cg.contrast || 0}" />
        <span class="prop-val">${cg.contrast || 0}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Độ bão hòa:</span>
        <input type="range" class="prop-slider" id="inpCgSaturation" min="-100" max="100" value="${cg.saturation || 0}" />
        <span class="prop-val">${cg.saturation || 0}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Nhiệt độ (K):</span>
        <input type="range" class="prop-slider" id="inpCgTemp" min="-100" max="100" value="${cg.temperature || 0}" />
        <span class="prop-val">${cg.temperature || 0}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Sắc thái (Tint):</span>
        <input type="range" class="prop-slider" id="inpCgTint" min="-100" max="100" value="${cg.tint || 0}" />
        <span class="prop-val">${cg.tint || 0}</span>
      </div>

      <div style="margin-top:6px; display:flex; gap:6px; align-items:center;">
        <button class="btn btn-sm" id="btnImportLutCube" style="flex:1;">Nạp LUT (.cube)</button>
        <input type="file" id="inputLutFile" accept=".cube" class="hidden" />
        <span style="font-size:11px; color:var(--text-dim);" id="lblCurrentLut">${clip.colorGrading?.lutName || 'Chưa nạp'}</span>
      </div>
    </div>
  `;

  html += `
    <div class="prop-group">
      <div class="prop-group-title">
        <span>Media Slot (Dùng cho Template)</span>
        <input type="checkbox" id="chkIsSlot" ${clip.isSlot ? 'checked' : ''} style="cursor:pointer;" />
      </div>
      ${clip.isSlot ? `
        <div class="prop-row">
          <span class="prop-label">Tên ô thay thế:</span>
          <input type="text" class="prop-input-text" id="inpSlotName" value="${clip.slotName || 'Video chính'}" style="width:140px;" />
        </div>
      ` : ''}
    </div>
  `;

  inspectorContent.innerHTML = html;
  bindInspectorInputs(clip);
}

function bindInspectorInputs(clip) {
  const clipRelTime = Math.max(0, playheadTime - clip.start);

  const btnReset = document.getElementById("btnResetTransform");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      clip.transform = { x: 540, y: 960, scale: 1.0, rotation: 0, opacity: 1.0, fit: "blur_fill" };
      updateInspector();
      drawPreview();
      saveState("Đặt lại biến đổi");
    });
  }

  const fitSelect = document.getElementById("inpClipFit");
  if (fitSelect) {
    fitSelect.addEventListener("change", (e) => {
      clip.transform.fit = e.target.value;
      updateInspector();
      drawPreview();
      saveState("Đổi chế độ vừa khung");
    });
  }

  const inpX = document.getElementById("inpPosX");
  const inpY = document.getElementById("inpPosY");
  if (inpX && inpY) {
    inpX.addEventListener("input", (e) => {
      clip.transform.x = parseFloat(e.target.value);
      document.getElementById("valPosX").innerText = Math.round(clip.transform.x);
      drawPreview();
    });
    inpX.addEventListener("change", () => saveState("Chỉnh vị trí X"));
    inpY.addEventListener("input", (e) => {
      clip.transform.y = parseFloat(e.target.value);
      document.getElementById("valPosY").innerText = Math.round(clip.transform.y);
      drawPreview();
    });
    inpY.addEventListener("change", () => saveState("Chỉnh vị trí Y"));
  }

  const inpScale = document.getElementById("inpScale");
  if (inpScale) {
    inpScale.addEventListener("input", (e) => {
      clip.transform.scale = parseFloat(e.target.value);
      document.getElementById("valScale").innerText = clip.transform.scale.toFixed(2) + "x";
      drawPreview();
    });
    inpScale.addEventListener("change", () => saveState("Chỉnh Scale"));
    const btnKfScale = document.getElementById("btnKfScale");
    if (btnKfScale) {
      btnKfScale.addEventListener("click", () => {
        toggleKeyframe(clip, "scale", clipRelTime, clip.transform.scale);
      });
      btnKfScale.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openGraphEditorForClip(clip, "scale");
      });
    }
  }

  const inpRot = document.getElementById("inpRot");
  if (inpRot) {
    inpRot.addEventListener("input", (e) => {
      clip.transform.rotation = parseFloat(e.target.value);
      document.getElementById("valRot").innerText = clip.transform.rotation + "°";
      drawPreview();
    });
    inpRot.addEventListener("change", () => saveState("Chỉnh Rotation"));
    const btnKfRot = document.getElementById("btnKfRot");
    if (btnKfRot) {
      btnKfRot.addEventListener("click", () => {
        toggleKeyframe(clip, "rotation", clipRelTime, clip.transform.rotation);
      });
    }
  }

  const inpOpacity = document.getElementById("inpOpacity");
  if (inpOpacity) {
    inpOpacity.addEventListener("input", (e) => {
      clip.transform.opacity = parseFloat(e.target.value);
      document.getElementById("valOpacity").innerText = Math.round(clip.transform.opacity * 100) + "%";
      drawPreview();
    });
    inpOpacity.addEventListener("change", () => saveState("Chỉnh Opacity"));
    const btnKfOpacity = document.getElementById("btnKfOpacity");
    if (btnKfOpacity) {
      btnKfOpacity.addEventListener("click", () => {
        toggleKeyframe(clip, "opacity", clipRelTime, clip.transform.opacity);
      });
    }
  }

  const inpCropX = document.getElementById("inpCropX");
  if (inpCropX) {
    inpCropX.addEventListener("input", (e) => {
      clip.transform.cropX = parseFloat(e.target.value);
      drawPreview();
    });
    inpCropX.addEventListener("change", () => saveState("Chỉnh Crop Pan X"));
  }
  const btnKfCropX = document.getElementById("btnKfCropX");
  if (btnKfCropX) {
    btnKfCropX.addEventListener("click", () => {
      toggleKeyframe(clip, "cropX", clipRelTime, clip.transform.cropX ?? 0.5);
    });
  }

  if (clip.type === "text") {
    const textContent = document.getElementById("inpTextContent");
    if (textContent) {
      textContent.addEventListener("input", (e) => {
        clip.text.content = e.target.value;
        drawPreview();
      });
      textContent.addEventListener("change", () => saveState("Sửa chữ"));
    }
    const fontSel = document.getElementById("inpTextFont");
    if (fontSel) {
      fontSel.addEventListener("change", (e) => {
        clip.text.font = e.target.value;
        drawPreview();
        saveState("Đổi phông chữ");
      });
    }
    const inpSize = document.getElementById("inpTextSize");
    if (inpSize) {
      inpSize.addEventListener("input", (e) => {
        clip.text.size = parseInt(e.target.value);
        document.getElementById("valTextSize").innerText = clip.text.size + "px";
        drawPreview();
      });
      inpSize.addEventListener("change", () => saveState("Đổi cỡ chữ"));
    }
    const inpCol = document.getElementById("inpTextColor");
    if (inpCol) inpCol.addEventListener("input", (e) => { clip.text.color = e.target.value; drawPreview(); });
    const inpStroke = document.getElementById("inpStrokeColor");
    if (inpStroke) inpStroke.addEventListener("input", (e) => { clip.text.stroke = e.target.value; drawPreview(); });
    const animIn = document.getElementById("inpTextAnimIn");
    if (animIn) animIn.addEventListener("change", (e) => { clip.text.animIn = e.target.value; drawPreview(); saveState("Đổi animation chữ"); });

    const chkTa = document.getElementById("chkTextAnimEnabled");
    if (chkTa) {
      chkTa.addEventListener("change", (e) => {
        if (!clip.textAnimator) clip.textAnimator = { enabled: false, unit: "char", animType: "fade_rise", stagger: 0.06 };
        clip.textAnimator.enabled = e.target.checked;
        updateInspector();
        drawPreview();
        saveState("Bật/Tắt Text Animator");
      });
    }
    const selTaUnit = document.getElementById("selTaUnit");
    if (selTaUnit) selTaUnit.addEventListener("change", (e) => { clip.textAnimator.unit = e.target.value; drawPreview(); });
    const selTaType = document.getElementById("selTaType");
    if (selTaType) selTaType.addEventListener("change", (e) => { clip.textAnimator.animType = e.target.value; drawPreview(); });
    const inpTaStagger = document.getElementById("inpTaStagger");
    if (inpTaStagger) inpTaStagger.addEventListener("input", (e) => { clip.textAnimator.stagger = parseFloat(e.target.value); drawPreview(); });
  }

  if (clip.type === "shape") {
    const inpShapeFill = document.getElementById("inpShapeFill");
    if (inpShapeFill) inpShapeFill.addEventListener("input", (e) => { clip.shape.fill = e.target.value; drawPreview(); });
    const inpShapeStroke = document.getElementById("inpShapeStroke");
    if (inpShapeStroke) inpShapeStroke.addEventListener("input", (e) => { clip.shape.stroke = e.target.value; drawPreview(); });
    const inpShapeStrokeW = document.getElementById("inpShapeStrokeW");
    if (inpShapeStrokeW) inpShapeStrokeW.addEventListener("input", (e) => { clip.shape.strokeWidth = parseInt(e.target.value); drawPreview(); });
    const inpTrimStart = document.getElementById("inpShapeTrimStart");
    if (inpTrimStart) inpTrimStart.addEventListener("input", (e) => { clip.shape.trimStart = parseInt(e.target.value); drawPreview(); });
    const inpTrimEnd = document.getElementById("inpShapeTrimEnd");
    if (inpTrimEnd) inpTrimEnd.addEventListener("input", (e) => { clip.shape.trimEnd = parseInt(e.target.value); drawPreview(); });
  }

  const chkTrack = document.getElementById("chkTrackingEnabled");
  if (chkTrack) {
    chkTrack.addEventListener("change", (e) => {
      if (!clip.tracking) clip.tracking = { enabled: false, points: [] };
      clip.tracking.enabled = e.target.checked;
      const crosshair = document.getElementById("trackingCrosshair");
      if (crosshair) crosshair.classList.toggle("hidden", !clip.tracking.enabled);
      updateInspector();
      saveState("Bật/Tắt Tracking");
    });
  }
  const btnAddTrackPoint = document.getElementById("btnAddTrackingKeyPoint");
  if (btnAddTrackPoint) {
    btnAddTrackPoint.addEventListener("click", () => {
      const crosshair = document.getElementById("trackingCrosshair");
      const phoneBox = document.getElementById("phoneBox");
      const rect = phoneBox.getBoundingClientRect();
      const curX = crosshair.offsetLeft - (rect.width * 0.5);
      const curY = crosshair.offsetTop - (rect.height * 0.5);
      clip.tracking.points = clip.tracking.points || [];
      clip.tracking.points.push({ time: clipRelTime, x: curX, y: curY });
      clip.tracking.points.sort((a, b) => a.time - b.time);
      updateInspector();
      drawPreview();
      saveState("Thêm điểm Tracking tại " + clipRelTime.toFixed(2) + "s");
      alert("Đã lưu tọa độ bám dính cho thời điểm " + clipRelTime.toFixed(2) + "s!");
    });
  }

  document.querySelectorAll(".inpFxIntensity").forEach(slider => {
    slider.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.fxIdx);
      clip.effects[idx].intensity = parseInt(e.target.value);
      drawPreview();
    });
    slider.addEventListener("change", () => saveState("Chỉnh cường độ hiệu ứng"));
  });
  document.querySelectorAll(".btnRemoveFx").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.fxIdx);
      clip.effects.splice(idx, 1);
      updateInspector();
      drawPreview();
      saveState("Xóa hiệu ứng");
    });
  });

  const btnToggleSpeedRamp = document.getElementById("btnToggleSpeedRamp");
  if (btnToggleSpeedRamp) {
    btnToggleSpeedRamp.addEventListener("click", () => {
      if (!clip.speedRamp) clip.speedRamp = { enabled: false, points: SPEED_RAMP_PRESETS.montage };
      clip.speedRamp.enabled = !clip.speedRamp.enabled;
      updateInspector();
      drawPreview();
      saveState("Bật/Tắt Speed Ramp");
    });
  }
  document.querySelectorAll(".btn-ramp-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      clip.speedRamp = { enabled: true, points: SPEED_RAMP_PRESETS[p] || SPEED_RAMP_PRESETS.montage, preset: p };
      updateInspector();
      drawPreview();
      saveState("Chọn Speed Ramp " + p);
    });
  });

  const inpSpeed = document.getElementById("inpClipSpeed");
  if (inpSpeed) {
    inpSpeed.addEventListener("change", (e) => {
      clip.speed = parseFloat(e.target.value);
      drawPreview();
      saveState("Đổi tốc độ");
    });
  }
  const inpVol = document.getElementById("inpClipVolume");
  if (inpVol) {
    inpVol.addEventListener("input", (e) => {
      clip.volume = parseFloat(e.target.value);
      document.getElementById("valClipVolume").innerText = Math.round(clip.volume * 100) + "%";
    });
  }

  const inpBlend = document.getElementById("inpBlendMode");
  if (inpBlend) {
    inpBlend.addEventListener("change", (e) => {
      clip.blendMode = e.target.value;
      drawPreview();
      saveState("Đổi Blend Mode");
    });
  }

  const inpMask = document.getElementById("inpMaskType");
  if (inpMask) {
    inpMask.addEventListener("change", (e) => {
      if (!clip.mask) clip.mask = { type: "none", x: 0.5, y: 0.5, width: 0.8, height: 0.8, feather: 15 };
      clip.mask.type = e.target.value;
      drawPreview();
      saveState("Đổi Mask");
    });
  }

  const chkChroma = document.getElementById("chkChromaEnabled");
  if (chkChroma) {
    chkChroma.addEventListener("change", (e) => {
      if (!clip.chromaKey) clip.chromaKey = { enabled: false, color: "#00ff00", tolerance: 35, smoothness: 15 };
      clip.chromaKey.enabled = e.target.checked;
      updateInspector();
      drawPreview();
      saveState("Bật/Tắt Chroma Key");
    });
  }
  const inpChromaCol = document.getElementById("inpChromaColor");
  if (inpChromaCol) inpChromaCol.addEventListener("input", (e) => { clip.chromaKey.color = e.target.value; drawPreview(); });
  const inpChromaTol = document.getElementById("inpChromaTolerance");
  if (inpChromaTol) inpChromaTol.addEventListener("input", (e) => { clip.chromaKey.tolerance = parseInt(e.target.value); drawPreview(); });
  const inpChromaSm = document.getElementById("inpChromaSmoothness");
  if (inpChromaSm) inpChromaSm.addEventListener("input", (e) => { clip.chromaKey.smoothness = parseInt(e.target.value); drawPreview(); });

  const bindCg = (id, prop) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", (e) => {
        if (!clip.colorGrading) clip.colorGrading = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0 };
        clip.colorGrading[prop] = parseFloat(e.target.value);
        drawPreview();
      });
      el.addEventListener("change", () => saveState("Chỉnh màu " + prop));
    }
  };
  bindCg("inpCgExposure", "exposure");
  bindCg("inpCgContrast", "contrast");
  bindCg("inpCgSaturation", "saturation");
  bindCg("inpCgTemp", "temperature");
  bindCg("inpCgTint", "tint");

  const btnResetCg = document.getElementById("btnResetColorGrading");
  if (btnResetCg) {
    btnResetCg.addEventListener("click", () => {
      clip.colorGrading = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, lutData: null, lutName: null };
      updateInspector();
      drawPreview();
      saveState("Đặt lại chỉnh màu");
    });
  }

  const btnLut = document.getElementById("btnImportLutCube");
  const inputLut = document.getElementById("inputLutFile");
  if (btnLut && inputLut) {
    btnLut.addEventListener("click", () => inputLut.click());
    inputLut.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const lutObj = parseCubeLut(ev.target.result);
          if (!clip.colorGrading) clip.colorGrading = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0 };
          clip.colorGrading.lutData = lutObj;
          clip.colorGrading.lutName = file.name;
          updateInspector();
          drawPreview();
          saveState("Nạp LUT " + file.name);
        } catch (err) {
          alert("Lỗi phân tích file LUT .cube: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  const chkSlot = document.getElementById("chkIsSlot");
  if (chkSlot) {
    chkSlot.addEventListener("change", (e) => {
      clip.isSlot = e.target.checked;
      if (!clip.slotName) clip.slotName = clip.name || "Video Slot";
      updateInspector();
      saveState("Đánh dấu Media Slot");
    });
  }
  const inpSlotName = document.getElementById("inpSlotName");
  if (inpSlotName) {
    inpSlotName.addEventListener("change", (e) => {
      clip.slotName = e.target.value;
      saveState("Đổi tên Media Slot");
    });
  }
}
