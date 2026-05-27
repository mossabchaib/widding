import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/categories";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { AlertCircle, CreditCard, Inbox, LayoutDashboard, Package, User } from "lucide-react";
import { DashboardShell, type DashNav } from "@/components/dashboard-shell";

import { Overview } from "./Overview";
import { ServicesTab } from "./ServicesTab";
import { RequestsTab } from "./RequestsTab";
import { SubscriptionTab } from "./SubscriptionTab";
import { ProfileTab } from "./profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  service_type: string;
  is_active: boolean;
  subscription_expires_at: string | null;
  views: number;
}

interface Subscription {
  status: string;
  end_date: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV: DashNav[] = [
  { key: "overview",     label: "نظرة عامة", icon: LayoutDashboard },
  { key: "services",     label: "خدماتي",    icon: Package },
  { key: "requests",     label: "الطلبات",   icon: Inbox },
  { key: "subscription", label: "الاشتراك",  icon: CreditCard },
  { key: "profile",      label: "ملفي",      icon: User },
];

const PROVIDER_SELECT =
  "id, user_id, business_name, service_type, is_active, subscription_expires_at, views";

// ─── Query functions ──────────────────────────────────────────────────────────

async function fetchMyProvider(userId: string): Promise<Provider | null> {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Provider | null;
}

// ── جديد: جلب آخر اشتراك من جدول subscriptions ──
async function fetchMySubscription(providerId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, end_date")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw new Error(error.message);
  return data as Subscription | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProviderDashboard() {
  const { user, isProvider, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [view, setView] = useState("overview");

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
    enabled: !authLoading && isProvider && !!user?.id,
    staleTime: 5 * 60_000,
  });

  // ── جديد: query الاشتراك ──
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<Subscription | null, Error>({
    queryKey: ["my-subscription", provider?.id],
    queryFn: () => fetchMySubscription(provider!.id),
    enabled: !!provider?.id,
    staleTime: 5 * 60_000,
  });

  // ── جديد: حساب هل الاشتراك فعّال ──
  const isSubscriptionActive = useMemo(() => {
    if (!subscription) return false;
    if (subscription.status !== "active") return false;
    if (!subscription.end_date) return false;
    return new Date(subscription.end_date) > new Date();
  }, [subscription]);

  const { data: categories } = useCategories();

  const serviceTypeLabel = useMemo(
    () => getCategoryLabel(categories, provider?.service_type),
    [categories, provider?.service_type],
  );

  // ── Guards ────────────────────────────────────────────────────────────────

  const isLoading = authLoading || providerLoading || subscriptionLoading;

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
            isSubscriptionActive
              ? "bg-emerald-deep text-bone-warm"
              : "bg-muted text-muted-foreground"
          }
        >
          {isSubscriptionActive ? "مفعّل" : "غير مفعّل"}
        </Badge>
      }
    >
      {!isSubscriptionActive && (
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

      {view === "overview"     && <Overview      providerId={provider.id} provider={provider} />}
      {view === "services"     && <ServicesTab   providerId={provider.id} />}
      {view === "requests"     && <RequestsTab   providerId={provider.id} />}
      {view === "subscription" && <SubscriptionTab provider={provider} />}
      {view === "profile"      && <ProfileTab />}
    </DashboardShell>
  );
}