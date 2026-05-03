import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useList } from "@/lib/use-list";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { Loader2, RefreshCw, FolderTree } from "lucide-react";

interface ServerPaths {
  id: string;
  name: string;
  folder?: string;
  startScript?: string;
  os?: "windows" | "linux" | string;
}

export const Route = createFileRoute("/_authenticated/_admin/admin/scripts")({
  component: AdminScriptsPage,
});

function AdminScriptsPage() {
  const { data, loading, error, reload } = useList<ServerPaths>("/admin/servers/paths");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const regenerate = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    setActionErr(null);
    setOkMsg(null);
    try {
      await api(`/admin/servers/${encodeURIComponent(id)}/regenerate-scripts`, {
        method: "POST",
      });
      setOkMsg(`Regenerated start scripts for ${id}.`);
      await reload();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Failed to regenerate scripts");
    } finally {
      setBusy((b) => {
        const { [id]: _drop, ...rest } = b;
        return rest;
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Server Scripts"
        description="Per-server folder paths and generated start.bat / start.sh locations."
        actions={
          <Button variant="outline" onClick={reload} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        }
      />

      {actionErr && <div className="mb-4 text-sm text-destructive">{actionErr}</div>}
      {okMsg && <div className="mb-4 text-sm text-emerald-500">{okMsg}</div>}

      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState message="No servers yet." />
      )}

      <div className="grid gap-3">
        {(data ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="secondary">{s.os ?? "auto"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono break-all">
                  <div>
                    <span className="text-foreground">Folder:</span> {s.folder ?? "—"}
                  </div>
                  <div>
                    <span className="text-foreground">Start script:</span>{" "}
                    {s.startScript ?? "—"}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!!busy[s.id]}
                onClick={() => regenerate(s.id)}
              >
                {busy[s.id] ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Regenerate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
