import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useList } from "@/lib/use-list";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, AlertCircle } from "lucide-react";
import { validateEgg } from "@/lib/egg-validator";

interface Egg {
  id: string;
  name: string;
  description?: string;
  dockerImage?: string;
  startup?: string;
  ports?: number[];
}

export const Route = createFileRoute("/_authenticated/_admin/admin/eggs")({
  component: AdminEggs,
});

function AdminEggs() {
  const { data, loading, error, reload } = useList<Egg>("/admin/eggs");
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setErrors([]);
    setInfo(null);

    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setErrors([`File must be a .json file (got "${file.name}").`]);
      return;
    }
    if (file.size > 256 * 1024) {
      setErrors([`Egg JSON is too large (max 256KB).`]);
      return;
    }

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (e) {
      setErrors([`Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`]);
      return;
    }

    const result = validateEgg(parsed);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setUploading(true);
    try {
      await api("/admin/eggs", { method: "POST", body: JSON.stringify(result.egg) });
      setInfo(`Egg "${result.egg.name}" uploaded successfully.`);
      reload();
    } catch (e) {
      setErrors([e instanceof ApiError ? e.message : "Upload failed"]);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    setErrors([]);
    try {
      await api(`/admin/eggs/${id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      setErrors([e instanceof ApiError ? e.message : "Delete failed"]);
    }
  };

  return (
    <div>
      <PageHeader
        title="Eggs"
        description="Server templates: docker image, startup command, env vars, and required ports."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading…" : "Upload Egg JSON"}
            </Button>
          </>
        }
      />

      {info && (
        <div className="mb-4 text-sm rounded-md border border-primary/40 bg-primary/10 p-3 text-primary">
          {info}
        </div>
      )}
      {errors.length > 0 && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3">
          <div className="flex items-center gap-2 text-sm text-destructive font-medium">
            <AlertCircle className="h-4 w-4" /> Egg validation failed
          </div>
          <ul className="mt-2 text-sm text-destructive/90 list-disc pl-5 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && <EmptyState message="No eggs uploaded yet." />}

      <div className="grid gap-2">
        {(data ?? []).map((egg) => (
          <Card key={egg.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium">{egg.name}</div>
                {egg.description && (
                  <div className="text-xs text-muted-foreground">{egg.description}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
                  {egg.dockerImage}
                </div>
                {egg.ports && egg.ports.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Ports: {egg.ports.join(", ")}
                  </div>
                )}
              </div>
              <Button size="sm" variant="destructive" onClick={() => remove(egg.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 text-xs text-muted-foreground">
        <details>
          <summary className="cursor-pointer hover:text-foreground">Egg JSON format</summary>
          <pre className="mt-2 p-3 bg-muted rounded font-mono overflow-auto">
{`{
  "name": "Minecraft Java",
  "description": "Vanilla MC server",
  "dockerImage": "itzg/minecraft-server:latest",
  "startup": "java -Xmx{{MEMORY}}M -jar server.jar nogui",
  "env": { "EULA": "TRUE", "MEMORY": "1024" },
  "ports": [25565]
}`}
          </pre>
        </details>
      </div>
    </div>
  );
}
