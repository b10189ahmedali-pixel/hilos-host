import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState } from "@/components/DataState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Settings {
  freeServerEnabled: boolean;
  defaultLimits: { ramMb: number; cpuPercent: number; diskMb: number; networkMbps: number };
}

export const Route = createFileRoute("/_authenticated/_admin/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [data, setData] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api<Settings>("/admin/settings")
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      await api("/admin/settings", { method: "PUT", body: JSON.stringify(data) });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><PageHeader title="Settings" /><LoadingState /></>;
  if (error || !data) return <><PageHeader title="Settings" /><ErrorState error={error ?? "No data"} onRetry={load} /></>;

  const updateLimit = (k: keyof Settings["defaultLimits"]) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData({ ...data, defaultLimits: { ...data.defaultLimits, [k]: Number(e.target.value) } });

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Global panel configuration and default limits."
        actions={
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        }
      />
      {savedAt && <div className="mb-4 text-sm text-primary">Saved.</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Free Servers</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="free-toggle">Enable free server creation</Label>
              <Switch
                id="free-toggle"
                checked={data.freeServerEnabled}
                onCheckedChange={(v) => setData({ ...data, freeServerEnabled: v })}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Default Limits</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs text-muted-foreground">RAM (MB)</Label><Input type="number" value={data.defaultLimits.ramMb} onChange={updateLimit("ramMb")} /></div>
            <div><Label className="text-xs text-muted-foreground">CPU (%)</Label><Input type="number" value={data.defaultLimits.cpuPercent} onChange={updateLimit("cpuPercent")} /></div>
            <div><Label className="text-xs text-muted-foreground">Disk (MB)</Label><Input type="number" value={data.defaultLimits.diskMb} onChange={updateLimit("diskMb")} /></div>
            <div><Label className="text-xs text-muted-foreground">Network (Mbps)</Label><Input type="number" value={data.defaultLimits.networkMbps} onChange={updateLimit("networkMbps")} /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
