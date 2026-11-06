import { useEditorStore } from '../store/useEditorStore';

let deferredInstallPrompt: any = null;
let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Check if the app is currently running in standalone PWA window
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Detect Apple iOS Safari device for custom installation instructions
 */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

/**
 * Initialize PWA lifecycle: Service Worker, BeforeInstallPrompt, Online/Offline, and File Handlers
 */
export function initPwa(): void {
  if (typeof window === 'undefined') return;

  const store = useEditorStore.getState();

  // 1. Online / Offline Network Listeners
  window.addEventListener('online', () => {
    useEditorStore.getState().setIsOffline(false);
    useEditorStore.getState().showToast('Đã kết nối lại internet!', 'success');
  });

  window.addEventListener('offline', () => {
    useEditorStore.getState().setIsOffline(true);
    useEditorStore.getState().showToast(
      'Chế độ Ngoại tuyến (Offline): Tiếp tục dựng và xuất video bình thường không cần mạng!',
      'warning'
    );
  });

  // 2. BeforeInstallPrompt Event Listener
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    useEditorStore.getState().setCanInstallPwa(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    useEditorStore.getState().setCanInstallPwa(false);
    useEditorStore.getState().showToast('Ứng dụng ClipForge đã được cài đặt thành công!', 'success');
  });

  // 3. Register Service Worker with Controlled Update Lifecycle
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          swRegistration = registration;

          // Check if an updated worker is already waiting
          if (registration.waiting) {
            handleUpdateAvailable(registration.waiting);
          }

          // Detect new updates found
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                handleUpdateAvailable(newWorker);
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });

      // Reload smoothly when new worker takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  // 4. Chromium File Handlers API (launchQueue for .capproj & videos)
  if ('launchQueue' in window && 'setConsumer' in (window as any).launchQueue) {
    (window as any).launchQueue.setConsumer(async (launchParams: any) => {
      if (!launchParams.files || !launchParams.files.length) return;
      useEditorStore.getState().showToast(`Đã nhận ${launchParams.files.length} tệp từ hệ điều hành!`, 'info');
    });
  }
}

/**
 * Handle new version waiting: show toast and notify user WITHOUT automatically reloading
 */
function handleUpdateAvailable(waitingWorker: ServiceWorker): void {
  useEditorStore.getState().setPwaUpdateAvailable(true);
  useEditorStore.getState().showToast(
    'Có bản cập nhật mới! Nhấn "Cập nhật" trong Cài đặt hoặc lưu dự án trước khi tải lại.',
    'info'
  );
}

/**
 * Trigger PWA prompt to install app onto desktop or mobile home screen
 */
export async function installPwaApp(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return false;
  }
  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    useEditorStore.getState().setCanInstallPwa(false);
    return outcome === 'accepted';
  } catch (err) {
    console.error('PWA install error:', err);
    return false;
  }
}

/**
 * Apply waiting PWA update safely, guarding against data loss during active editing
 */
export function applyPwaUpdate(force = false): boolean {
  const store = useEditorStore.getState();

  // Safeguard: Never reload if autosave is currently writing or if user has active edits
  if (!force && store.autosaveStatus === 'saving') {
    store.showToast('Đang lưu thay đổi dự án, vui lòng thử lại sau vài giây!', 'warning');
    return false;
  }

  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }

  window.location.reload();
  return true;
}

