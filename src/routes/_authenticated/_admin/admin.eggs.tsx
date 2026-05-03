import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useList } from "@/lib/use-list";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";

interface Egg {
  id: string;
  name: string;
  description?: string;
  dockerImage?: string;
  startup?: string;
}

export const Route = createFileRoute("/_authenticated/_admin/admin/eggs")({
  component: AdminEggs,
});

function AdminEggs() {
  const { data, loading, error, reload } = useList<Egg>("/admin/eggs");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploadErr(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await api("/admin/eggs", { method: "POST", body: JSON.stringify(json) });
      reload();
    } catch (e) {
      setUploadErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Upload failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/admin/eggs/${id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      setUploadErr(e instanceof ApiError ? e.message : "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Eggs"
        description="Server templates: docker images, startup commands, environment variables, and ports."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />Upload Egg JSON
            </Button>
          </>
        }
      />
      {uploadErr && <div className="mb-4 text-sm text-destructive">{uploadErr}</div>}
      {loading && <LoadingState />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && <EmptyState message="No eggs uploaded yet." />}

      <div className="grid gap-2">
        {(data ?? []).map((egg) => (
          <Card key={egg.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{egg.name}</div>
                <div className="text-xs text-muted-foreground">{egg.description}</div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">{egg.dockerImage}</div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => remove(egg.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
