import { useEditorStore } from '../store/useEditorStore.ts';

export type ExtensionEventType = 'new_pack' | 'update_available' | 'revocation' | 'install_complete';

export interface ExtensionEventPayload {
  title?: string;
  name: string;
  id?: string;
  version?: string;
  reason?: string;
}

/**
 * Dispatches extension-related notifications to the top header bell
 */
export function notifyExtensionEvent(
  type: ExtensionEventType,
  payload: ExtensionEventPayload
): void {
  const store = useEditorStore.getState();
  const id = `notif-ext-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const time = 'Vừa xong';

  let title = '';
  let desc = '';
  let notifType: 'feature' | 'update' | 'revocation' | 'install' = 'feature';

  if (type === 'new_pack') {
    title = payload.title || `Gói mới: ${payload.name}`;
    desc = `Đã phát hiện gói tài nguyên mới "${payload.name}" trong Kho. Bạn có thể xem trước hoặc cài đặt.`;
    notifType = 'feature';
  } else if (type === 'update_available') {
    title = `Có bản cập nhật: ${payload.name}`;
    desc = `Đã có bản cập nhật mới (v${payload.version}) cho gói "${payload.name}". Mở Kho để so sánh trước/sau.`;
    notifType = 'update';
  } else if (type === 'revocation') {
    title = `⚠️ Thu hồi khẩn cấp: ${payload.name}`;
    desc = `Gói "${payload.name}" đã bị thu hồi (${payload.reason || 'Lỗi GPU/Bảo mật'}). Vị trí timeline đã chuyển sang Ghost an toàn.`;
    notifType = 'revocation';
  } else if (type === 'install_complete') {
    title = `Đã cài đặt: ${payload.name}`;
    desc = `Gói "${payload.name}" (v${payload.version || '1.0.0'}) đã được cài đặt và sẵn sàng sử dụng offline.`;
    notifType = 'install';
  }

  store.addNotification({
    id,
    title,
    desc,
    time,
    read: false,
    type: notifType,
  });
}
