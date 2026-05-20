import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/categories";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check, X, Trash2, LayoutDashboard, CreditCard, Users, Package, Star, Search, Eye, ShieldCheck, ShieldOff, Edit, Tag, Plus, Upload, FileText, AlertTriangle, TrendingUp,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { DashboardShell, PageHeader, DataCard, type DashNav } from "@/components/dashboard-shell";

// ─── Reusable Delete Confirmation Dialog ──────────────────────────────────────
export function useDeleteConfirm() {
  const [state, setState] = useState<{ open: boolean; message: string; onConfirm: () => void }>(
    { open: false, message: "", onConfirm: () => {} }
  );
  const ask = (message: string, onConfirm: () => void) =>
    setState({ open: true, message, onConfirm });
  const close = () => setState(s => ({ ...s, open: false }));
  return { state, ask, close };
}

export function DeleteConfirmDialog({ state, onClose }: { state: { open: boolean; message: string; onConfirm: () => void }; onClose: () => void }) {
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold tracking-tight">تأكيد الحذف</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{state.message}</p>
        <DialogFooter className="mt-2 flex-row justify-center gap-3">
          <Button variant="outline" onClick={onClose} className="min-w-24">إلغاء</Button>
          <Button
            className="min-w-24 bg-destructive text-white shadow-sm hover:bg-destructive/90"
            onClick={() => { state.onConfirm(); onClose(); }}
          >حذف</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/admin")({ component: AdminPanel });

const NAV: DashNav[] = [
  { key: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { key: "subs", label: "الاشتراكات", icon: CreditCard },
  { key: "users", label: "المستخدمون", icon: Users },
  { key: "categories", label: "الفئات", icon: Tag },
  { key: "services", label: "الخدمات", icon: Package },
  { key: "reviews", label: "المراجعات", icon: Star },
];

function AdminPanel() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("overview");
  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/" }); }, [loading, isAdmin, navigate]);
  if (loading || !isAdmin) return null;
  return (
    <DashboardShell
      title="لوحة الإدارة"
      subtitle="مَتْهَنّي"
      nav={NAV}
      active={view}
      onNav={setView}
      badge={<Badge className="bg-emerald-deep text-bone-warm shadow-sm">Admin</Badge>}
    >
      {view === "overview" && <Overview />}
      {view === "subs" && <SubscriptionsAdmin />}
      {view === "users" && <UsersAdmin />}
      {view === "categories" && <CategoriesAdmin />}
      {view === "services" && <ServicesAdmin />}
      {view === "reviews" && <ReviewsAdmin />}
    </DashboardShell>
  );
}

function Overview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, providers, activeProv, requests, services, pendingSubs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("providers").select("id", { count: "exact", head: true }),
        supabase.from("providers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("requests").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        users: users.count ?? 0, providers: providers.count ?? 0,
        activeProv: activeProv.count ?? 0, requests: requests.count ?? 0,
        services: services.count ?? 0, pendingSubs: pendingSubs.count ?? 0,
      };
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ["admin-chart-data"],
    queryFn: async () => {
      const [subsRaw, usersRaw, servicesRaw, reviewsRaw] = await Promise.all([
        supabase.from("subscriptions").select("created_at").order("created_at"),
        supabase.from("profiles").select("created_at").order("created_at"),
        supabase.from("services").select("category"),
        supabase.from("reviews").select("rating"),
      ]);
      const byMonth = (rows: any[]) => {
        const map: Record<string, number> = {};
        rows.forEach(r => {
          const d = new Date(r.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map).slice(-7).map(([month, count]) => ({ month: month.slice(5), count }));
      };
      const catMap: Record<string, number> = {};
      (servicesRaw.data ?? []).forEach((s: any) => { if (s.category) catMap[s.category] = (catMap[s.category] || 0) + 1; });
      const byCategory = Object.entries(catMap).map(([name, value]) => ({ name, value }));
      const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      (reviewsRaw.data ?? []).forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) ratingMap[r.rating]++; });
      const byRating = [1, 2, 3, 4, 5].map(r => ({ rating: `${r}★`, count: ratingMap[r] }));
      return { subsByMonth: byMonth(subsRaw.data ?? []), usersByMonth: byMonth(usersRaw.data ?? []), byCategory, byRating };
    },
  });

  const cards = [
    { l: "المستخدمون", v: stats?.users, c: "text-emerald-deep", bg: "bg-emerald-deep/10", icon: Users },
    { l: "المزودون", v: stats?.providers, c: "text-midnight-ink", bg: "bg-midnight-ink/10", icon: ShieldCheck },
    { l: "اشتراكات مفعّلة", v: stats?.activeProv, c: "text-emerald-deep", bg: "bg-emerald-deep/10", icon: Check },
    { l: "في الانتظار", v: stats?.pendingSubs, c: "text-gold-burnished", bg: "bg-gold-burnished/10", icon: CreditCard },
    { l: "الطلبات", v: stats?.requests, c: "text-oxblood-rich", bg: "bg-oxblood-rich/10", icon: FileText },
    { l: "الخدمات", v: stats?.services, c: "text-midnight-ink", bg: "bg-midnight-ink/10", icon: Package },
  ];
  const COLORS = ["#10b981", "#1e2b3a", "#c9a84c", "#7c1c1c", "#6366f1", "#f59e0b"];

  return (
    <>
      <PageHeader title="نظرة عامة" description="ملخص المنصة في الوقت الفعلي" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
        {cards.map((s) => {
          const Icon = s.icon;
          return (
            <DataCard key={s.l} className={`relative overflow-hidden border-0 p-5 transition-all hover:shadow-md ${s.bg}`}>
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.l}</div>
                <div className={`flex size-8 items-center justify-center rounded-full bg-background/60 ${s.c}`}>
                  <Icon className="size-4" />
                </div>
              </div>
              <div className={`font-num mt-3 text-3xl font-bold leading-none ${s.c}`}>{s.v ?? 0}</div>
            </DataCard>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
        <DataCard className="p-5 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-deep/10">
              <TrendingUp className="size-4 text-emerald-deep" />
            </div>
            <span className="font-semibold tracking-tight">الاشتراكات الشهرية</span>
          </div>
          <ChartContainer config={{ count: { label: "اشتراك", color: "#10b981" } }} className="h-48">
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
          <ChartContainer config={{ count: { label: "مستخدم", color: "#1e2b3a" } }} className="h-48">
            <AreaChart data={chartData?.usersByMonth ?? []}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e2b3a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1e2b3a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="count" stroke="#1e2b3a" fill="url(#usersGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ChartContainer>
        </DataCard>
      </div>

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
                <Pie data={chartData?.byCategory ?? []} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                  {(chartData?.byCategory ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              {(chartData?.byCategory ?? []).map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full ring-2 ring-background" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-num font-semibold">{c.value}</span>
                </div>
              ))}
              {(chartData?.byCategory ?? []).length === 0 && <span className="text-muted-foreground">لا توجد بيانات</span>}
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
          <ChartContainer config={{ count: { label: "مراجعة", color: "#c9a84c" } }} className="h-48">
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

function useSearch<T>(rows: T[], get: (r: T) => string) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => get(r).toLowerCase().includes(t));
  }, [rows, q, get]);
  return { q, setQ, filtered };
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-lg border-border/60 pr-10 transition-colors focus-visible:border-emerald-deep/40"
      />
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-16">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Search className="size-5 opacity-50" />
          </div>
          <span className="text-sm">{label}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SubscriptionsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions")
        .select("*, providers(*)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [days, setDays] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingSub, setViewingSub] = useState<any | null>(null);
  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();

  const rows = (data ?? []).filter((s: any) => statusFilter === "all" || s.status === statusFilter);
  const { q, setQ, filtered } = useSearch<any>(rows, (s) => s.providers?.business_name ?? "");

  const approve = async (s: any) => {
    const d = days[s.id] ?? 30;
    const start = new Date();
    const end = new Date(); end.setDate(end.getDate() + d);
    await supabase.from("subscriptions").update({
      status: "active",
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    }).eq("id", s.id);
    await supabase.from("providers").update({
      is_active: true, subscription_expires_at: end.toISOString(),
    }).eq("id", s.providers.id);
    toast.success("تم التفعيل");
    qc.invalidateQueries({ queryKey: ["admin-subs"] });
  };
  const reject = async (s: any) => {
    await supabase.from("subscriptions").update({ status: "rejected" }).eq("id", s.id);
    toast.success("تم الرفض");
    qc.invalidateQueries({ queryKey: ["admin-subs"] });
  };
  const del = (id: string) => {
    askDel("هل أنت متأكد من حذف هذا الاشتراك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.", async () => {
      await supabase.from("subscriptions").delete().eq("id", id);
      toast.success("تم حذف الاشتراك بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
    });
  };
  const viewDocument = async (path: string, bucket: string) => {
    if (!path) { toast.error("المستند غير موجود"); return; }
    
    // If it's already a full URL, open it directly
    if (path.startsWith("http")) {
      window.open(path, "_blank");
      return;
    }

    const newWindow = window.open("", "_blank");
    if (!newWindow) { toast.error("يرجى السماح بالنوافذ المنبثقة (Pop-ups)"); return; }

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error) {
      newWindow.close();
      toast.error(error.message);
      return;
    }
    if (data?.signedUrl) {
      newWindow.location.href = data.signedUrl;
    } else {
      newWindow.close();
      toast.error("فشل توليد الرابط");
    }
  };

  return (
    <>
      <PageHeader
        title="الاشتراكات"
        description="مراجعة وصول الدفع وتفعيل المزودين"
        actions={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-44 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="active">مفعّل</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
            <SearchBar value={q} onChange={setQ} placeholder="بحث باسم المزود..." />
          </>
        }
      />
      <DataCard className="overflow-hidden p-0">
    <Table dir="ltr" className="w-full text-right">
  <TableHeader>
    <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        المزود
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        التاريخ
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        الحالة
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        المدة
      </TableHead>
      <TableHead className="h-12 w-[320px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
        إجراءات
      </TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    {filtered.map((s: any) => (
      <TableRow key={s.id} className="border-b border-border/40 transition-colors hover:bg-muted/30">
        <TableCell className="py-4 px-4 font-medium">
          {s.providers?.business_name ?? "—"}
        </TableCell>

        <TableCell className="py-4 px-4 text-sm text-muted-foreground">
          {formatDate(s.created_at)}
        </TableCell>

        <TableCell className="py-4 px-4">
          <Badge className={
            s.status === "active" ? "bg-emerald-deep text-bone-warm shadow-sm"
            : s.status === "pending" ? "border border-gold-burnished/30 bg-gold-burnished/15 text-gold-burnished"
            : "border border-destructive/30 bg-destructive/10 text-destructive"
          }>
            {STATUS_LABEL[s.status]}
          </Badge>
        </TableCell>

        <TableCell className="py-4 px-4 font-num text-sm">
          {s.start_date ? `${s.start_date} → ${s.end_date}` : "—"}
        </TableCell>

        <TableCell className="py-4 px-4 text-left">
          <div className="flex flex-wrap items-center justify-start gap-1.5">
            <Button size="sm" variant="outline" className="size-9 rounded-lg p-0" onClick={() => setViewingSub(s)} title="معلومات المزود">
              <Eye className="size-4" />
            </Button>
             {s.commerce_doc_url && (
            <Button size="sm" variant="outline" className="size-9 rounded-lg p-0" onClick={() => viewDocument(s.receipt_url, "receipts")} title="وصل الدفع">
              <FileText className="size-4 text-emerald-deep" />
            </Button>
   )}
            {s.commerce_doc_url && (
              <Button size="sm" variant="outline" className="size-9 rounded-lg p-0" onClick={() => viewDocument(s.commerce_doc_url, "receipts")} title="السجل التجاري">
                <FileText className="size-4 text-indigo-500" />
              </Button>
            )}

            {s.status === "pending" && (
              <>
                <Input
                  type="number"
                  defaultValue={30}
                  className="h-9 w-16 rounded-lg text-center font-num"
                  onChange={(e) => setDays({ ...days, [s.id]: Number(e.target.value) })}
                />
                <Button size="sm" className="size-9 rounded-lg bg-emerald-deep p-0 text-bone-warm shadow-sm hover:bg-emerald-deep/90" onClick={() => approve(s)} title="تفعيل">
                  <Check className="size-4" />
                </Button>
                <Button size="sm" variant="outline" className="size-9 rounded-lg border-destructive/30 p-0 text-destructive hover:bg-destructive/10" onClick={() => reject(s)} title="رفض">
                  <X className="size-4" />
                </Button>
              </>
            )}

            <Button size="sm" variant="ghost" className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10" onClick={() => del(s.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))}

    {filtered.length === 0 && <EmptyRow colSpan={5} label="لا توجد اشتراكات" />}
  </TableBody>
</Table>
      </DataCard>
      <SubscriptionInfoDialog sub={viewingSub} onClose={() => setViewingSub(null)} />
      <DeleteConfirmDialog state={delState} onClose={closeDel} />
    </>
  );
}

function SubscriptionInfoDialog({ sub, onClose }: { sub: any | null; onClose: () => void }) {
  const { data: categories } = useCategories();
  if (!sub) return null;
  const p = sub.providers;
  return (
    <Dialog open={!!sub} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">معلومات الاشتراك والمزود</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-deep">
              <ShieldCheck className="size-4" /> تفاصيل المزود
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div><p className="text-xs text-muted-foreground">اسم العمل</p><p className="mt-0.5 font-medium">{p?.business_name ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">نوع الخدمة</p><p className="mt-0.5 font-medium">{p?.service_type ? getCategoryLabel(categories, p.service_type) : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">السجل التجاري</p><p className="mt-0.5 font-medium font-num" dir="ltr">{p?.commerce_register_number ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">حالة التوثيق</p>
                <p className="mt-0.5 font-medium">{p?.verified ? <span className="text-emerald-deep">موثق ✓</span> : <span className="text-gold-burnished">غير موثق</span>}</p>
              </div>
            </div>
            {p?.commerce_register_url && (
              <div className="mt-4">
                <Button size="sm" variant="outline" className="rounded-lg" asChild>
                  <a href={p.commerce_register_url} target="_blank" rel="noreferrer">
                    <FileText className="ml-1.5 size-3.5" /> عرض ملف السجل التجاري
                  </a>
                </Button>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-deep">
              <CreditCard className="size-4" /> بيانات الاشتراك
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div><p className="text-xs text-muted-foreground">تاريخ الطلب</p><p className="mt-0.5 font-medium">{formatDate(sub.created_at)}</p></div>
              <div><p className="text-xs text-muted-foreground">الحالة</p><p className="mt-0.5 font-medium">{STATUS_LABEL[sub.status]}</p></div>
              {sub.start_date && (
                <>
                  <div><p className="text-xs text-muted-foreground">البداية</p><p className="mt-0.5 font-medium font-num">{sub.start_date}</p></div>
                  <div><p className="text-xs text-muted-foreground">النهاية</p><p className="mt-0.5 font-medium font-num">{sub.end_date}</p></div>
                </>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-midnight-ink text-bone-warm hover:bg-midnight-ink/90">إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function UsersAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profs, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      console.log("profs:", profs)
      console.log("roles:", roles)
      const rmap: Record<string, string[]> = {};
      (roles.data ?? []).forEach((r: any) => { rmap[r.user_id] = [...(rmap[r.user_id] ?? []), r.role]; });
      return (profs.data ?? []).map((p: any) => ({ ...p, roles: rmap[p.id] ?? [] }));
    },
  });
  const [viewing, setViewing] = useState<any | null>(null);
  const [filterMode, setFilterMode] = useState<string>("all");
  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();

  const rows = useMemo(() => {
    if (!data) return [];
    return data.filter((u: any) => {
      if (filterMode === "clients") return u.roles.includes("client") && !u.roles.includes("provider") && !u.roles.includes("admin");
      if (filterMode === "providers") return u.roles.includes("provider");
      if (filterMode === "admins") return u.roles.includes("admin");
      return true;
    });
  }, [data, filterMode]);

  const { q, setQ, filtered } = useSearch<any>(rows, (u) => `${u.full_name} ${u.phone} ${u.wilaya}`);

  const del = (id: string) => {
    askDel("هل أنت متأكد من حذف هذا المستخدم نهائياً؟ سيتم حذف جميع بياناته ولا يمكن استرجاعها.", async () => {
      await supabase.from("profiles").delete().eq("id", id);
      toast.success("تم حذف المستخدم بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    });
  };
console.log("filtered:",filtered)
  const roleStyle = (r: string) =>
    r === "admin" ? "border-oxblood-rich/30 bg-oxblood-rich/10 text-oxblood-rich"
    : r === "provider" ? "border-emerald-deep/30 bg-emerald-deep/10 text-emerald-deep"
    : "border-midnight-ink/20 bg-midnight-ink/5 text-midnight-ink";

  return (
   <>
  <PageHeader
    title="المستخدمون"
    description={`إجمالي: ${filtered.length}`}
    actions={
      <>
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="h-10 w-48 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="clients">العملاء فقط</SelectItem>
            <SelectItem value="providers">المزودون</SelectItem>
            <SelectItem value="admins">المشرفين</SelectItem>
          </SelectContent>
        </Select>
        <SearchBar value={q} onChange={setQ} placeholder="ابحث عن اسم، هاتف، ولاية..." />
      </>
    }
  />

  <DataCard className="overflow-hidden p-0">
    <Table dir="ltr" className="w-full text-right">
      <TableHeader>
        <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الاسم
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الهاتف
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الولاية
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الأدوار
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            التسجيل
          </TableHead>
          <TableHead className="h-12 w-[140px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
            إجراءات
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {filtered.map((u: any) => (
          <TableRow key={u.id} className="border-b border-border/40 transition-colors hover:bg-muted/30">
            <TableCell className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-deep/10 text-sm font-semibold text-emerald-deep">
                  {(u.full_name?.[0] ?? "?").toUpperCase()}
                </div>
                <span className="font-medium">{u.full_name}</span>
              </div>
            </TableCell>

            <TableCell className="py-4 px-4 font-num text-sm text-muted-foreground" dir="ltr">
              {u.phone}
            </TableCell>

            <TableCell className="py-4 px-4 text-sm">
              {u.wilaya ?? "—"}
            </TableCell>

            <TableCell className="py-4 px-4">
              <div className="flex flex-wrap gap-1">
                {u.roles.map((r: string) => (
                  <Badge key={r} variant="outline" className={`capitalize ${roleStyle(r)}`}>
                    {r}
                  </Badge>
                ))}
                {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </TableCell>

            <TableCell className="py-4 px-4 text-sm text-muted-foreground">
              {formatDate(u.created_at)}
            </TableCell>

            <TableCell className="py-4 px-4 text-left">
              <div className="flex items-center justify-start gap-1.5">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="size-9 rounded-lg p-0" 
                  onClick={() => setViewing(u)}
                >
                  <Eye className="size-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10" 
                  onClick={() => del(u.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}

        {filtered.length === 0 && <EmptyRow colSpan={6} label="لا يوجد مستخدمون" />}
      </TableBody>
    </Table>
  </DataCard>

  <UserViewDialog user={viewing} onClose={() => setViewing(null)} />
  <DeleteConfirmDialog state={delState} onClose={closeDel} />
</>
  );
}

function UserViewDialog({ user, onClose }: { user: any | null; onClose: () => void }) {
  if (!user) return null;
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">تفاصيل المستخدم</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-deep/15 text-xl font-semibold text-emerald-deep">
              {(user.full_name?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">عضو منذ {formatDate(user.created_at)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <div><p className="text-xs text-muted-foreground">الهاتف</p><p className="mt-0.5 font-medium font-num" dir="ltr">{user.phone}</p></div>
            <div><p className="text-xs text-muted-foreground">الولاية</p><p className="mt-0.5 font-medium">{user.wilaya}</p></div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">الأدوار والصلاحيات</p>
            <div className="flex flex-wrap gap-2">
              {user.roles?.map((r: string) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
              {(!user.roles || user.roles.length === 0) && <span>—</span>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-midnight-ink text-bone-warm hover:bg-midnight-ink/90">إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserEditDialog({ user, onClose }: { user: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => {
    if (user) {
      setName(user.full_name ?? ""); setPhone(user.phone ?? ""); setWilaya(user.wilaya ?? "");
      setRoles(user.roles ?? []);
    }
  }, [user]);
  if (!user) return null;
  const toggleRole = (r: string) => setRoles((rs) => rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]);
  const save = async () => {
    await supabase.from("profiles").update({ full_name: name, phone, wilaya }).eq("id", user.id);
    await supabase.from("user_roles").delete().eq("user_id", user.id);
    if (roles.length) {
      await supabase.from("user_roles").insert(roles.map((r) => ({ user_id: user.id, role: r as any })));
    }
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    onClose();
  };
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">تعديل المستخدم</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className="mb-1.5 block text-xs font-medium text-muted-foreground">الاسم</label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg" /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-muted-foreground">الهاتف</label><Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="h-10 rounded-lg font-num" /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-muted-foreground">الولاية</label><Input value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="h-10 rounded-lg" /></div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">الأدوار</label>
            <div className="flex flex-wrap gap-2">
              {["client", "provider", "admin"].map((r) => (
                <button key={r} type="button" onClick={() => toggleRole(r)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-all ${roles.includes(r) ? "border-emerald-deep bg-emerald-deep text-bone-warm shadow-sm" : "border-border text-muted-foreground hover:border-emerald-deep/40 hover:bg-muted"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button className="bg-emerald-deep text-bone-warm hover:bg-emerald-deep/90" onClick={save}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServicesAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*, providers(business_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: categories } = useCategories();
  const { q, setQ, filtered } = useSearch<any>(data ?? [], (s) => `${s.name} ${s.wilaya} ${s.providers?.business_name ?? ""}`);
  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();
  const del = (id: string) => {
    askDel("هل أنت متأكد من حذف هذه الخدمة نهائياً؟ سيتم حذف جميع بياناتها وصورها.", async () => {
      await supabase.from("services").delete().eq("id", id);
      toast.success("تم حذف الخدمة بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-services"] });
    });
  };
  return (
    <>
      <PageHeader
        title="الخدمات"
        description={`إجمالي: ${data?.length ?? 0}`}
        actions={<SearchBar value={q} onChange={setQ} placeholder="ابحث عن خدمة..." />}
      />
      <DataCard className="overflow-hidden p-0">
      <Table dir="ltr" className="w-full text-right">
  <TableHeader>
    <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
      <TableHead className="h-12 w-20 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        الصورة
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        الخدمة
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        المزود
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        الفئة
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        الولاية
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        السعر
      </TableHead>
      <TableHead className="h-12 w-[140px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
        إجراءات
      </TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    {filtered.map((s: any) => (
      <TableRow key={s.id} className="border-b border-border/40 transition-colors hover:bg-muted/30">
        <TableCell className="py-3 px-4">
          <div className="size-12 overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm">
            {s.photos?.[0] && (
              <img 
                src={s.photos[0]} 
                alt="" 
                className="h-full w-full object-cover transition-transform hover:scale-110" 
              />
            )}
          </div>
        </TableCell>

        <TableCell className="py-3 px-4 font-medium">
          {s.name}
        </TableCell>

        <TableCell className="py-3 px-4 text-sm text-muted-foreground">
          {s.providers?.business_name ?? "—"}
        </TableCell>

        <TableCell className="py-3 px-4">
          <Badge variant="outline" className="rounded-full font-normal">
            {getCategoryLabel(categories, s.category)}
          </Badge>
        </TableCell>

        <TableCell className="py-3 px-4 text-sm">
          {s.wilaya ?? "—"}
        </TableCell>

        <TableCell className="py-3 px-4 font-num font-semibold text-emerald-deep">
          {Number(s.price).toLocaleString("ar-DZ")} 
          <span className="text-xs text-muted-foreground">دج</span>
        </TableCell>

        <TableCell className="py-3 px-4 text-left">
          <div className="flex items-center justify-start gap-1.5">
            <Button asChild size="sm" variant="outline" className="size-9 rounded-lg p-0">
              <Link to="/services/$serviceId" params={{ serviceId: s.id }}>
                <Eye className="size-4" />
              </Link>
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10" 
              onClick={() => del(s.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))}

    {filtered.length === 0 && <EmptyRow colSpan={7} label="لا توجد خدمات" />}
  </TableBody>
</Table>
      </DataCard>
      <DeleteConfirmDialog state={delState} onClose={closeDel} />
    </>
  );
}

function ReviewsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*, services(id, name, providers(id, business_name, profiles:user_id(phone, full_name))), profiles:client_id(full_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [viewingReview, setViewingReview] = useState<any | null>(null);
  const [providerFilter, setProviderFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  const providersList = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    data.forEach(r => {
      const p = r.services?.providers;
      if (p?.id) map.set(p.id, p.business_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => {
      const matchProvider = providerFilter === "all" || r.services?.providers?.id === providerFilter;
      const matchRating = ratingFilter === "all" || r.rating.toString() === ratingFilter;
      return matchProvider && matchRating;
    });
  }, [data, providerFilter, ratingFilter]);

  const { q, setQ, filtered } = useSearch<any>(rows, (r) => `${r.services?.name ?? ""} ${r.profiles?.full_name ?? ""} ${r.services?.providers?.business_name ?? ""} ${r.comment ?? ""}`);
  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();
const del = (id: string) => {
  askDel("هل أنت متأكد من حذف هذه المراجعة نهائياً؟", async () => {
    await supabase.from("reviews").delete().eq("id", id);
    toast.success("تم حذف المراجعة بنجاح");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  });
};
  return (
    <>
      <PageHeader
        title="المراجعات"
        description={`إجمالي: ${filtered.length}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="h-10 w-32 rounded-lg"><SelectValue placeholder="التقييم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التقييمات</SelectItem>
                <SelectItem value="5">5 نجوم</SelectItem>
                <SelectItem value="4">4 نجوم</SelectItem>
                <SelectItem value="3">3 نجوم</SelectItem>
                <SelectItem value="2">نجمتين</SelectItem>
                <SelectItem value="1">نجمة واحدة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="h-10 w-48 rounded-lg"><SelectValue placeholder="اختر المزود" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المزودين</SelectItem>
                {providersList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <SearchBar value={q} onChange={setQ} placeholder="ابحث عن مزود، عميل، تعليق..." />
          </div>
        }
      />
      <DataCard className="overflow-hidden p-0">
       <Table dir="ltr" className="w-full text-right">
  <TableHeader>
    <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        الخدمة
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-center">
        التقييم
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        التعليق
      </TableHead>
      <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
        التاريخ
      </TableHead>
      <TableHead className="h-12 w-[130px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
        إجراءات
      </TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    {filtered.map((r: any) => (
      <TableRow key={r.id} className="border-b border-border/40 transition-colors hover:bg-muted/30">
        <TableCell className="py-4 px-4">
          {r.services ? (
            <Link 
              to="/services/$serviceId" 
              params={{ serviceId: r.services.id }} 
              className="font-medium text-emerald-deep transition-colors hover:underline"
            >
              {r.services.name}
            </Link>
          ) : "—"}
        </TableCell>

        <TableCell className="py-4 px-4 text-center">
          <Badge className="gap-0.5 bg-gold-burnished text-midnight-ink shadow-sm">
            <Star className="size-3 fill-current" /> {r.rating}
          </Badge>
        </TableCell>

        <TableCell className="py-4 px-4 max-w-md truncate text-sm text-muted-foreground">
          {r.comment ?? "—"}
        </TableCell>

        <TableCell className="py-4 px-4 text-sm text-muted-foreground">
          {formatDate(r.created_at)}
        </TableCell>

        <TableCell className="py-4 px-4 text-left">
          <div className="flex items-center justify-start gap-1.5">
            <Button 
              size="sm" 
              variant="outline" 
              className="size-9 rounded-lg p-0" 
              onClick={() => setViewingReview(r)}
            >
              <Eye className="size-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10" 
              onClick={() => del(r.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))}

    {filtered.length === 0 && <EmptyRow colSpan={5} label="لا توجد مراجعات" />}
  </TableBody>
</Table>
      </DataCard>
      <ReviewViewDialog review={viewingReview} onClose={() => setViewingReview(null)} />
        <DeleteConfirmDialog state={delState} onClose={closeDel} />
    </>
  );
}

function ReviewViewDialog({ review, onClose }: { review: any | null; onClose: () => void }) {
  if (!review) return null;
  return (
    <Dialog open={!!review} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">تفاصيل المراجعة</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <p className="text-xs text-muted-foreground">العميل</p>
                <p className="font-semibold">{review.profiles?.full_name ?? "—"}</p>
              </div>
              <Badge className="gap-0.5 bg-gold-burnished text-midnight-ink shadow-sm">
                <Star className="size-3 fill-current" /> {review.rating}
              </Badge>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">الخدمة والمزود</p>
              {review.services ? (
                <Link to="/services/$serviceId" params={{ serviceId: review.services.id }} className="font-medium text-emerald-deep hover:underline">
                  {review.services.name}
                </Link>
              ) : (
                <p className="font-medium">—</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                المزود: {review.services?.providers?.business_name ?? "—"}
                <span dir="ltr" className="font-num">{review.services?.providers?.profiles?.phone ? ` (${review.services.providers.profiles.phone})` : ""}</span>
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">التاريخ</p>
              <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">التعليق</p>
              <p className="rounded-lg border border-border/60 bg-background p-3 leading-relaxed text-foreground/85">{review.comment ?? "لا يوجد تعليق"}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-midnight-ink text-bone-warm hover:bg-midnight-ink/90">إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const [catsRes, servsRes] = await Promise.all([
        supabase.from("categories").select("*").order("created_at", { ascending: false }),
        supabase.from("services").select("category")
      ]);
      const cats = catsRes.data ?? [];
      const counts = (servsRes.data ?? []).reduce((acc: any, s: any) => {
        if (s.category) acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      }, {});
      return cats.map(c => ({ ...c, products_count: counts[c.slug] || 0 }));
    },
  });
  const { q, setQ, filtered } = useSearch<any>(data ?? [], (c) => `${c.name_ar} ${c.slug}`);
  const [editing, setEditing] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();

  const del = (id: string) => {
    askDel("هل أنت متأكد من حذف هذه الفئة؟ جميع الخدمات المرتبطة بها ستفقد رابط فئتها.", async () => {
      await supabase.from("categories").delete().eq("id", id);
      toast.success("تم حذف الفئة بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    });
  };

  return (
<>
  <PageHeader
    title="الفئات"
    description={`إجمالي: ${data?.length ?? 0}`}
    actions={
      <>
        <SearchBar value={q} onChange={setQ} placeholder="ابحث عن فئة..." />
        <Button className="h-10 rounded-lg bg-emerald-deep text-bone-warm shadow-sm hover:bg-emerald-deep/90" onClick={() => { setIsNew(true); setEditing({}); }}>
          <Plus className="ml-1.5 size-4" /> إضافة فئة
        </Button>
      </>
    }
  />
  
  <DataCard className="overflow-hidden p-0">
    <Table dir="ltr" className="w-full text-right">
      <TableHeader>
        <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
          <TableHead className="h-12 w-20 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الصورة
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الاسم بالعربية
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-center">
            عدد الخدمات
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            التاريخ
          </TableHead>
          <TableHead className="h-12 w-[140px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
            إجراءات
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {filtered.map((c: any) => (
          <TableRow key={c.id} className="border-b border-border/40 transition-colors hover:bg-muted/30">
            <TableCell className="py-3 px-4">
              <div className="size-12 overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm">
                {c.image_url ? (
                  <img 
                    src={c.image_url} 
                    alt={c.name_ar} 
                    className="h-full w-full object-cover transition-transform hover:scale-110" 
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Tag className="size-5 text-muted-foreground opacity-40" />
                  </div>
                )}
              </div>
            </TableCell>

            <TableCell className="py-3 px-4 font-medium">
              {c.name_ar}
            </TableCell>

            <TableCell className="py-3 px-4 text-center">
              <Badge variant="secondary" className="font-num bg-emerald-deep/10 text-emerald-deep">
                {c.products_count}
              </Badge>
            </TableCell>

            <TableCell className="py-3 px-4 text-sm text-muted-foreground">
              {formatDate(c.created_at)}
            </TableCell>

            <TableCell className="py-3 px-4 text-left">
              <div className="flex items-center justify-start gap-1.5">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="size-9 rounded-lg p-0" 
                  onClick={() => { setIsNew(false); setEditing(c); }}
                >
                  <Edit className="size-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10" 
                  onClick={() => del(c.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}

        {filtered.length === 0 && <EmptyRow colSpan={5} label="لا توجد فئات" />}
      </TableBody>
    </Table>
  </DataCard>

  <CategoryEditDialog category={editing} isNew={isNew} onClose={() => setEditing(null)} />
  <DeleteConfirmDialog state={delState} onClose={closeDel} />
</>
  );
}

function CategoryEditDialog({ category, isNew, onClose }: { category: any | null; isNew: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [nameAr, setNameAr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (category) {
      setNameAr(category.name_ar ?? "");
      setImageUrl(category.image_url ?? "");
    }
  }, [category]);

  if (!category) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const ext = f.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      await supabase.storage.createBucket("category-images", { public: true }).catch(() => {});

      const { error } = await supabase.storage.from("category-images").upload(path, f);
      if (error) throw error;
      const { data } = supabase.storage.from("category-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "فشل رفع الصورة. يرجى التأكد من إعدادات مساحة التخزين (Bucket).");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!nameAr) {
      toast.error("يرجى تعبئة اسم الفئة");
      return;
    }
    const payload = { name_ar: nameAr, image_url: imageUrl };
    if (isNew) {
      const generatedSlug = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const { error } = await supabase.from("categories").insert([{ ...payload, slug: generatedSlug }]);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("categories").update(payload).eq("id", category.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    toast.success("تم الحفظ بنجاح");
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    onClose();
  };

  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">{isNew ? "إضافة فئة جديدة" : "تعديل الفئة"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              الاسم بالعربية <span className="text-destructive">*</span>
            </label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: قاعات أفراح" className="h-10 rounded-lg" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">الصورة</label>
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                {imageUrl
                  ? <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  : <Tag className="size-6 text-muted-foreground opacity-40" />}
              </div>
              <div className="flex-1">
                <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="cursor-pointer rounded-lg" />
                {uploading
                  ? <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-deep"><Upload className="size-3 animate-pulse" /> جاري الرفع...</p>
                  : <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG حتى 2MB</p>}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button className="bg-emerald-deep text-bone-warm shadow-sm hover:bg-emerald-deep/90" onClick={save} disabled={uploading}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
