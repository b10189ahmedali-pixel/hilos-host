import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  return (
    <div>
      <PageHeader title="Users" description="Manage user accounts." />
    </div>
  );
}
