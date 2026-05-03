import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/servers")({
  component: ServersPage,
});

function ServersPage() {
  return (
    <div>
      <PageHeader
        title="My Servers"
        description="Manage your servers, start, stop, restart and view consoles."
        actions={<Button><Plus className="h-4 w-4 mr-2" />Create Server</Button>}
      />
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          No servers yet. Connect the backend API to populate this list.
        </CardContent>
      </Card>
    </div>
  );
}
