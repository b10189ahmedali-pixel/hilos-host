import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { AuthState } from "./lib/auth-context";

export interface RouterContext {
  auth: AuthState;
}

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// Safe default so beforeLoad guards never read isAuthenticated off undefined
// before AuthProvider has had a chance to inject the live auth state.
const defaultAuth: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  hasRole: () => false,
  login: async () => {
    throw new Error("Auth not ready");
  },
  register: async () => {
    throw new Error("Auth not ready");
  },
  logout: () => {},
};

export const getRouter = () => {
  return createRouter({
    routeTree,
    context: { auth: defaultAuth },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
