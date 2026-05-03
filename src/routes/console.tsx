import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/console")({
  component: ConsolePage,
});

function ConsolePage() {
  return (
    <div>
      <PageHeader title="Console" description="Live server output streamed via WebSocket." />
      <Card>
        <CardContent className="p-0">
          <div className="font-mono text-xs bg-[oklch(0.12_0.02_260)] text-[oklch(0.85_0.02_150)] p-4 h-[480px] overflow-auto rounded-t-md">
            <div className="opacity-60">[console] Waiting for daemon connection…</div>
          </div>
          <div className="p-3 border-t border-border">
            <Input placeholder="Type a command and press Enter…" className="font-mono" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
