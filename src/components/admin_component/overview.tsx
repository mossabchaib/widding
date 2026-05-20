import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, DataCard } from "@/components/dashboard-shell";
import {
  Users, ShieldCheck, Check, CreditCard, FileText, Package, TrendingUp, Star,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ["#10b981", "#1e2b3a", "#c9a84c", "#7c1c1c", "#6366f1", "#f59e0b"] as const;

const STAT_CARDS = [
  { key: "users",      label: "المستخدمون",       color: "text-emerald-deep",    bg: "bg-emerald-deep/10",    icon: Users },
  { key: "providers",  label: "المزودون",          color: "text-midnight-ink",    bg: "bg-midnight-ink/10",    icon: ShieldCheck },
  { key: "activeProv", label: "اشتراكات مفعّلة",  color: "text-emerald-deep",    bg: "bg-emerald-deep/10",    icon: Check },
  { key: "pendingSubs",label: "في الانتظار",       color: "text-gold-burnished",  bg: "bg-gold-burnished/10",  icon: CreditCard },
  { key: "requests",   label: "الطلبات",           color: "text-oxblood-rich",    bg: "bg-oxblood-rich/10",    icon: FileText },
  { key: "services",   label: "الخدمات",           color: "text-midnight-ink",    bg: "bg-midnight-ink/10",    icon: Package },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type StatKey = typeof STAT_CARDS[number]["key"];

interface AdminStats extends Record<StatKey, number> {}

interface MonthPoint  { month: string; count: number }
interface CategoryPoint { name: string; value: number }
interface RatingPoint { rating: string; count: number }

interface ChartData {
  subsByMonth:  MonthPoint[];
  usersByMonth: MonthPoint[];
  byCategory:   CategoryPoint[];
  byRating:     RatingPoint[];
}

interface RowWithDate    { created_at: string }
interface RowWithCat     { category: string | null }
interface RowWithRating  { rating: number }

// ─── Pure helpers (module-level — not recreated on every render) ──────────────

/**
 * Buckets an array of dated rows into monthly counts.
 * Sorts by key before slicing so the last-7 window is always correct
 * regardless of DB return order.
 */
function groupByMonth(rows: RowWithDate[]): MonthPoint[] {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const d   = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map[key]  = (map[key] ?? 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))   // ensure chronological order
    .slice(-7)
    .map(([month, count]) => ({ month: month.slice(5), count }));
}

function groupByCategory(rows: RowWithCat[]): CategoryPoint[] {
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (row.category) map[row.category] = (map[row.category] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function groupByRating(rows: RowWithRating[]): RatingPoint[] {
  // Use string keys to avoid implicit number→string coercion on Record access.
  const map: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const row of rows) {
    const key = String(row.rating);
    if (key in map) map[key]++;
  }
  return ["1", "2", "3", "4", "5"].map((r) => ({ rating: `${r}★`, count: map[r] }));
}

// ─── Query functions ──────────────────────────────────────────────────────────

async function fetchAdminStats(): Promise<AdminStats> {
  const [users, providers, activeProv, requests, services, pendingSubs] = await Promise.all([
    supabase.from("profiles")     .select("id", { count: "exact", head: true }),
    supabase.from("providers")    .select("id", { count: "exact", head: true }),
    supabase.from("providers")    .select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("requests")     .select("id", { count: "exact", head: true }),
    supabase.from("services")     .select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  // Surface the first error encountered rather than silently falling back to 0.
  const firstError = [users, providers, activeProv, requests, services, pendingSubs]
    .find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);

  return {
    users:       users.count       ?? 0,
    providers:   providers.count   ?? 0,
    activeProv:  activeProv.count  ?? 0,
    requests:    requests.count    ?? 0,
    services:    services.count    ?? 0,
    pendingSubs: pendingSubs.count ?? 0,
  };
}

async function fetchChartData(): Promise<ChartData> {
  const [subsRaw, usersRaw, servicesRaw, reviewsRaw] = await Promise.all([
    supabase.from("subscriptions").select("created_at").order("created_at"),
    supabase.from("profiles")     .select("created_at").order("created_at"),
    supabase.from("services")     .select("category"),
    supabase.from("reviews")      .select("rating"),
  ]);

  const firstError = [subsRaw, usersRaw, servicesRaw, reviewsRaw]
    .find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);

  return {
    subsByMonth:  groupByMonth(subsRaw.data   ?? []),
    usersByMonth: groupByMonth(usersRaw.data  ?? []),
    byCategory:   groupByCategory(servicesRaw.data ?? []),
    byRating:     groupByRating(reviewsRaw.data    ?? []),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

function Overview() {
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn:  fetchAdminStats,
    staleTime: 60_000, // admin counts don't need to refetch on every focus
  });

  const { data: chartData } = useQuery<ChartData>({
    queryKey: ["admin-chart-data"],
    queryFn:  fetchChartData,
    staleTime: 60_000,
  });

  // Only recompute card values when stats actually changes.
  const cards = useMemo(
    () => STAT_CARDS.map((card) => ({ ...card, value: stats?.[card.key] ?? 0 })),
    [stats],
  );

  return (
    <>
      <PageHeader title="نظرة عامة" description="ملخص المنصة في الوقت الفعلي" />

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
        {cards.map(({ key, label, color, bg, icon: Icon, value }) => (
          <DataCard
            key={key}
            className={`relative overflow-hidden border-0 p-5 transition-all hover:shadow-md ${bg}`}
          >
            <div className="flex items-start justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </div>
              <div className={`flex size-8 items-center justify-center rounded-full bg-background/60 ${color}`}>
                <Icon className="size-4" />
              </div>
            </div>
            <div className={`font-num mt-3 text-3xl font-bold leading-none ${color}`}>{value}</div>
          </DataCard>
        ))}
      </div>

      {/* ── Row 1 charts ───────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
        <DataCard className="p-5 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-deep/10">
              <TrendingUp className="size-4 text-emerald-deep" />
            </div>
            <span className="font-semibold tracking-tight">الاشتراكات الشهرية</span>
          </div>
          <ChartContainer
            config={{ count: { label: "اشتراك", color: "#10b981" } }}
            className="h-48"
          >
            <BarChart data={chartData?.subsByMonth ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </DataCard>

        <DataCard className="p-5 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-midnight-ink/10">
              <Users className="size-4 text-midnight-ink" />
            </div>
            <span className="font-semibold tracking-tight">المستخدمون الجدد شهرياً</span>
          </div>
          <ChartContainer
            config={{ count: { label: "مستخدم", color: "#1e2b3a" } }}
            className="h-48"
          >
            <AreaChart data={chartData?.usersByMonth ?? []}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1e2b3a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1e2b3a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#1e2b3a"
                fill="url(#usersGrad)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ChartContainer>
        </DataCard>
      </div>

      {/* ── Row 2 charts ───────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
        <DataCard className="p-5 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-indigo-500/10">
              <Package className="size-4 text-indigo-500" />
            </div>
            <span className="font-semibold tracking-tight">الخدمات حسب الفئة</span>
          </div>
          <div className="flex h-48 items-center justify-center gap-6">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={chartData?.byCategory ?? []}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {(chartData?.byCategory ?? []).map((_entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              {(chartData?.byCategory ?? []).map((c, i) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-full ring-2 ring-background"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-num font-semibold">{c.value}</span>
                </div>
              ))}
              {(chartData?.byCategory ?? []).length === 0 && (
                <span className="text-muted-foreground">لا توجد بيانات</span>
              )}
            </div>
          </div>
        </DataCard>

        <DataCard className="p-5 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-gold-burnished/10">
              <Star className="size-4 text-gold-burnished" />
            </div>
            <span className="font-semibold tracking-tight">توزيع التقييمات</span>
          </div>
          <ChartContainer
            config={{ count: { label: "مراجعة", color: "#c9a84c" } }}
            className="h-48"
          >
            <BarChart data={chartData?.byRating ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="rating" tick={{ fontSize: 12 }} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#c9a84c" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        </DataCard>
      </div>
    </>
  );
}

export default Overview;