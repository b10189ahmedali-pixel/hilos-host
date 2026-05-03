import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.hasRole("admin")) {
      throw redirect({ to: "/", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
