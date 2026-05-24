import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { useSearch } from "@/hooks/admin/use-search";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataCard, PageHeader } from "@/components/dashboard-shell";
import { Inbox, Eye, Check, X } from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "./SearchBar";

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = "new" | "accepted" | "rejected";

interface RequestProfile {
  full_name: string | null;
  phone: string | null;
}

interface RequestService {
  id: string;
  name: string | null;
}

interface Request {
  id: string;
  status: RequestStatus;
  message: string | null;
  created_at: string;
  services: RequestService | null;
  profiles: RequestProfile | null;
}

interface StatusCounts {
  all: number;
  new: number;
  accepted: number;
  rejected: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusStyle(status: RequestStatus): string {
  switch (status) {
    case "new":      return "bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-200/60";
    case "accepted": return "bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-200/60";
    case "rejected": return "bg-red-50 text-red-600 border-red-200 ring-1 ring-red-200/60";
    default:         return "bg-muted text-muted-foreground border-border";
  }
}

function getStatusDot(status: RequestStatus): string {
  switch (status) {
    case "new":      return "bg-sky-500";
    case "accepted": return "bg-teal-500";
    case "rejected": return "bg-red-400";
    default:         return "bg-muted-foreground";
  }
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "—";
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0] ?? "").join("").toUpperCase() || "—";
}

function getStatusLabel(status: string): string {
  return STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status;
}

function getAvatarGradient(name?: string | null): string {
  const gradients = [
    "from-violet-400 to-purple-600",
    "from-sky-400 to-blue-600",
    "from-teal-400 to-emerald-600",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-600",
    "from-indigo-400 to-blue-600",
  ];
  if (!name) return gradients[0];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

// ─── Query / mutation functions ───────────────────────────────────────────────

async function fetchRequests(providerId: string): Promise<Request[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("id, status, message, created_at, services(id, name), profiles:client_id(full_name, phone)")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Request[];
}

async function updateRequestStatus(id: string, status: RequestStatus): Promise<void> {
  const { error } = await supabase.from("requests").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequestsTab({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");

  const { data: requests = [], isError, error } = useQuery<Request[], Error>({
    queryKey: ["provider-requests", providerId],
    queryFn: () => fetchRequests(providerId),
    staleTime: 30_000,
  });

  const viewing = useMemo(
    () => requests.find((r) => r.id === viewingId) ?? null,
    [requests, viewingId],
  );

  const { mutate: updateStatus, isPending: isUpdating } = useMutation<
    void,
    Error,
    { id: string; status: RequestStatus }
  >({
    mutationFn: ({ id, status }) => updateRequestStatus(id, status),
    onSuccess: () => {
      toast.success("تم التحديث");
      qc.invalidateQueries({ queryKey: ["provider-requests", providerId] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpdate = (id: string, status: RequestStatus, closeDialog = false) => {
    updateStatus({ id, status });
    if (closeDialog) setViewingId(null);
  };

  const counts = useMemo<StatusCounts>(() => {
    const acc: StatusCounts = { all: requests.length, new: 0, accepted: 0, rejected: 0 };
    for (const r of requests) {
      if (r.status in acc) acc[r.status] += 1;
    }
    return acc;
  }, [requests]);

  const filteredByStatus = useMemo(
    () => (statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter)),
    [requests, statusFilter],
  );

  const { q, setQ, filtered } = useSearch(
    filteredByStatus,
    (r: Request) => `${r.profiles?.full_name ?? ""} ${r.services?.name ?? ""}`,
  );

  const statCards = [
    {
      key: "all" as const,
      label: "إجمالي الطلبات",
      value: counts.all,
      color: "text-foreground",
      bar: "bg-foreground/20",
      fill: "bg-foreground/60",
      ring: "ring-foreground/20",
    },
    {
      key: "new" as const,
      label: "طلبات جديدة",
      value: counts.new,
      color: "text-sky-600",
      bar: "bg-sky-100",
      fill: "bg-sky-500",
      ring: "ring-sky-200",
    },
    {
      key: "accepted" as const,
      label: "مقبولة",
      value: counts.accepted,
      color: "text-teal-600",
      bar: "bg-teal-100",
      fill: "bg-teal-500",
      ring: "ring-teal-200",
    },
    {
      key: "rejected" as const,
      label: "مرفوضة",
      value: counts.rejected,
      color: "text-red-500",
      bar: "bg-red-100",
      fill: "bg-red-400",
      ring: "ring-red-200",
    },
  ] as const;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="space-y-8 px-1">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1 pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">الطلبات</h1>
        <p className="text-sm text-muted-foreground">تابع طلبات عملائك وقم بالرد عليها بسرعة</p>
      </div>

      {/* ── Error banner ── */}
      {isError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <X className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium">{error?.message ?? "حدث خطأ أثناء تحميل الطلبات"}</p>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((s) => {
          const pct = counts.all > 0 ? Math.round((s.value / counts.all) * 100) : 0;
          const isActive = statusFilter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`group relative flex flex-col gap-3 rounded-2xl border bg-card p-5 text-right shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 ${
                isActive
                  ? `border-transparent ring-2 ${s.ring} shadow-md -translate-y-0.5`
                  : "border-border hover:border-transparent hover:ring-1 hover:ring-border"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                  <p className={`mt-2 text-4xl font-bold tabular-nums leading-none ${s.color}`}>{s.value}</p>
                </div>
                <div className={`h-2 w-2 rounded-full mt-1 ${isActive ? s.fill : "bg-muted-foreground/30"}`} />
              </div>
              <div className={`h-1.5 w-full rounded-full ${s.bar} overflow-hidden`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${s.fill}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Table card ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

        {/* toolbar */}
        <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 max-w-sm">
            <SearchBar value={q} onChange={setQ} placeholder="ابحث باسم العميل أو الخدمة..." />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | "all")}>
              <SelectTrigger className="w-40 rounded-xl border-border bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الطلبات</SelectItem>
                <SelectItem value="new">جديد</SelectItem>
                <SelectItem value="accepted">مقبول</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-right pr-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">العميل</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">الهاتف</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">الخدمة</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">الحالة</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">التاريخ</TableHead>
                <TableHead className="text-right pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="group border-border transition-colors hover:bg-muted/40 cursor-default"
                >
                  <TableCell className="pr-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(r.profiles?.full_name)} text-[11px] font-bold text-white shadow-sm`}>
                        {getInitials(r.profiles?.full_name)}
                      </div>
                      <span className="font-semibold text-sm text-foreground leading-tight">{r.profiles?.full_name ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums py-4">{r.profiles?.phone ?? "—"}</TableCell>
                  <TableCell className="py-4">
                    <span className="inline-flex items-center rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground border border-border/60">
                      {r.services?.name ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusStyle(r.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(r.status)}`} />
                      {getStatusLabel(r.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-4 tabular-nums">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="pl-5 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-muted"
                        onClick={() => setViewingId(r.id)}
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      {r.status === "new" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isUpdating}
                            className="h-8 w-8 rounded-lg hover:bg-teal-50 hover:text-teal-700 text-teal-600"
                            onClick={() => handleUpdate(r.id, "accepted")}
                            title="قبول"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isUpdating}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 text-red-500"
                            onClick={() => handleUpdate(r.id, "rejected")}
                            title="رفض"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="md:hidden divide-y divide-border">
          {filtered.map((r) => (
            <div key={r.id} className="p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(r.profiles?.full_name)} text-xs font-bold text-white shadow-sm`}>
                    {getInitials(r.profiles?.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{r.profiles?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{r.profiles?.phone ?? "—"}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusStyle(r.status)}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(r.status)}`} />
                  {getStatusLabel(r.status)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground border border-border/60">
                  {r.services?.name ?? "—"}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{formatDate(r.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 rounded-xl text-xs font-medium border-border"
                  onClick={() => setViewingId(r.id)}
                >
                  <Eye className="h-3.5 w-3.5 ml-1.5" /> عرض
                </Button>
                {r.status === "new" && (
                  <>
                    <Button
                      size="sm"
                      disabled={isUpdating}
                      className="h-8 flex-1 rounded-xl text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white shadow-none"
                      onClick={() => handleUpdate(r.id, "accepted")}
                    >
                      <Check className="h-3.5 w-3.5 ml-1.5" /> قبول
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      className="h-8 flex-1 rounded-xl text-xs font-medium border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleUpdate(r.id, "rejected")}
                    >
                      <X className="h-3.5 w-3.5 ml-1.5" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border shadow-sm">
              <Inbox className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="mt-5 text-base font-semibold text-foreground">لا توجد طلبات</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xs leading-relaxed">
              {q ? "لا توجد نتائج مطابقة لبحثك، جرّب كلمة مختلفة." : "ستظهر طلبات العملاء هنا فور وصولها."}
            </p>
          </div>
        )}
      </div>

      {/* ── Detail dialog ── */}
      <Dialog open={!!viewingId} onOpenChange={(open) => { if (!open) setViewingId(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-base font-bold text-foreground">تفاصيل الطلب</DialogTitle>
          </DialogHeader>

          {viewing && (
            <div className="p-6 space-y-5">
              {/* client row */}
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(viewing.profiles?.full_name)} text-sm font-bold text-white shadow-md`}>
                  {getInitials(viewing.profiles?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate text-base">{viewing.profiles?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(viewing.created_at)}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${getStatusStyle(viewing.status)}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(viewing.status)}`} />
                  {getStatusLabel(viewing.status)}
                </span>
              </div>

              {/* info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">الهاتف</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">{viewing.profiles?.phone ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">الخدمة</p>
                  <p className="text-sm font-semibold text-foreground truncate">{viewing.services?.name ?? "—"}</p>
                </div>
              </div>

              {/* message */}
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">الرسالة</p>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {viewing.message?.trim() ? viewing.message : <span className="text-muted-foreground italic">لا توجد رسالة</span>}
                </p>
              </div>

              {/* actions */}
              {viewing.status === "new" && (
                <div className="flex gap-2.5 pt-1">
                  <Button
                    className="flex-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-none"
                    disabled={isUpdating}
                    onClick={() => handleUpdate(viewing.id, "accepted", true)}
                  >
                    <Check className="h-4 w-4 ml-1.5" /> قبول الطلب
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-semibold shadow-none"
                    disabled={isUpdating}
                    onClick={() => handleUpdate(viewing.id, "rejected", true)}
                  >
                    <X className="h-4 w-4 ml-1.5" /> رفض
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}