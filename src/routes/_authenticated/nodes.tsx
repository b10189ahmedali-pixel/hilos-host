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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";

interface Node {
  id: string;
  name: string;
  fqdn: string;
  status: "online" | "offline" | string;
  cpu?: number;
  memory?: number;
  disk?: number;
  servers?: number;
}

export const Route = createFileRoute("/_authenticated/nodes")({
  component: NodesPage,
});

function NodesPage() {
  const { data, loading, error, reload } = useList<Node>("/nodes");
  const [open, setOpen] = useState(false);
  const [issuedToken, setIssuedToken] = useState<{ id: string; token: string; installCmd?: string } | null>(null);

  return (
    <div>
      <PageHeader
        title="Nodes"
        description="VPS daemons connected to the panel."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setIssuedToken(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Register Node</Button>
            </DialogTrigger>
            {issuedToken ? (
              <TokenView token={issuedToken} onClose={() => { setOpen(false); setIssuedToken(null); reload(); }} />
            ) : (
              <RegisterForm onCreated={(t) => setIssuedToken(t)} />
            )}
          </Dialog>
        }
      />

      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState message="No nodes registered. Click Register Node to create one." />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {(data ?? []).map((n) => (
          <Card key={n.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{n.name}</div>
                  <div className="text-xs text-muted-foreground">{n.fqdn}</div>
                </div>
                <Badge variant={n.status === "online" ? "default" : "secondary"}>{n.status}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4 text-xs text-muted-foreground">
                <div><div className="text-foreground font-semibold">{n.cpu ?? "—"}%</div>CPU</div>
                <div><div className="text-foreground font-semibold">{n.memory ?? "—"}%</div>RAM</div>
                <div><div className="text-foreground font-semibold">{n.disk ?? "—"}%</div>Disk</div>
                <div><div className="text-foreground font-semibold">{n.servers ?? 0}</div>Servers</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RegisterForm({ onCreated }: { onCreated: (t: { id: string; token: string; installCmd?: string }) => void }) {
  const [form, setForm] = useState({ name: "", fqdn: "", port: "8080" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await api<{ id: string; token: string; installCmd?: string }>("/nodes", {
        method: "POST",
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      });
      onCreated(res);
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Failed to create node");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Register a new node</DialogTitle>
        <DialogDescription>The token will be displayed once. Copy it before closing this dialog.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" required value={form.name} onChange={update("name")} placeholder="eu-west-1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fqdn">FQDN / IP</Label>
          <Input id="fqdn" required value={form.fqdn} onChange={update("fqdn")} placeholder="node1.example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="port">Daemon port</Label>
          <Input id="port" type="number" required value={form.port} onChange={update("port")} />
        </div>
        {err && <div className="text-sm text-destructive">{err}</div>}
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create node
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function TokenView({
  token,
  onClose,
}: {
  token: { id: string; token: string; installCmd?: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" /> Save your node token
        </DialogTitle>
        <DialogDescription>
          This token is shown only once. Store it securely — you cannot retrieve it again.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Node Token</Label>
          <div className="mt-1 flex gap-2">
            <code className="flex-1 bg-muted rounded p-2 font-mono text-xs break-all">{token.token}</code>
            <Button size="icon" variant="outline" onClick={() => copy(token.token, "token")}>
              {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {token.installCmd && (
          <div>
            <Label className="text-xs">Install command (run on the VPS as root)</Label>
            <div className="mt-1 flex gap-2">
              <code className="flex-1 bg-muted rounded p-2 font-mono text-xs break-all">{token.installCmd}</code>
              <Button size="icon" variant="outline" onClick={() => copy(token.installCmd!, "cmd")}>
                {copied === "cmd" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={onClose}>I've saved it</Button>
      </DialogFooter>
    </DialogContent>
  );
}
