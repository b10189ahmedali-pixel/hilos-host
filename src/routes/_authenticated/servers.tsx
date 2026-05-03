import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useList } from "@/lib/use-list";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Play, Square, RotateCw, Trash2, Search } from "lucide-react";

interface Server {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "error" | string;
  cpu?: number;
  memory?: number;
  uptime?: string;
}

export const Route = createFileRoute("/_authenticated/servers")({
  component: ServersPage,
});

function ServersPage() {
  const { data, loading, error, reload } = useList<Server>("/servers");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const action = async (id: string, op: "start" | "stop" | "restart" | "kill" | "delete") => {
    setBusy(`${id}:${op}`);
    setActionErr(null);
    try {
      if (op === "delete") {
        await api(`/servers/${id}`, { method: "DELETE" });
      } else {
        await api(`/servers/${id}/${op}`, { method: "POST" });
      }
      reload();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const filtered = data?.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) ?? [];

  return (
    <div>
      <PageHeader
        title="My Servers"
        description="Start, stop, restart, and manage your servers."
        actions={
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8 w-64" />
          </div>
        }
      />

      {actionErr && <div className="mb-4 text-sm text-destructive">{actionErr}</div>}

      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && filtered.length === 0 && <EmptyState message="No servers found." />}

      <div className="grid gap-3">
        {filtered.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant={s.status === "running" ? "default" : "secondary"}>{s.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  CPU {s.cpu ?? "—"}% · RAM {s.memory ?? "—"}MB · Uptime {s.uptime ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => action(s.id, "start")}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => action(s.id, "stop")}>
                  <Square className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => action(s.id, "restart")}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => action(s.id, "delete")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
