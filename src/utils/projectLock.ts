// Web Locks API + BroadcastChannel to prevent simultaneous editing of the same project in multiple tabs
export interface ProjectLockHandle {
  isReadOnly: boolean;
  release: () => void;
}

export async function acquireProjectLock(
  projectId: string,
  onStatusChange?: (isReadOnly: boolean) => void
): Promise<ProjectLockHandle> {
  const channelName = `clipforge_project_lock_${projectId}`;
  let channel: BroadcastChannel | null = null;
  let isReadOnly = false;
  let lockReleaseCallback: (() => void) | null = null;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (e) => {
        if (e.data?.type === 'PING_PRIMARY') {
          // If this tab holds the active lock, acknowledge to newcomers
          if (!isReadOnly) {
            channel?.postMessage({ type: 'ACK_PRIMARY_ACTIVE', projectId });
          }
        }
      };
    }
  } catch (err) {
    console.warn('BroadcastChannel initialization error:', err);
  }

  // 1. Try Web Locks API if supported
  if (typeof navigator !== 'undefined' && 'locks' in navigator && (navigator as any).locks?.request) {
    const lockPromise = new Promise<ProjectLockHandle>((resolve) => {
      (navigator as any).locks.request(
        `clipforge_lock_${projectId}`,
        { ifAvailable: true },
        async (lock: any) => {
          if (!lock) {
            // Lock is held by another active tab!
            isReadOnly = true;
            onStatusChange?.(true);
            resolve({
              isReadOnly: true,
              release: () => {
                channel?.close();
              }
            });
            return;
          }

          // Lock granted: This tab is the primary writer!
          isReadOnly = false;
          onStatusChange?.(false);

          // Keep lock alive until release() is called
          const releasePromise = new Promise<void>((rel) => {
            lockReleaseCallback = rel;
          });

          resolve({
            isReadOnly: false,
            release: () => {
              if (lockReleaseCallback) {
                lockReleaseCallback();
                lockReleaseCallback = null;
              }
              channel?.close();
            }
          });

          await releasePromise;
        }
      );
    });

    return lockPromise;
  }

  // 2. Fallback using BroadcastChannel heartbeat if Web Locks API is unavailable
  if (channel) {
    const isLocked = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false); // No other tab answered in 150ms -> safe to edit
      }, 150);

      channel!.onmessage = (e) => {
        if (e.data?.type === 'ACK_PRIMARY_ACTIVE') {
          clearTimeout(timeout);
          resolve(true); // Another tab is active!
        }
      };

      channel!.postMessage({ type: 'PING_PRIMARY', projectId });
    });

    isReadOnly = isLocked;
    onStatusChange?.(isLocked);

    return {
      isReadOnly,
      release: () => {
        channel?.close();
      }
    };
  }

  return {
    isReadOnly: false,
    release: () => {}
  };
}

