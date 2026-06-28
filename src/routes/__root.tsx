import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, useRouterState, useRouter, useNavigate, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AuthProvider } from "@/hooks/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const inDashboard = path.startsWith("/admin") || path.startsWith("/provider");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate({ to: "/reset-password" });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          {!inDashboard && <SiteHeader />}
          <main className="flex-1">
            <Outlet />
          </main>
          {!inDashboard && <SiteFooter />}
        </div>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 grid place-items-center px-4 py-24">
        <div className="text-center max-w-md">
          <h1 className="font-display text-7xl font-bold text-emerald-deep">404</h1>
          <p className="mt-4 text-muted-foreground">الصفحة التي تبحث عنها غير موجودة.</p>
          <Link to="/" className="inline-flex mt-6 rounded-full bg-emerald-deep text-bone-warm px-6 py-2.5 text-sm font-medium">
            العودة للرئيسية
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-emerald-deep text-bone-warm px-6 py-2 text-sm font-medium"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}