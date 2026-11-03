const CHANNEL_NAME = 'noon-school-session-v1';
const STORAGE_SIGNAL_KEY = 'noon_school_session_signal_v1';
const LOCAL_EVENT_NAME = 'noon-school-session-changed';

/** Broadcast a non-identifying signal; receivers must re-check /api/accounts/me. */
export function broadcastSchoolSessionChange(): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(LOCAL_EVENT_NAME));

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'session-changed' });
      channel.close();
    }
  } catch {
    // The storage event below is a best-effort fallback.
  }

  try {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_SIGNAL_KEY, nonce);
  } catch {
    // Cross-tab notification is best effort; each tab also revalidates on focus.
  }
}

export function subscribeToSchoolSessionChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        if (event.data?.type === 'session-changed') onChange();
      };
    }
  } catch {
    channel = null;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_SIGNAL_KEY) onChange();
  };
  const onLocalEvent = () => onChange();
  window.addEventListener('storage', onStorage);
  window.addEventListener(LOCAL_EVENT_NAME, onLocalEvent);

  return () => {
    channel?.close();
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(LOCAL_EVENT_NAME, onLocalEvent);
  };
}
