import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useList } from "@/lib/use-list";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

interface Server { id: string; name: string; status: string }
interface Node { id: string; name: string; status: string }

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Stat({ title, value, loading, error }: { title: string; value: string | number; loading: boolean; error: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-semibold flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : error ? (
          <span className="text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" /> Error
          </span>
        ) : (
          value
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const auth = useAuth();
  const servers = useList<Server>("/servers");
  const nodes = useList<Node>("/nodes");

  return (
    <div>
      <PageHeader title={`Welcome, ${auth.user?.firstName || auth.user?.username}`} description="Overview of your account." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat title="My Servers" value={servers.data?.length ?? 0} loading={servers.loading} error={servers.error} />
        <Stat
          title="Active Servers"
          value={servers.data?.filter((s) => s.status === "running").length ?? 0}
          loading={servers.loading}
          error={servers.error}
        />
        <Stat title="Connected Nodes" value={nodes.data?.length ?? 0} loading={nodes.loading} error={nodes.error} />
      </div>
    </div>
  );
}
