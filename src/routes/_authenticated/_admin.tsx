import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: ({ context, location }) => {
    const auth = context.auth;
    if (!auth?.isAuthenticated) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!auth.hasRole?.("admin")) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminGate,
});

function AdminGate() {
  const { auth } = Route.useRouteContext();
  // Defense in depth: even if guard is bypassed, never render admin children for non-admins.
  if (!auth?.hasRole("admin")) {
    return (
      <div className="p-6 text-sm text-destructive">
        Access denied — admin role required.
      </div>
    );
  }
  return <Outlet />;
}
