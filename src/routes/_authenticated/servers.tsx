import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useList } from "@/lib/use-list";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Square, RotateCw, Trash2, Search, Loader2, Sparkles, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Server {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "stopping" | "error" | string;
  cpu?: number;
  memory?: number;
  uptime?: string;
}

interface Settings {
  freeServerEnabled: boolean;
  defaultLimits: { ramMb: number; cpuPercent: number; diskMb: number; networkMbps: number };
}

type Action = "start" | "stop" | "restart" | "kill" | "delete";

export const Route = createFileRoute("/_authenticated/servers")({
  component: ServersPage,
});

function ServersPage() {
  const { data, loading, error, reload } = useList<Server>("/servers");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<Record<string, Action | undefined>>({});
  const [actionErr, setActionErr] = useState<string | null>(null);

  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    api<Settings>("/settings/public")
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  const action = async (id: string, op: Action) => {
    setBusy((b) => ({ ...b, [id]: op }));
    setActionErr(null);
    try {
      if (op === "delete") {
        await api(`/servers/${id}`, { method: "DELETE" });
      } else {
        await api(`/servers/${id}/${op}`, { method: "POST" });
      }
      await reload();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy((b) => {
        const { [id]: _drop, ...rest } = b;
        return rest;
      });
    }
  };

  const filtered = data?.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) ?? [];

  return (
    <div>
      <PageHeader
        title="My Servers"
        description="Start, stop, restart, and manage your servers."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="pl-8 w-64"
              />
            </div>
            <CreateServerDialog onCreated={reload} />
            {settings?.freeServerEnabled && (
              <CreateFreeServerButton limits={settings.defaultLimits} onCreated={reload} />
            )}
          </div>
        }
      />

      {actionErr && <div className="mb-4 text-sm text-destructive">{actionErr}</div>}

      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState message={q ? "No servers match your search." : "No servers yet."} />
      )}

      <div className="grid gap-3">
        {filtered.map((s) => {
          const op = busy[s.id];
          const isBusy = !!op;
          return (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant={s.status === "running" ? "default" : "secondary"}>
                      {s.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    CPU {s.cpu ?? "—"}% · RAM {s.memory ?? "—"}MB · Uptime {s.uptime ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ActionButton
                    title="Start"
                    icon={<Play className="h-4 w-4" />}
                    loading={op === "start"}
                    disabled={isBusy || s.status === "running" || s.status === "starting"}
                    onClick={() => action(s.id, "start")}
                  />
                  <ActionButton
                    title="Stop"
                    icon={<Square className="h-4 w-4" />}
                    loading={op === "stop"}
                    disabled={isBusy || s.status === "stopped" || s.status === "stopping"}
                    onClick={() => action(s.id, "stop")}
                  />
                  <ActionButton
                    title="Restart"
                    icon={<RotateCw className="h-4 w-4" />}
                    loading={op === "restart"}
                    disabled={isBusy}
                    onClick={() => action(s.id, "restart")}
                  />
                  <ActionButton
                    title="Delete"
                    icon={<Trash2 className="h-4 w-4" />}
                    variant="destructive"
                    loading={op === "delete"}
                    disabled={isBusy}
                    onClick={() => action(s.id, "delete")}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ActionButton({
  title,
  icon,
  loading,
  disabled,
  variant = "outline",
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: "outline" | "destructive";
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant={variant} title={title} disabled={disabled} onClick={onClick}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    </Button>
  );
}

function CreateFreeServerButton({
  limits,
  onCreated,
}: {
  limits: Settings["defaultLimits"];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) {
      setErr("Server name is required.");
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      await api("/servers/free", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setOpen(false);
      setName("");
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create free server");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4 mr-2" />
        Create Free Server
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a free server</DialogTitle>
          <DialogDescription>
            A server will be created using the admin's default free-tier limits.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm">Server name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-free-server"
              disabled={creating}
            />
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs grid grid-cols-2 gap-2">
            <Limit label="RAM" value={`${limits.ramMb} MB`} />
            <Limit label="CPU" value={`${limits.cpuPercent}%`} />
            <Limit label="Disk" value={`${limits.diskMb} MB`} />
            <Limit label="Network" value={`${limits.networkMbps} Mbps`} />
          </div>
          {err && <div className="text-sm text-destructive">{err}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={create} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}

interface Egg {
  id: string;
  name: string;
  dockerImage?: string;
  description?: string;
  ports?: number[];
}
interface Node {
  id: string;
  name: string;
  fqdn?: string;
}

function CreateServerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [eggId, setEggId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [eggs, setEggs] = useState<Egg[] | null>(null);
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadErr(null);
    Promise.all([
      api<Egg[]>("/eggs").catch(() => api<Egg[]>("/admin/eggs")),
      api<Node[]>("/nodes"),
      api<Settings>("/settings/public").catch(() => null),
    ])
      .then(([e, n, s]) => {
        setEggs(e ?? []);
        setNodes(n ?? []);
        setSettings(s);
      })
      .catch((e) => setLoadErr(e instanceof ApiError ? e.message : "Failed to load options"));
  }, [open]);

  const selectedEgg = eggs?.find((e) => e.id === eggId);
  const limits = settings?.defaultLimits;

  const create = async () => {
    if (!name.trim() || !eggId || !nodeId) {
      setErr("Name, egg, and node are required.");
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      await api("/servers", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), eggId, nodeId }),
      });
      setOpen(false);
      setName("");
      setEggId("");
      setNodeId("");
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create server");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> New Server
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new server</DialogTitle>
          <DialogDescription>
            Pick an egg and node, then review the effective resource limits before deploying.
          </DialogDescription>
        </DialogHeader>
        {loadErr && <div className="text-sm text-destructive">{loadErr}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-sm">Server name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-server" disabled={creating} />
          </div>
          <div>
            <label className="text-sm">Egg (template)</label>
            <Select value={eggId} onValueChange={setEggId}>
              <SelectTrigger><SelectValue placeholder={eggs ? "Select an egg…" : "Loading eggs…"} /></SelectTrigger>
              <SelectContent>
                {(eggs ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEgg && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedEgg.dockerImage} · ports: {(selectedEgg.ports ?? []).join(", ") || "—"}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm">Node</label>
            <Select value={nodeId} onValueChange={setNodeId}>
              <SelectTrigger><SelectValue placeholder={nodes ? "Select a node…" : "Loading nodes…"} /></SelectTrigger>
              <SelectContent>
                {(nodes ?? []).map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}{n.fqdn ? ` (${n.fqdn})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {limits && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <div className="font-medium mb-2 text-foreground">Effective resource limits</div>
              <div className="grid grid-cols-2 gap-2">
                <Limit label="RAM" value={`${limits.ramMb} MB`} />
                <Limit label="CPU" value={`${limits.cpuPercent}%`} />
                <Limit label="Disk" value={`${limits.diskMb} MB`} />
                <Limit label="Network" value={`${limits.networkMbps} Mbps`} />
              </div>
            </div>
          )}
          {err && <div className="text-sm text-destructive">{err}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>Cancel</Button>
          <Button onClick={create} disabled={creating || !eggId || !nodeId || !name.trim()}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

