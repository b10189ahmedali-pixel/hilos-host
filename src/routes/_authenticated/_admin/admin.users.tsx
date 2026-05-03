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
import { Search, Trash2, Ban, ShieldCheck } from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "user";
  suspended?: boolean;
}

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { data, loading, error, reload } = useList<AdminUser>("/admin/users");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const act = async (id: string, op: "suspend" | "unsuspend" | "delete") => {
    setBusy(`${id}:${op}`);
    setActionErr(null);
    try {
      if (op === "delete") await api(`/admin/users/${id}`, { method: "DELETE" });
      else await api(`/admin/users/${id}/${op}`, { method: "POST" });
      reload();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const filtered = (data ?? []).filter(
    (u) =>
      u.username.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Users"
        description="View, suspend, or delete user accounts."
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
      {!loading && !error && filtered.length === 0 && <EmptyState message="No users found." />}

      <div className="grid gap-2">
        {filtered.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.username}</span>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                  {u.suspended && <Badge variant="destructive">suspended</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.email}
                  {(u.firstName || u.lastName) && ` · ${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.suspended ? (
                  <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => act(u.id, "unsuspend")}>
                    <ShieldCheck className="h-4 w-4 mr-1" />Unsuspend
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => act(u.id, "suspend")}>
                    <Ban className="h-4 w-4 mr-1" />Suspend
                  </Button>
                )}
                <Button size="sm" variant="destructive" disabled={busy !== null} onClick={() => act(u.id, "delete")}>
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
