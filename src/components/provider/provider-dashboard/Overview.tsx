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
  AlertCircle, Inbox, Eye,
} from "lucide-react";

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
  status: string;
  end_date: string | null;
}

interface Provider {
  subscription_expires_at: string | null;
  is_active: boolean;
  views?: number;
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

const MONTH_NAMES = ["جان", "فيف", "مار", "أفر", "ماي", "جوان", "جويل", "أوت", "سب", "أكت", "نوف", "ديس"] as const;
const COLORS = ["hsl(160 60% 35%)", "hsl(42 65% 52%)", "hsl(0 55% 38%)", "hsl(220 35% 18%)"] as const;
const STATUS_KEYS = ["new", "accepted", "rejected"] as const;

async function fetchProviderOverview(providerId: string): Promise<ProviderData> {
  const [servicesRes, requestsRes, subsRes] = await Promise.all([
    supabase.from("services").select("id, provider_id, category, price").eq("provider_id", providerId),
    supabase.from("requests").select("id, status, created_at, services(price)").eq("provider_id", providerId),
    supabase.from("subscriptions").select("id, created_at, status, end_date").eq("provider_id", providerId).order("created_at", { ascending: false }),
  ]);

  if (servicesRes.error) throw new Error(servicesRes.error.message);
  if (requestsRes.error) throw new Error(requestsRes.error.message);
  if (subsRes.error) throw new Error(subsRes.error.message);

  const services: Service[] = servicesRes.data ?? [];
  const serviceIds = services.map((s) => s.id);

  let reviews: Review[] = [];
  if (serviceIds.length > 0) {
    const reviewsRes = await supabase.from("reviews").select("rating, service_id").in("service_id", serviceIds);
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

export function Overview({ providerId, provider }: OverviewProps) {
  const { data, isLoading, isError, error } = useQuery<ProviderData, Error>({
    queryKey: ["provider-overview", providerId],
    queryFn: () => fetchProviderOverview(providerId),
    staleTime: 60_000,
  });

  const { data: categories } = useCategories();

  const services = data?.services ?? [];
  const requests = data?.requests ?? [];
  const reviews = data?.reviews ?? [];
  const subscriptions = data?.subscriptions ?? [];

  // ── جديد: حساب حالة الاشتراك من جدول subscriptions ──
  const isSubscriptionActive = useMemo(() => {
    const latest = subscriptions[0];
    if (!latest) return false;
    if (latest.status !== "active") return false;
    if (!latest.end_date) return false;
    return new Date(latest.end_date) > new Date();
  }, [subscriptions]);

  const isPlatformActive = useMemo(
    () => provider.is_active || isSubscriptionActive,
    [provider.is_active, isSubscriptionActive],
  );

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating ?? 0), 0);
    return sum / reviews.length;
  }, [reviews]);

  const revenue = useMemo(
    () => requests.filter((r) => r.status === "accepted").reduce((acc, r) => acc + Number(r.services?.price ?? 0), 0),
    [requests],
  );

  const monthly = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { key: `${d.getFullYear()}-${d.getMonth()}`, name: MONTH_NAMES[d.getMonth()], الطلبات: 0 };
    });
    for (const r of requests) {
      const d = new Date(r.created_at);
      const bucket = buckets.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.الطلبات += 1;
    }
    return buckets;
  }, [requests]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { new: 0, accepted: 0, rejected: 0 };
    for (const r of requests) { if (r.status in counts) counts[r.status] += 1; }
    return counts;
  }, [requests]);

  const statusChart = useMemo(
    () => STATUS_KEYS.map((k) => ({ name: STATUS_LABEL[k as keyof typeof STATUS_LABEL], value: statusCounts[k] })),
    [statusCounts],
  );

  const categoryChart = useMemo(
    () => (categories ?? []).map((c) => ({ name: c.name_ar, value: services.filter((s) => s.category === c.slug).length })).filter((x) => x.value > 0),
    [categories, services],
  );

  const totalStatus = useMemo(() => statusChart.reduce((acc, x) => acc + x.value, 0), [statusChart]);

  if (isLoading) {
    return (
      <div dir="rtl" className="space-y-6 p-6">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div dir="rtl" className="m-6 flex items-center gap-4 rounded-2xl border border-rose-200/60 bg-rose-50/80 p-6 text-rose-700 backdrop-blur">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-rose-800">خطأ في التحميل</p>
          <p className="text-sm text-rose-600">{error?.message ?? "حدث خطأ أثناء تحميل البيانات"}</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "الخدمات",
      value: services.length,
      icon: Briefcase,
      color: "emerald",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-100",
      dot: "bg-emerald-500",
    },
    {
      label: "الطلبات",
      value: requests.length,
      icon: Inbox,
      color: "violet",
      bg: "bg-violet-50",
      text: "text-violet-600",
      border: "border-violet-100",
      dot: "bg-violet-500",
    },
    {
      label: "متوسط التقييم",
      value: avg ? avg.toFixed(1) : "—",
      icon: Star,
      color: "amber",
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
      dot: "bg-amber-500",
    },
    {
      label: "المداخيل",
      value: formatDA(revenue),
      icon: DollarSign,
      color: "sky",
      bg: "bg-sky-50",
      text: "text-sky-600",
      border: "border-sky-100",
      dot: "bg-sky-500",
    },
    {
      label: "المشاهدات",
      value: provider.views ?? 0,
      icon: Eye,
      color: "rose",
      bg: "bg-rose-50",
      text: "text-rose-600",
      border: "border-rose-100",
      dot: "bg-rose-500",
    },
  ] as const;

  return (
    <div dir="rtl" className="min-h-screen space-y-8 p-4 sm:p-6 lg:p-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-300" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">لوحة التحكم</h1>
          </div>
          <p className="pr-3.5 text-sm text-muted-foreground">ملخّص شامل لأداء نشاطك التجاري</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-sm sm:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          محدّث الآن
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className={`group relative overflow-hidden rounded-2xl border ${k.border} ${k.bg} p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-muted-foreground">{k.label}</p>
                  <p className={`mt-2.5 text-2xl font-bold tabular-nums tracking-tight ${k.text}`}>
                    {k.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm ${k.text}`}>
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
              </div>
              <div className={`absolute bottom-0 left-0 h-0.5 w-full ${k.dot} opacity-60`} />
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Trend Chart */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground">حركة الطلبات</h3>
              <p className="text-xs text-muted-foreground">آخر 6 أشهر</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              {requests.length} طلب
            </div>
          </div>
          <div className="p-5">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reqFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="hsl(var(--border, 220 13% 91%))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 16% 57%)" }} dy={6} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 16% 57%)" }} width={24} />
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: "1px solid hsl(220 13% 91%)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}
                    cursor={{ stroke: COLORS[0], strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Area type="monotone" dataKey="الطلبات" stroke={COLORS[0]} strokeWidth={2.5} fill="url(#reqFill)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: COLORS[0] }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Status Donut */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">توزيع حالات الطلبات</h3>
            <p className="text-xs text-muted-foreground">نسبة كل حالة من الإجمالي</p>
          </div>
          <div className="px-5 pt-4">
            <div className="relative h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={4} stroke="none" startAngle={90} endAngle={-270}>
                    {statusChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220 13% 91%)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,.06)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums text-foreground">{totalStatus}</span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">إجمالي</span>
              </div>
            </div>
          </div>
          <div className="space-y-1 p-5 pt-3">
            {statusChart.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-muted/50">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-foreground">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">{s.value}</span>
                  {totalStatus > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round((s.value / totalStatus) * 100)}٪
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Bar Chart ── */}
      {categoryChart.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground">الخدمات حسب الفئة</h3>
              <p className="text-xs text-muted-foreground">توزيع خدماتك على التصنيفات المختلفة</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              {services.length} خدمة
            </div>
          </div>
          <div className="p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[1]} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={COLORS[1]} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 16% 57%)" }} dy={6} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 16% 57%)" }} width={24} />
                  <Tooltip cursor={{ fill: "hsl(220 13% 96%)", radius: 8 }} contentStyle={{ borderRadius: 14, border: "1px solid hsl(220 13% 91%)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,.06)" }} />
                  <Bar dataKey="value" fill="url(#barFill)" radius={[10, 10, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(160_60%_35%/0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(42_65%_52%/0.10),transparent_60%)]" />

        <div className="relative grid gap-6 p-6 sm:grid-cols-2 sm:items-center sm:gap-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm ring-1 ring-white/10">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-widest text-white/40">حالة الاشتراك</p>
              <p className="text-base font-semibold text-white">
                {isPlatformActive ? "الحساب مفعل الآن" : "الاشتراك منتهي"}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  تاريخ الانتهاء: {subscriptions[0]?.end_date ? formatDate(subscriptions[0].end_date) : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-xs text-white/40">الحالة الحالية</span>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
                  isPlatformActive
                    ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                    : "bg-rose-400/15 text-rose-300 ring-rose-400/30"
                }`}
              >
                {isPlatformActive ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    مفعّل
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    غير مفعّل
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}