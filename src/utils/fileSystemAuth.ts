import { db } from '../db';
import { useEditorStore } from '../store/useEditorStore';

// Verify and re-request permission for a stored FileSystemFileHandle if expired
export async function verifyAndRequestFilePermission(handle: any): Promise<boolean> {
  if (!handle || typeof handle.queryPermission !== 'function') return false;

  try {
    const opts = { mode: 'read' as const };
    const queryResult = await handle.queryPermission(opts);
    if (queryResult === 'granted') {
      return true;
    }
    // Must be invoked in response to a user interaction
    const requestResult = await handle.requestPermission(opts);
    return requestResult === 'granted';
  } catch (err) {
    console.warn('verifyAndRequestFilePermission failed:', err);
    return false;
  }
}

// Automatically rehydrate or relink a clip from its stored FileSystemFileHandle
export async function relinkFromFileHandle(clipId: string, handle: any): Promise<boolean> {
  const store = useEditorStore.getState();
  const target = store.clips.find((c) => c.id === clipId);
  if (!target) return false;

  try {
    const granted = await verifyAndRequestFilePermission(handle);
    if (!granted) {
      store.showToast('Quyền truy cập tệp gốc bị từ chối hoặc hết hạn. Vui lòng chọn lại tệp bằng Relink.', 'warning');
      return false;
    }

    const file: File = await handle.getFile();
    const blobUrl = URL.createObjectURL(file);
    const mediaId = target.mediaId || 'media-' + Date.now();

    try {
      await db.media.put({
        id: mediaId,
        name: file.name,
        type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
        blob: file,
        size: file.size,
        createdAt: Date.now()
      });
    } catch (e) {
      console.warn('Put relinked media to IndexedDB failed:', e);
    }

    store.updateClip(clipId, {
      src: blobUrl,
      mediaId,
      name: file.name,
      hasError: false,
      missingMedia: false
    });

    store.showToast(`Đã khôi phục quyền truy cập tệp "${file.name}"!`, 'success');
    return true;
  } catch (err: any) {
    store.showToast(`Lỗi truy cập tệp gốc: ${err.message}`, 'error');
    return false;
  }
}
