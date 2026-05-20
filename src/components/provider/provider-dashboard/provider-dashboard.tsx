import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/categories";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { AlertCircle, CreditCard, Inbox, LayoutDashboard, Package } from "lucide-react";
import { DashboardShell, type DashNav } from "@/components/dashboard-shell";

import { Overview } from "./Overview";
import { ServicesTab } from "./ServicesTab";
import { RequestsTab } from "./RequestsTab";
import { SubscriptionTab } from "./SubscriptionTab";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  service_type: string;
  is_active: boolean;
  subscription_expires_at: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV: DashNav[] = [
  { key: "overview",      label: "نظرة عامة", icon: LayoutDashboard },
  { key: "services",      label: "خدماتي",    icon: Package },
  { key: "requests",      label: "الطلبات",   icon: Inbox },
  { key: "subscription",  label: "الاشتراك",  icon: CreditCard },
];

// Only the columns the dashboard actually uses — avoids fetching sensitive/unused fields
const PROVIDER_SELECT =
  "id, user_id, business_name, service_type, is_active, subscription_expires_at";

// ─── Query function ───────────────────────────────────────────────────────────

async function fetchMyProvider(userId: string): Promise<Provider | null> {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Provider | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProviderDashboard() {
  const { user, isProvider, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [view, setView] = useState("overview");

  // Redirect non-providers only after auth has fully resolved
  useEffect(() => {
    if (!authLoading && !isProvider) {
      navigate({ to: "/auth/login" });
    }
  }, [authLoading, isProvider, navigate]);

  const {
    data: provider,
    isLoading: providerLoading,
    isError,
    error,
  } = useQuery<Provider | null, Error>({
    queryKey: ["my-provider", user?.id],
    queryFn: () => fetchMyProvider(user!.id),
    // Only run when auth is settled and we know the user is a provider
    enabled: !authLoading && isProvider && !!user?.id,
    staleTime: 5 * 60_000, // provider profile rarely changes — 5 min cache
  });

  const { data: categories } = useCategories();

  // Memoize the resolved category label to avoid recalculating on every render
  const serviceTypeLabel = useMemo(
    () => getCategoryLabel(categories, provider?.service_type),
    [categories, provider?.service_type],
  );

  // ── Guards ────────────────────────────────────────────────────────────────

  // Show spinner while auth OR provider data is in flight
  const isLoading = authLoading || providerLoading;

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-10 animate-spin rounded-full border-2 border-emerald-deep border-t-transparent" />
          <p className="text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error?.message ?? "حدث خطأ أثناء تحميل بيانات المزوّد"}</p>
        </div>
      </div>
    );
  }

  // Provider record not found (e.g. user exists but has no provider profile yet)
  if (!provider) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardShell
      title={provider.business_name}
      subtitle={serviceTypeLabel}
      nav={NAV}
      active={view}
      onNav={setView}
      badge={
        <Badge
          className={
            provider.is_active
              ? "bg-emerald-deep text-bone-warm"
              : "bg-muted text-muted-foreground"
          }
        >
          {provider.is_active ? "مفعّل" : "غير مفعّل"}
        </Badge>
      }
    >
      {!provider.is_active && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold-burnished/30 bg-gold-burnished/5 p-4 shadow-sm">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold-burnished/15 text-gold-burnished">
            <AlertCircle className="size-5" />
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium text-foreground">اشتراكك غير مفعّل</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              ارفع وصل الدفع وانتظر موافقة الإدارة لتظهر خدماتك للعملاء.
            </p>
          </div>
        </div>
      )}

      {view === "overview"      && <Overview      providerId={provider.id} provider={provider} />}
      {view === "services"      && <ServicesTab    providerId={provider.id} />}
      {view === "requests"      && <RequestsTab   providerId={provider.id} />}
      {view === "subscription"  && <SubscriptionTab provider={provider} />}
    </DashboardShell>
  );
}