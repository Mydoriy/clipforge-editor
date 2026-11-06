export interface ShortcutDef {
  id: string;
  name: string;
  nameEn: string;
  category: 'playback' | 'editing' | 'tools' | 'navigation' | 'view' | 'project';
  defaultKey: string;
  description: string;
  descriptionEn: string;
}

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  // 1. Playback
  {
    id: 'playPause',
    name: 'Phát / Tạm dừng',
    nameEn: 'Play / Pause',
    category: 'playback',
    defaultKey: 'Space',
    description: 'Bắt đầu hoặc tạm dừng phát video trên player',
    descriptionEn: 'Start or pause video playback on player'
  },

  // 2. Editing
  {
    id: 'split',
    name: 'Cắt / Tách clip tại playhead',
    nameEn: 'Split Clip at Playhead',
    category: 'editing',
    defaultKey: 'S',
    description: 'Chia đôi clip đang chọn tại vị trí con trỏ playhead',
    descriptionEn: 'Split selected clip at current playhead position'
  },
  {
    id: 'splitAlt',
    name: 'Tách clip (Ctrl+B)',
    nameEn: 'Split Clip (Ctrl+B)',
    category: 'editing',
    defaultKey: 'Ctrl+B',
    description: 'Phím tắt thay thế để tách clip tại playhead',
    descriptionEn: 'Alternative shortcut to split clip'
  },
  {
    id: 'deleteLeft',
    name: 'Xóa phần bên trái (Q)',
    nameEn: 'Delete Left (Trim Start)',
    category: 'editing',
    defaultKey: 'Q',
    description: 'Cắt bỏ đoạn đầu của clip từ điểm bắt đầu đến playhead',
    descriptionEn: 'Trim clip start point up to playhead'
  },
  {
    id: 'deleteRight',
    name: 'Xóa phần bên phải (W)',
    nameEn: 'Delete Right (Trim End)',
    category: 'editing',
    defaultKey: 'W',
    description: 'Cắt bỏ đoạn đuôi của clip từ playhead đến hết',
    descriptionEn: 'Trim clip end point from playhead to finish'
  },
  {
    id: 'delete',
    name: 'Xóa clip (Delete)',
    nameEn: 'Delete Clip',
    category: 'editing',
    defaultKey: 'Delete',
    description: 'Xóa các clip đang chọn khỏi timeline',
    descriptionEn: 'Remove selected clip(s) from timeline'
  },
  {
    id: 'rippleDelete',
    name: 'Xóa và dồn track (Ripple Delete)',
    nameEn: 'Ripple Delete',
    category: 'editing',
    defaultKey: 'Shift+Delete',
    description: 'Xóa clip và tự động dồn các clip phía sau lại gần',
    descriptionEn: 'Delete clip and close the gap on timeline'
  },
  {
    id: 'undo',
    name: 'Hoàn tác (Undo)',
    nameEn: 'Undo',
    category: 'editing',
    defaultKey: 'Ctrl+Z',
    description: 'Khôi phục lại bước thao tác trước đó',
    descriptionEn: 'Revert the last action'
  },
  {
    id: 'redo',
    name: 'Làm lại (Redo)',
    nameEn: 'Redo',
    category: 'editing',
    defaultKey: 'Ctrl+Shift+Z',
    description: 'Thực hiện lại bước vừa hoàn tác',
    descriptionEn: 'Repeat the previously undone action'
  },
  {
    id: 'copy',
    name: 'Sao chép clip (Copy)',
    nameEn: 'Copy Clip',
    category: 'editing',
    defaultKey: 'Ctrl+C',
    description: 'Lưu clip vào bộ nhớ đệm',
    descriptionEn: 'Copy clip to clipboard'
  },
  {
    id: 'cut',
    name: 'Cắt clip (Cut)',
    nameEn: 'Cut Clip',
    category: 'editing',
    defaultKey: 'Ctrl+X',
    description: 'Cắt clip và lưu vào bộ nhớ đệm',
    descriptionEn: 'Cut clip to clipboard'
  },
  {
    id: 'paste',
    name: 'Dán clip (Paste)',
    nameEn: 'Paste Clip',
    category: 'editing',
    defaultKey: 'Ctrl+V',
    description: 'Dán clip từ bộ nhớ đệm vào vị trí playhead',
    descriptionEn: 'Paste clip at playhead position'
  },
  {
    id: 'duplicate',
    name: 'Nhân bản clip (Duplicate)',
    nameEn: 'Duplicate Clip',
    category: 'editing',
    defaultKey: 'Ctrl+D',
    description: 'Tạo bản sao clip nối tiếp ngay phía sau',
    descriptionEn: 'Duplicate selected clip immediately after'
  },
  {
    id: 'marker',
    name: 'Thêm điểm đánh dấu (Marker)',
    nameEn: 'Add Marker',
    category: 'editing',
    defaultKey: 'M',
    description: 'Ghim marker ghi chú tại vị trí playhead trên timeline',
    descriptionEn: 'Add colored timeline marker at playhead'
  },

  // 3. Tools
  {
    id: 'toolSelect',
    name: 'Công cụ Chọn (Select V)',
    nameEn: 'Select Tool (V)',
    category: 'tools',
    defaultKey: 'V',
    description: 'Chuyển sang công cụ trỏ chuột chọn và kéo thả clip',
    descriptionEn: 'Switch to standard clip selection pointer'
  },
  {
    id: 'toolRazor',
    name: 'Công cụ Dao cắt (Razor B)',
    nameEn: 'Razor / Blade Tool (B)',
    category: 'tools',
    defaultKey: 'B',
    description: 'Chuyển sang công cụ lưỡi lam click để cắt clip',
    descriptionEn: 'Switch to razor cutter tool'
  },
  {
    id: 'toolHand',
    name: 'Công cụ Kéo cuộn (Hand H)',
    nameEn: 'Hand / Pan Tool (H)',
    category: 'tools',
    defaultKey: 'H',
    description: 'Chuyển sang công cụ bàn tay kéo cuộn timeline',
    descriptionEn: 'Switch to panning hand tool'
  },
  {
    id: 'toggleSnapping',
    name: 'Bật / Tắt Hút tự động (Snapping N)',
    nameEn: 'Toggle Auto Snapping (N)',
    category: 'tools',
    defaultKey: 'N',
    description: 'Bật hoặc tắt tính năng hút dính vào đầu cuối clip/playhead/marker',
    descriptionEn: 'Toggle magnetic snap to boundaries'
  },

  // 4. Navigation
  {
    id: 'prevFrame',
    name: 'Lùi 1 khung hình (←)',
    nameEn: 'Step 1 Frame Back (←)',
    category: 'navigation',
    defaultKey: 'ArrowLeft',
    description: 'Lùi playhead về trước đúng 1 frame',
    descriptionEn: 'Step backward by exactly 1 frame'
  },
  {
    id: 'nextFrame',
    name: 'Tiến 1 khung hình (→)',
    nameEn: 'Step 1 Frame Forward (→)',
    category: 'navigation',
    defaultKey: 'ArrowRight',
    description: 'Tiến playhead tới trước đúng 1 frame',
    descriptionEn: 'Step forward by exactly 1 frame'
  },
  {
    id: 'prevSecond',
    name: 'Lùi 1 giây (Shift+←)',
    nameEn: 'Jump 1 Second Back',
    category: 'navigation',
    defaultKey: 'Shift+ArrowLeft',
    description: 'Nhảy playhead lùi lại 1 giây',
    descriptionEn: 'Jump playhead 1 second backward'
  },
  {
    id: 'nextSecond',
    name: 'Tiến 1 giây (Shift+→)',
    nameEn: 'Jump 1 Second Forward',
    category: 'navigation',
    defaultKey: 'Shift+ArrowRight',
    description: 'Nhảy playhead tới trước 1 giây',
    descriptionEn: 'Jump playhead 1 second forward'
  },
  {
    id: 'home',
    name: 'Về đầu Timeline (Home)',
    nameEn: 'Go to Timeline Start',
    category: 'navigation',
    defaultKey: 'Home',
    description: 'Đưa con trỏ playhead về 00:00:00',
    descriptionEn: 'Jump to beginning of timeline'
  },
  {
    id: 'end',
    name: 'Đến cuối Timeline (End)',
    nameEn: 'Go to Timeline End',
    category: 'navigation',
    defaultKey: 'End',
    description: 'Đưa con trỏ playhead tới cuối clip dài nhất',
    descriptionEn: 'Jump to end of timeline'
  },

  // 5. View
  {
    id: 'zoomIn',
    name: 'Phóng to Timeline (+)',
    nameEn: 'Zoom In Timeline (+)',
    category: 'view',
    defaultKey: '=',
    description: 'Phóng to các track để nhìn rõ từng frame',
    descriptionEn: 'Zoom in timeline tracks'
  },
  {
    id: 'zoomOut',
    name: 'Thu nhỏ Timeline (-)',
    nameEn: 'Zoom Out Timeline (-)',
    category: 'view',
    defaultKey: '-',
    description: 'Thu nhỏ để bao quát toàn bộ dự án',
    descriptionEn: 'Zoom out timeline tracks'
  },
  {
    id: 'toggleFullscreen',
    name: 'Toàn màn hình Player (F)',
    nameEn: 'Toggle Fullscreen Player (F)',
    category: 'view',
    defaultKey: 'F',
    description: 'Bật hoặc thoát chế độ toàn màn hình xem video',
    descriptionEn: 'Toggle fullscreen video preview'
  },

  // 6. Project
  {
    id: 'export',
    name: 'Mở cửa sổ xuất video (Ctrl+E)',
    nameEn: 'Export Video Modal (Ctrl+E)',
    category: 'project',
    defaultKey: 'Ctrl+E',
    description: 'Mở hộp thoại kết xuất video 9:16',
    descriptionEn: 'Open the export settings modal'
  },
  {
    id: 'save',
    name: 'Lưu dự án ngay (Ctrl+S)',
    nameEn: 'Save Project Immediately',
    category: 'project',
    defaultKey: 'Ctrl+S',
    description: 'Lưu toàn bộ thay đổi vào IndexedDB trình duyệt',
    descriptionEn: 'Save project to browser storage'
  },
  {
    id: 'import',
    name: 'Nhập tệp media (Ctrl+I)',
    nameEn: 'Import Media (Ctrl+I)',
    category: 'project',
    defaultKey: 'Ctrl+I',
    description: 'Mở hộp thoại chọn video/audio/ảnh từ máy tính',
    descriptionEn: 'Open file picker to import assets'
  }
];

// Convert KeyboardEvent into a standard string representation
export function eventToKeyCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;
  if (e.code === 'Space') key = 'Space';
  else if (e.code === 'Delete') key = 'Delete';
  else if (e.code === 'Backspace') key = 'Backspace';
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') key = '=';
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') key = '-';
  else if (e.code.startsWith('Key')) key = e.code.replace('Key', '');
  else if (e.code.startsWith('Digit')) key = e.code.replace('Digit', '');
  else if (e.code === 'ArrowLeft') key = 'ArrowLeft';
  else if (e.code === 'ArrowRight') key = 'ArrowRight';
  else if (e.code === 'ArrowUp') key = 'ArrowUp';
  else if (e.code === 'ArrowDown') key = 'ArrowDown';
  else if (e.code === 'Home') key = 'Home';
  else if (e.code === 'End') key = 'End';

  // Ignore bare modifier key presses
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return '';
  }

  if (key.length === 1) key = key.toUpperCase();

  if (!parts.includes(key)) {
    parts.push(key);
  }

  return parts.join('+');
}

// Compare KeyboardEvent against target shortcut ID or user override
export function matchShortcut(
  e: KeyboardEvent,
  actionId: string,
  customShortcuts?: Record<string, string>
): boolean {
  const currentCombo = eventToKeyCombo(e);
  if (!currentCombo) return false;

  const userKey = customShortcuts?.[actionId];
  const def = DEFAULT_SHORTCUTS.find((s) => s.id === actionId);
  const targetKey = userKey || def?.defaultKey;

  if (!targetKey) return false;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .split('+')
      .sort()
      .join('+');

  if (normalize(currentCombo) === normalize(targetKey)) {
    return true;
  }

  // Handle special built-in aliases
  if (actionId === 'split' && !userKey) {
    if (normalize(currentCombo) === normalize('ctrl+b')) return true;
  }
  if (actionId === 'zoomIn' && !userKey) {
    if (normalize(currentCombo) === normalize('+')) return true;
  }

  return false;
}

// Format key combinations with friendly icons/labels for UI
export function formatDisplayKey(combo: string): string {
  return combo
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓');
}

