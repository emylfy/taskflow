type Listener = (event: { type: string; payload: unknown }) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(room: string, listener: Listener): () => void {
  let set = listeners.get(room);
  if (!set) {
    set = new Set();
    listeners.set(room, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) listeners.delete(room);
  };
}

export function broadcast(room: string, event: { type: string; payload: unknown }): void {
  const set = listeners.get(room);
  if (!set) return;
  for (const l of set) {
    try {
      l(event);
    } catch {
      // silently drop listener failures
    }
  }
}
