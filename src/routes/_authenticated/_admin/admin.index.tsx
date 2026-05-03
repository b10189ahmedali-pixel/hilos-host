import { createFileRoute } from "@tanstack/react-router";
import { useList } from "@/lib/use-list";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Counted { id: string }

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const users = useList<Counted>("/admin/users");
  const servers = useList<Counted>("/admin/servers");
  const nodes = useList<Counted>("/nodes");

  const stats = [
    { label: "Total Users", q: users },
    { label: "Total Servers", q: servers },
    { label: "Nodes", q: nodes },
  ];

  return (
    <div>
      <PageHeader title="Admin Overview" description="System-wide statistics." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {s.q.loading ? "…" : s.q.error ? "—" : s.q.data?.length ?? 0}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
