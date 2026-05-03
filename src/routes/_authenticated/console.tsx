import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useList } from "@/lib/use-list";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getToken } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface Server { id: string; name: string }

export const Route = createFileRoute("/_authenticated/console")({
  component: ConsolePage,
});

type Status = "connecting" | "open" | "closed" | "error";

function ConsolePage() {
  const { data: servers } = useList<Server>("/servers");
  const [serverId, setServerId] = useState<string>("");
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("closed");
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const shouldReconnect = useRef(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!serverId) return;
    shouldReconnect.current = true;
    setLines([]);

    const connect = () => {
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

      ws.onopen = () => {
        reconnectAttempt.current = 0;
        setStatus("open");
        setLines((l) => [...l, `[panel] Connected to ${serverId}`]);
      };
      ws.onmessage = (e) => {
        setLines((l) => [...l.slice(-999), typeof e.data === "string" ? e.data : "[binary]"]);
      };
      ws.onerror = () => setStatus("error");
      ws.onclose = () => {
        setStatus("closed");
        if (shouldReconnect.current) {
          const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt.current);
          reconnectAttempt.current += 1;
          setLines((l) => [...l, `[panel] Reconnecting in ${Math.round(delay / 1000)}s…`]);
          setTimeout(connect, delay);
        }
      };
    };

    connect();
    return () => {
      shouldReconnect.current = false;
      wsRef.current?.close();
    };
  }, [serverId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "command", data: input }));
    setLines((l) => [...l, `> ${input}`]);
    setInput("");
  };

  const statusVariant: Record<Status, "default" | "secondary" | "destructive"> = {
    open: "default",
    connecting: "secondary",
    closed: "secondary",
    error: "destructive",
  };

  return (
    <div>
      <PageHeader
        title="Console"
        description="Live server output streamed via WebSocket with auto-reconnect."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[status]}>{status}</Badge>
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
          <form onSubmit={send} className="p-3 border-t border-border">
            <Input
              placeholder={status === "open" ? "Type a command and press Enter…" : "Console offline"}
              className="font-mono"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status !== "open"}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
