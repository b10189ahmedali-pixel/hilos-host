import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/admin/eggs")({
  component: AdminEggs,
});

function AdminEggs() {
  return (
    <div>
      <PageHeader
        title="Eggs"
        description="Server templates: startup commands, docker images, environment variables, and ports."
        actions={<Button><Upload className="h-4 w-4 mr-2" />Upload Egg JSON</Button>}
      />
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          No eggs defined. Upload a JSON definition or create one via the API.
        </CardContent>
      </Card>
    </div>
  );
}
