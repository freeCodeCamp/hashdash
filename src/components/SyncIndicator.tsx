import { useState, useEffect, useRef, useCallback } from "preact/hooks";

type SyncStatus = "idle" | "running" | "completed" | "failed";

const MAX_RECONNECT_DELAY = 30000;

const STATUS_STYLES: Record<
  SyncStatus,
  { class: string; title: string } | null
> = {
  idle: null,
  running: {
    class: "bg-yellow-500 animate-pulse",
    title: "Syncing in progress",
  },
  completed: { class: "bg-green-500", title: "Last sync completed" },
  failed: { class: "bg-red-500", title: "Last sync failed" },
};

export default function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const ws = wsRef.current;
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    if (ws) ws.close();

    const proto = location.protocol === "https:" ? "wss://" : "ws://";
    const socket = new WebSocket(`${proto}${location.host}/api/reindex/ws`);
    wsRef.current = socket;

    socket.addEventListener("open", () => {
      attemptRef.current = 0;
    });

    socket.addEventListener("message", (evt) => {
      try {
        const data = JSON.parse(evt.data as string) as { status?: string };
        if (data.status) {
          setStatus(data.status as SyncStatus);
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.addEventListener("close", (evt) => {
      if (wsRef.current === socket) wsRef.current = null;
      if (evt.code !== 1000) {
        const delay = Math.min(
          1000 * Math.pow(2, attemptRef.current),
          MAX_RECONNECT_DELAY,
        );
        attemptRef.current++;
        timerRef.current = setTimeout(connect, delay);
      }
    });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [connect]);

  const style = STATUS_STYLES[status];
  if (!style) return null;

  return (
    <span class={`h-2 w-2 rounded-full ${style.class}`} title={style.title} />
  );
}
