import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="py-16 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{label}</span>
      </CardContent>
    </Card>
  );
}

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center text-center gap-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <div className="text-sm text-muted-foreground max-w-md">{error}</div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-16 text-center text-muted-foreground text-sm">
        {message}
      </CardContent>
    </Card>
  );
}
