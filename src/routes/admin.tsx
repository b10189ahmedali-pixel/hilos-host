import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

function Admin() {
  return (
    <div>
      <PageHeader title="Admin Overview" description="System-wide administration." />
    </div>
  );
}
