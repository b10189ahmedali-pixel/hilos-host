import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div>
      <PageHeader title="Settings" description="Global panel configuration and default limits." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Free Servers</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="free-toggle">Enable free server creation</Label>
              <Switch id="free-toggle" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Default Limits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs text-muted-foreground">RAM (MB)</Label><Input type="number" /></div>
              <div><Label className="text-xs text-muted-foreground">CPU (%)</Label><Input type="number" /></div>
              <div><Label className="text-xs text-muted-foreground">Disk (MB)</Label><Input type="number" /></div>
              <div><Label className="text-xs text-muted-foreground">Network (Mbps)</Label><Input type="number" /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
