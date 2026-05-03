import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useList } from "@/lib/use-list";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError, getToken } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eraser } from "lucide-react";

interface Server {
  id: string;
  name: string;
}

export const Route = createFileRoute("/_authenticated/console")({
  component: ConsolePage,
});

type Status = "idle" | "verifying" | "connecting" | "open" | "closed" | "error" | "denied";

const MAX_LINES = 1000;

function ConsolePage() {
  const { data: servers } = useList<Server>("/servers");
  const [serverId, setServerId] = useState<string>("");
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const prefKey = (id: string) => `hilos_console_prefs:${id}`;
  const [autoscroll, setAutoscrollRaw] = useState(true);
  const setAutoscroll = (v: boolean) => {
    setAutoscrollRaw(v);
    if (serverId && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(prefKey(serverId));
        const cur = raw ? JSON.parse(raw) : {};
        localStorage.setItem(prefKey(serverId), JSON.stringify({ ...cur, autoscroll: v }));
      } catch { /* noop */ }
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const shouldReconnect = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const append = useCallback((line: string) => {
    setLines((l) => {
      const next = l.length >= MAX_LINES ? l.slice(l.length - MAX_LINES + 1) : l;
      return [...next, line];
    });
  }, []);

  const teardown = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      try {
        wsRef.current.close();
      } catch { /* noop */ }
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    teardown();
    setLines([]);
    setStatusMsg("");

    if (!serverId) {
      setStatus("idle");
      return;
    }

    // Restore per-server prefs
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(prefKey(serverId));
        if (raw) {
          const p = JSON.parse(raw) as { autoscroll?: boolean };
          if (typeof p.autoscroll === "boolean") setAutoscrollRaw(p.autoscroll);
        }
      } catch { /* noop */ }
    }

    let cancelled = false;

    // Ownership / permission preflight: server must verify the JWT can read this server.
    setStatus("verifying");
    api<Server>(`/servers/${encodeURIComponent(serverId)}`)
      .then(() => {
        if (cancelled) return;
        shouldReconnect.current = true;
        connect();
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Cannot access this server";
        setStatus(e instanceof ApiError && (e.status === 401 || e.status === 403) ? "denied" : "error");
        setStatusMsg(msg);
        append(`[panel] ${msg}`);
      });

    function connect() {
      if (!shouldReconnect.current) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const base =
        (import.meta.env.VITE_WS_URL as string | undefined) ??
        `${proto}://${window.location.host}/ws`;
      const token = getToken();
      const url = `${base}/servers/${encodeURIComponent(serverId)}/console${
        token ? `?token=${encodeURIComponent(token)}` : ""
      }`;

      setStatus("connecting");
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        append(`[panel] Failed to open socket: ${err instanceof Error ? err.message : "unknown"}`);
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempt.current = 0;
        setStatus("open");
        setStatusMsg("");
        append(`[panel] Connected.`);
        // Heartbeat to keep proxies from idling out the connection.
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch { /* noop */ }
          }
        }, 25000);
      };

      ws.onmessage = (e) => {
        if (typeof e.data !== "string") {
          append("[binary frame]");
          return;
        }
        // Allow structured frames; fall back to raw text.
        if (e.data.startsWith("{")) {
          try {
            const msg = JSON.parse(e.data) as { type?: string; data?: string };
            if (msg.type === "pong") return;
            if (msg.type === "log" && typeof msg.data === "string") {
              append(msg.data);
              return;
            }
          } catch { /* fall through */ }
        }
        append(e.data);
      };

      ws.onerror = () => {
        if (status !== "denied") setStatus("error");
      };

      ws.onclose = (ev) => {
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current);
          heartbeatTimer.current = null;
        }
        // Auth failures should NOT reconnect.
        if (ev.code === 4401 || ev.code === 4403) {
          shouldReconnect.current = false;
          setStatus("denied");
          setStatusMsg("Access denied — check your session and ownership.");
          append(`[panel] Connection refused (${ev.code}).`);
          return;
        }
        setStatus("closed");
        if (shouldReconnect.current) scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      const attempt = reconnectAttempt.current;
      const base = Math.min(30000, 1000 * 2 ** attempt);
      const jitter = Math.random() * 500;
      const delay = base + jitter;
      reconnectAttempt.current = attempt + 1;
      append(`[panel] Reconnecting in ${Math.round(delay / 1000)}s…`);
      reconnectTimer.current = setTimeout(connect, delay);
    }

    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  useEffect(() => {
    if (!autoscroll) return;
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines, autoscroll]);

  const clearLogs = () => setLines([]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      append("[panel] Not connected — command not sent.");
      return;
    }
    try {
      wsRef.current.send(JSON.stringify({ type: "command", data: cmd }));
      append(`> ${cmd}`);
      setHistory((h) => (h[h.length - 1] === cmd ? h : [...h, cmd].slice(-100)));
      setHistoryIndex(-1);
      setInput("");
    } catch (err) {
      append(`[panel] Send failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(next);
        setInput(history[next]);
      }
    }
  };

  const variant: Record<Status, "default" | "secondary" | "destructive"> = {
    idle: "secondary",
    verifying: "secondary",
    connecting: "secondary",
    open: "default",
    closed: "secondary",
    error: "destructive",
    denied: "destructive",
  };

  const reconnectNow = () => {
    if (!serverId) return;
    reconnectAttempt.current = 0;
    setServerId((id) => id); // no-op; just trigger user-driven reconnect
    teardown();
    setLines([]);
    // Re-run effect by toggling state
    setStatus("verifying");
    shouldReconnect.current = true;
    api<Server>(`/servers/${encodeURIComponent(serverId)}`)
      .then(() => {
        // open new connection via effect by changing dummy dependency? simpler: open inline
        const proto = window.location.protocol === "https:" ? "wss" : "ws";
        const base =
          (import.meta.env.VITE_WS_URL as string | undefined) ??
          `${proto}://${window.location.host}/ws`;
        const token = getToken();
        const url = `${base}/servers/${encodeURIComponent(serverId)}/console${
          token ? `?token=${encodeURIComponent(token)}` : ""
        }`;
        setStatus("connecting");
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => { setStatus("open"); append("[panel] Connected."); };
        ws.onmessage = (e) => append(typeof e.data === "string" ? e.data : "[binary]");
        ws.onclose = () => setStatus("closed");
        ws.onerror = () => setStatus("error");
      })
      .catch((e) => {
        setStatus("error");
        setStatusMsg(e instanceof ApiError ? e.message : "Reconnect failed");
      });
  };

  return (
    <div>
      <PageHeader
        title="Console"
        description="Live server output streamed via WebSocket with auto-reconnect."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={variant[status]}>{status}</Badge>
            <div className="flex items-center gap-2 px-2">
              <Switch id="autoscroll" checked={autoscroll} onCheckedChange={setAutoscroll} />
              <Label htmlFor="autoscroll" className="text-xs cursor-pointer">Autoscroll</Label>
            </div>
            <Button size="sm" variant="outline" onClick={clearLogs} disabled={lines.length === 0} title="Clear logs">
              <Eraser className="h-4 w-4 mr-1" /> Clear
            </Button>
            {(status === "closed" || status === "error") && serverId && (
              <Button size="sm" variant="outline" onClick={reconnectNow}>
                Reconnect
              </Button>
            )}
            <Select value={serverId} onValueChange={setServerId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a server…" />
              </SelectTrigger>
              <SelectContent>
                {(servers ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      {statusMsg && status !== "open" && (
        <div className="mb-3 text-sm text-destructive">{statusMsg}</div>
      )}
      <Card>
        <CardContent className="p-0">
          <div
            ref={logRef}
            className="font-mono text-xs bg-[oklch(0.12_0.02_260)] text-[oklch(0.85_0.02_150)] p-4 h-[480px] overflow-auto rounded-t-md whitespace-pre-wrap"
          >
            {lines.length === 0 ? (
              <div className="opacity-60">
                {serverId ? "Waiting for output…" : "Select a server to begin streaming."}
              </div>
            ) : (
              lines.map((l, i) => <div key={i}>{l}</div>)
            )}
          </div>
          <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
            <Input
              placeholder={
                status === "open"
                  ? "Type a command and press Enter (↑/↓ for history)"
                  : status === "denied"
                  ? "Access denied"
                  : "Console offline"
              }
              className="font-mono"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={status !== "open"}
              autoComplete="off"
            />
            <Button type="submit" disabled={status !== "open" || !input.trim()}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
