import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/use-categories";
import { formatDA, formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/categories";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  TrendingUp, Star, DollarSign, Briefcase, CreditCard, Calendar,
  AlertCircle, Inbox,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  provider_id: string;
  category: string;
  price: number;
}

interface RequestRow {
  id: string;
  status: "new" | "accepted" | "rejected";
  created_at: string;
  services: { price: number } | null;
}

interface Review {
  rating: number | null;
  service_id: string;
}

interface Subscription {
  id: string;
  created_at: string;
}

interface Provider {
  subscription_expires_at: string | null;
  is_active: boolean;
}

interface ProviderData {
  services: Service[];
  requests: RequestRow[];
  reviews: Review[];
  subscriptions: Subscription[];
}

interface OverviewProps {
  providerId: string;
  provider: Provider;
}

// ─── Constants (defined outside component to avoid recreation on every render) ─

const MONTH_NAMES = ["جان", "فيف", "مار", "أفر", "ماي", "جوان", "جويل", "أوت", "سب", "أكت", "نوف", "ديس"] as const;
const COLORS = ["hsl(160 60% 35%)", "hsl(42 65% 52%)", "hsl(0 55% 38%)", "hsl(220 35% 18%)"] as const;
const STATUS_KEYS = ["new", "accepted", "rejected"] as const;

// ─── Query function (extracted for clarity & testability) ─────────────────────

async function fetchProviderOverview(providerId: string): Promise<ProviderData> {
  const [servicesRes, requestsRes, subsRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, provider_id, category, price")
      .eq("provider_id", providerId),
    supabase
      .from("requests")
      .select("id, status, created_at, services(price)")
      .eq("provider_id", providerId),
    supabase
      .from("subscriptions")
      .select("id, created_at")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false }),
  ]);

  if (servicesRes.error) throw new Error(servicesRes.error.message);
  if (requestsRes.error) throw new Error(requestsRes.error.message);
  if (subsRes.error) throw new Error(subsRes.error.message);

  const services: Service[] = servicesRes.data ?? [];
  const serviceIds = services.map((s) => s.id);

  let reviews: Review[] = [];
  if (serviceIds.length > 0) {
    const reviewsRes = await supabase
      .from("reviews")
      .select("rating, service_id")
      .in("service_id", serviceIds);
    if (reviewsRes.error) throw new Error(reviewsRes.error.message);
    reviews = reviewsRes.data ?? [];
  }

  return {
    services,
    requests: (requestsRes.data ?? []) as RequestRow[],
    reviews,
    subscriptions: subsRes.data ?? [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Overview({ providerId, provider }: OverviewProps) {
  const { data, isLoading, isError, error } = useQuery<ProviderData, Error>({
    queryKey: ["provider-overview", providerId],
    queryFn: () => fetchProviderOverview(providerId),
    staleTime: 60_000, // 1 minute — avoid unnecessary refetches
  });

  const { data: categories } = useCategories();

  // ── Derived / computed values (memoized) ──────────────────────────────────

  const services = data?.services ?? [];
  const requests = data?.requests ?? [];
  const reviews = data?.reviews ?? [];

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating ?? 0), 0);
    return sum / reviews.length;
  }, [reviews]);

  const revenue = useMemo(
    () =>
      requests
        .filter((r) => r.status === "accepted")
        .reduce((acc, r) => acc + Number(r.services?.price ?? 0), 0),
    [requests],
  );

  const monthly = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        name: MONTH_NAMES[d.getMonth()],
        الطلبات: 0,
      };
    });

    for (const r of requests) {
      const d = new Date(r.created_at);
      const bucket = buckets.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.الطلبات += 1;
    }

    return buckets;
  }, [requests]);

  // Single-pass status counting instead of three separate .filter() calls
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { new: 0, accepted: 0, rejected: 0 };
    for (const r of requests) {
      if (r.status in counts) counts[r.status] += 1;
    }
    return counts;
  }, [requests]);

  const statusChart = useMemo(
    () =>
      STATUS_KEYS.map((k) => ({
        name: STATUS_LABEL[k as keyof typeof STATUS_LABEL],
        value: statusCounts[k],
      })),
    [statusCounts],
  );

  const categoryChart = useMemo(
    () =>
      (categories ?? [])
        .map((c) => ({
          name: c.name_ar,
          value: services.filter((s) => s.category === c.slug).length,
        }))
        .filter((x) => x.value > 0),
    [categories, services],
  );

  const totalStatus = useMemo(
    () => statusChart.reduce((acc, x) => acc + x.value, 0),
    [statusChart],
  );

  // ── Loading / error guards ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div dir="rtl" className="space-y-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div dir="rtl" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm">{error?.message ?? "حدث خطأ أثناء تحميل البيانات"}</p>
      </div>
    );
  }

  // ── Card definitions ──────────────────────────────────────────────────────

  const cards = [
    { l: "الخدمات", v: services.length, icon: Briefcase, accent: "from-emerald-500/15 to-emerald-500/0", text: "text-emerald-700", ring: "ring-emerald-500/20" },
    { l: "الطلبات", v: requests.length, icon: Inbox, accent: "from-slate-500/15 to-slate-500/0", text: "text-slate-800", ring: "ring-slate-500/20" },
    { l: "متوسط التقييم", v: avg ? avg.toFixed(1) : "—", icon: Star, accent: "from-amber-500/15 to-amber-500/0", text: "text-amber-700", ring: "ring-amber-500/20" },
    { l: "مداخيل مقبولة", v: formatDA(revenue), icon: DollarSign, accent: "from-rose-500/15 to-rose-500/0", text: "text-rose-700", ring: "ring-rose-500/20" },
  ] as const;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            نظرة عامة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ملخّص أداء نشاطك خلال الفترة الأخيرة
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <TrendingUp className="h-3.5 w-3.5" />
          محدّث الآن
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.l}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ${c.ring} transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-bl ${c.accent}`} />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {c.l}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                    {c.v}
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-background/70 backdrop-blur ${c.text}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Requests trend */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">حركة الطلبات</h3>
              <p className="text-xs text-muted-foreground">آخر 6 أشهر</p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              {requests.length}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="hsl(var(--border, 220 13% 91%))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }} width={28} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220 13% 91%)", fontSize: 12 }} />
                <Area type="monotone" dataKey="الطلبات" stroke={COLORS[0]} strokeWidth={2.5} fill="url(#reqFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status distribution */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">حالة الطلبات</h3>
            <p className="text-xs text-muted-foreground">توزيع الحالات</p>
          </div>
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">
                  {statusChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220 13% 91%)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-foreground">{totalStatus}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">إجمالي</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {statusChart.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-foreground">{s.name}</span>
                </div>
                <span className="font-semibold tabular-nums text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category chart */}
      {categoryChart.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">الخدمات حسب الفئة</h3>
            <p className="text-xs text-muted-foreground">توزيع خدماتك على الفئات</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS[1]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLORS[1]} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }} width={28} />
                <Tooltip cursor={{ fill: "hsl(220 13% 95%)" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(220 13% 91%)", fontSize: 12 }} />
                <Bar dataKey="value" fill="url(#barFill)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Subscription banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-l from-slate-900 to-slate-800 p-5 text-white shadow-sm">
        <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">حالة الاشتراك</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-white/90">
                <Calendar className="h-4 w-4" />
                ينتهي: {provider.subscription_expires_at ? formatDate(provider.subscription_expires_at) : "—"}
              </p>
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold backdrop-blur sm:self-auto ${
              provider.is_active
                ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30"
                : "bg-rose-400/20 text-rose-200 ring-1 ring-rose-300/30"
            }`}
          >
            {provider.is_active ? <Star className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {provider.is_active ? "مفعّل" : "غير مفعّل"}
          </div>
        </div>
      </div>
    </div>
  );
}