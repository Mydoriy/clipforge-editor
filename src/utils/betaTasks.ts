/**
 * Closed Beta Guided Tasks Tracker
 * Guides 10-30 beta testers through the 5 essential validation scenarios.
 */

export interface BetaTask {
  id: string;
  title: string;
  description: string;
  targetAudience: 'Tất cả' | 'Máy cấu hình thấp' | 'Người sáng tạo' | 'Mobile / Tablet';
  steps: string[];
  actionUrl?: string;
  actionLabel?: string;
  completed: boolean;
}

export const INITIAL_BETA_TASKS: Omit<BetaTask, 'completed'>[] = [
  {
    id: 'task-1-create-30s',
    title: 'Nhiệm vụ 1: Tạo video 30 giây có chữ & nhạc nền',
    description: 'Kéo thả 1-2 clip video vào timeline, thêm track chữ phong cách TikTok và 1 file âm thanh nhạc nền.',
    targetAudience: 'Tất cả',
    steps: [
      'Vào Editor và kéo thả video hoặc dùng video mẫu có sẵn.',
      'Dùng phím C để tách (split) hoặc Q/W để cắt bớt clip đạt độ dài ~30 giây.',
      'Vào tab Text, chọn một Preset chữ hot trend và gõ nội dung tiêu đề.',
      'Vào tab Audio, thêm 1 bài nhạc nền và điều chỉnh âm lượng vừa phải.'
    ],
    actionUrl: '/editor/demo-916-intro',
    actionLabel: 'Mở Editor thử ngay'
  },
  {
    id: 'task-2-auto-subtitles',
    title: 'Nhiệm vụ 2: Tạo phụ đề tự động (Auto-Captions)',
    description: 'Thử nghiệm tính năng trích xuất giọng nói và sinh phụ đề tự động cục bộ 100% trên trình duyệt.',
    targetAudience: 'Người sáng tạo',
    steps: [
      'Trong Editor, mở panel Text hoặc Phụ đề.',
      'Bấm "Nhận diện giọng nói tự động" (Whisper Transcriber).',
      'Kiểm tra độ chính xác của text phụ đề sinh ra trên timeline và canh chỉnh thời gian.'
    ],
    actionUrl: '/editor/demo-916-intro',
    actionLabel: 'Thử tạo phụ đề'
  },
  {
    id: 'task-3-export-916',
    title: 'Nhiệm vụ 3: Xuất video dọc 9:16 Full HD 1080p',
    description: 'Kiểm tra tốc độ render WebCodecs và xuất file MP4 chuẩn TikTok/Reels trên thiết bị của bạn.',
    targetAudience: 'Máy cấu hình thấp',
    steps: [
      'Bấm nút "Xuất video" (Export) ở góc trên bên phải màn hình.',
      'Chọn tỉ lệ 9:16, độ phân giải 1080p Full HD, 30fps.',
      'Quan sát thanh tiến trình render, kiểm tra máy có bị giật/lag hay tràn RAM không.',
      'Tải file MP4 về và mở phát thử trên máy tính.'
    ],
    actionUrl: '/editor/demo-916-intro',
    actionLabel: 'Mở trình xuất video'
  },
  {
    id: 'task-4-crash-recovery',
    title: 'Nhiệm vụ 4: Khôi phục phiên sau khi tắt tab đột ngột',
    description: 'Kiểm chứng độ bền của kiến trúc Local-First: Đóng tab trình duyệt giữa chừng mà không mất dữ liệu.',
    targetAudience: 'Tất cả',
    steps: [
      'Thực hiện một vài thay đổi trong timeline (cắt clip, đổi chữ, đổi vị trí).',
      'Đóng tab trình duyệt đột ngột hoặc bấm F5 (Reload) khi đang chỉnh sửa.',
      'Mở lại ứng dụng và xác nhận hộp thoại "Khôi phục phiên chưa lưu?" xuất hiện.',
      'Kiểm tra toàn bộ clip và vị trí playhead được khôi phục nguyên vẹn.'
    ],
    actionUrl: '/',
    actionLabel: 'Kiểm tra khôi phục'
  },
  {
    id: 'task-5-mobile-responsive',
    title: 'Nhiệm vụ 5: Thử nghiệm trên thiết bị di động / máy tính bảng',
    description: 'Trải nghiệm trên điện thoại (Safari/Chrome Mobile) hoặc giả lập DevTools chế độ điện thoại.',
    targetAudience: 'Mobile / Tablet',
    steps: [
      'Mở ứng dụng trên điện thoại hoặc mở F12 DevTools chọn chế độ xem Mobile (iPhone / Pixel).',
      'Kiểm tra giao diện Home hiển thị gọn gàng, nút bấm to rõ dễ chạm ngón tay.',
      'Khi mở Editor trên màn hình hẹp, xác nhận có thông báo thân thiện nhắc nhở xoay ngang hoặc dùng máy tính thay vì bị vỡ bố cục.'
    ],
    actionUrl: '/welcome',
    actionLabel: 'Xem trang Mobile'
  }
];

const STORAGE_KEY = 'clipforge_beta_tasks_progress';

export function getBetaTasks(): BetaTask[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INITIAL_BETA_TASKS.map((t) => ({ ...t, completed: false }));
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const completedMap: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    return INITIAL_BETA_TASKS.map((t) => ({
      ...t,
      completed: Boolean(completedMap[t.id])
    }));
  } catch {
    return INITIAL_BETA_TASKS.map((t) => ({ ...t, completed: false }));
  }
}

export function toggleBetaTask(id: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const completedMap: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    const newState = !completedMap[id];
    completedMap[id] = newState;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completedMap));
    return newState;
  } catch {
    return false;
  }
}

export function resetBetaTasks(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getBetaTasksProgress(): { completed: number; total: number; percentage: number } {
  const tasks = getBetaTasks();
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

