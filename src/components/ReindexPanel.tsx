import { useState, useEffect, useRef, useCallback } from "preact/hooks";

interface IndexerState {
  status: "idle" | "running" | "completed" | "failed";
  phase: "posts" | "drafts" | "purge-posts" | "purge-drafts";
  processed: number;
  total: number;
  postsTotal: number;
  postsSynced: number;
  draftsTotal: number;
  draftsSynced: number;
  purged: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  warning: string | null;
}

type ConnectionStatus = "connecting" | "connected" | "reconnecting";

const PHASE_LABELS: Record<string, string> = {
  posts: "Syncing published posts",
  drafts: "Syncing drafts",
  "purge-posts": "Removing stale posts",
  "purge-drafts": "Removing stale drafts",
};

const MAX_RECONNECT_DELAY = 30000;

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(sec: number): string {
  if (sec < 0) return "\u2014";
  sec = Math.floor(sec);
  if (sec < 60) return `${sec}s`;
  let min = Math.floor(sec / 60);
  sec = sec % 60;
  if (min < 60) return `${min}m ${sec}s`;
  const hr = Math.floor(min / 60);
  min = min % 60;
  return `${hr}h ${min}m ${sec}s`;
}

function getElapsedSec(startIso: string | null, endIso: string | null): number {
  if (!startIso) return -1;
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  return (end - start) / 1000;
}

function estimateEta(s: IndexerState): string {
  if (s.status !== "running" || !s.startedAt) return "\u2014";
  const elapsedMs = Date.now() - new Date(s.startedAt).getTime();
  if (elapsedMs < 3000) return "calculating\u2026";
  const done = (s.postsSynced || 0) + (s.draftsSynced || 0);
  const total = (s.postsTotal || 0) + (s.draftsTotal || 0);
  if (done === 0 || total === 0) return "calculating\u2026";
  const rate = done / (elapsedMs / 1000);
  const remaining = total - done;
  if (remaining <= 0) return "finishing\u2026";
  return `~${formatDuration(remaining / rate)}`;
}

export default function ReindexPanel() {
  const [state, setState] = useState<IndexerState>({
    status: "idle",
    phase: "posts",
    processed: 0,
    total: 0,
    postsTotal: 0,
    postsSynced: 0,
    draftsTotal: 0,
    draftsSynced: 0,
    purged: 0,
    startedAt: null,
    completedAt: null,
    error: null,
    warning: null,
  });
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("connecting");
  const [elapsed, setElapsed] = useState("\u2014");
  const [eta, setEta] = useState("\u2014");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

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

    setConnStatus("connecting");
    const proto = location.protocol === "https:" ? "wss://" : "ws://";
    const socket = new WebSocket(`${proto}${location.host}/api/reindex/ws`);
    wsRef.current = socket;

    socket.addEventListener("open", () => {
      reconnectAttemptRef.current = 0;
      setConnStatus("connected");
    });

    socket.addEventListener("message", (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === "status") {
        setState({
          status: data.status,
          phase: data.phase,
          processed: data.processed,
          total: data.total,
          postsTotal: data.postsTotal,
          postsSynced: data.postsSynced,
          draftsTotal: data.draftsTotal,
          draftsSynced: data.draftsSynced,
          purged: data.purged,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          error: data.error,
          warning: data.warning,
        });
      }
    });

    socket.addEventListener("close", (evt) => {
      if (wsRef.current === socket) wsRef.current = null;
      if (evt.code !== 1000) {
        setConnStatus("reconnecting");
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptRef.current),
          MAX_RECONNECT_DELAY,
        );
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    if (state.status !== "running") {
      setElapsed(
        formatDuration(getElapsedSec(state.startedAt, state.completedAt)),
      );
      setEta("\u2014");
      return;
    }
    const tick = () => {
      const s = stateRef.current;
      setElapsed(formatDuration(getElapsedSec(s.startedAt, s.completedAt)));
      setEta(estimateEta(s));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.status, state.startedAt, state.completedAt]);

  const handleAction = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (state.status === "running") {
      ws.send(JSON.stringify({ action: "cancel" }));
    } else {
      ws.send(JSON.stringify({ action: "start" }));
    }
  };

  const phaseLabel = PHASE_LABELS[state.phase] || state.phase || "\u2014";
  const pct =
    state.status === "completed"
      ? 100
      : state.total > 0
        ? Math.round((state.processed / state.total) * 100)
        : 0;

  const btnDisabled = connStatus !== "connected" || state.status === "running";
  const stopDisabled = connStatus !== "connected";

  const hasLastRun = state.startedAt !== null;

  return (
    <>
      <div class="mb-6">
        <h1 class="text-2xl font-bold">Sync Index</h1>
        <p class="mt-1 text-sm text-gray-400">
          Fetches all published posts and drafts from Hashnode and updates the
          local search index. Other pages remain fully usable while syncing.
        </p>
      </div>

      {/* Alerts — show above everything */}
      {state.error && state.status === "failed" && (
        <div class="mb-4 border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
          <span class="font-medium">Sync failed</span> — {state.error}
        </div>
      )}

      {state.warning && (
        <div class="mb-4 border border-yellow-800 bg-yellow-900/30 p-4 text-sm text-yellow-300">
          {state.warning}
        </div>
      )}

      {state.status === "completed" && (
        <div class="mb-4 border border-green-800 bg-green-900/30 p-4 text-sm text-green-300">
          <span class="font-medium">Sync complete</span>
          {" \u2014 "}
          {[
            state.postsSynced > 0 &&
              `${state.postsSynced.toLocaleString()} posts`,
            state.draftsSynced > 0 &&
              `${state.draftsSynced.toLocaleString()} drafts`,
            state.purged > 0 &&
              `${state.purged.toLocaleString()} stale removed`,
          ]
            .filter(Boolean)
            .join(", ")}
          {` in ${formatDuration(getElapsedSec(state.startedAt, state.completedAt))}`}
        </div>
      )}

      {/* Running view — progress front and center */}
      {state.status === "running" && (
        <div class="mb-6 border border-gray-700 bg-gray-900 p-5">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-sm font-medium text-blue-300">
              {phaseLabel}
              {state.total > 0
                ? ` (${state.processed.toLocaleString()} of ${state.total.toLocaleString()})`
                : "\u2026"}
            </span>
            <span class="text-sm text-gray-500">
              {state.total > 0 ? `${pct}%` : ""}
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-gray-700">
            <div
              class="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div class="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <div class="text-gray-500">Posts</div>
              <div>
                {state.postsSynced > 0 || state.postsTotal > 0
                  ? `${state.postsSynced.toLocaleString()} / ${state.postsTotal.toLocaleString()}`
                  : "Waiting\u2026"}
              </div>
            </div>
            <div>
              <div class="text-gray-500">Drafts</div>
              <div>
                {state.draftsSynced > 0 || state.draftsTotal > 0
                  ? `${state.draftsSynced.toLocaleString()} / ${state.draftsTotal.toLocaleString()}`
                  : "Waiting\u2026"}
              </div>
            </div>
            <div>
              <div class="text-gray-500">Elapsed</div>
              <div>{elapsed}</div>
            </div>
            <div>
              <div class="text-gray-500">ETA</div>
              <div>{eta}</div>
            </div>
          </div>

          <div class="mt-4 border-t border-gray-700 pt-4">
            <button
              type="button"
              disabled={stopDisabled}
              onClick={handleAction}
              class={
                stopDisabled
                  ? "cursor-not-allowed border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-500"
                  : "border border-red-600 bg-red-900/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/50"
              }
            >
              Stop Syncing
            </button>
          </div>
        </div>
      )}

      {/* Idle / completed / failed — show action + last run info */}
      {state.status !== "running" && (
        <div class="mb-6 border border-gray-700 bg-gray-900 p-5">
          <div class="flex items-center gap-4">
            <button
              type="button"
              disabled={btnDisabled}
              onClick={handleAction}
              class={
                btnDisabled
                  ? "cursor-not-allowed border border-gray-600 bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-500"
                  : "border border-blue-600 bg-blue-600/20 px-5 py-2.5 text-sm font-medium text-blue-300 hover:bg-blue-600/30"
              }
            >
              {connStatus === "connecting"
                ? "Connecting\u2026"
                : connStatus === "reconnecting"
                  ? "Reconnecting\u2026"
                  : "Sync Now"}
            </button>
            {connStatus === "connected" && (
              <span class="text-sm text-gray-500">
                Fetches all content from Hashnode and rebuilds the local index.
              </span>
            )}
          </div>

          {hasLastRun && (
            <div class="mt-4 border-t border-gray-700 pt-4">
              <div class="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Last sync
              </div>
              <div class="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <div class="text-gray-500">Status</div>
                  <div
                    class={
                      state.status === "completed"
                        ? "text-green-400"
                        : state.status === "failed"
                          ? "text-red-400"
                          : "text-gray-300"
                    }
                  >
                    {state.status === "completed"
                      ? "Completed"
                      : state.status === "failed"
                        ? "Failed"
                        : "Idle"}
                  </div>
                </div>
                <div>
                  <div class="text-gray-500">Started</div>
                  <div>{formatDate(state.startedAt)}</div>
                </div>
                <div>
                  <div class="text-gray-500">Duration</div>
                  <div>{elapsed}</div>
                </div>
                <div>
                  <div class="text-gray-500">
                    {state.status === "completed"
                      ? "Items synced"
                      : "Completed"}
                  </div>
                  <div>
                    {state.status === "completed"
                      ? (
                          (state.postsSynced || 0) + (state.draftsSynced || 0)
                        ).toLocaleString()
                      : formatDate(state.completedAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
