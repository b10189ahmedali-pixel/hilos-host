import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/nodes")({
  component: NodesPage,
});

function NodesPage() {
  return (
    <div>
      <PageHeader
        title="Nodes"
        description="VPS daemons connected to the panel. Tokens are shown only on creation."
        actions={<Button><Plus className="h-4 w-4 mr-2" />Register Node</Button>}
      />
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          No nodes connected. Run the install script on a VPS to register one.
        </CardContent>
      </Card>
    </div>
  );
}
