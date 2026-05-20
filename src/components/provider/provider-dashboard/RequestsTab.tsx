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

// ─── Helpers (module-level — stable references, not recreated per render) ─────

function getStatusStyle(status: RequestStatus): string {
  switch (status) {
    case "new":      return "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/15";
    case "accepted": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15";
    case "rejected": return "bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/15";
    default:         return "bg-muted text-muted-foreground border-border";
  }
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "—";
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0] ?? "").join("").toUpperCase() || "—";
}

function getStatusLabel(status: string): string {
  return STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status;
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
  // Store only the ID of the viewed request, then derive the object from live data
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");

  const { data: requests = [], isError, error } = useQuery<Request[], Error>({
    queryKey: ["provider-requests", providerId],
    queryFn: () => fetchRequests(providerId),
    staleTime: 30_000,
  });

  // Derive the viewed request from live query data — never stale after a mutation
  const viewing = useMemo(
    () => requests.find((r) => r.id === viewingId) ?? null,
    [requests, viewingId],
  );

  // useMutation gives us isPending to prevent double-clicks, plus clean error handling
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

  // Single-pass count — O(n) instead of O(4n)
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="الطلبات"
        description="تابع طلبات عملائك وقم بالرد عليها بسرعة"
      />

      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <Inbox className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error?.message ?? "حدث خطأ أثناء تحميل الطلبات"}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            { key: "all",      label: "كل الطلبات", value: counts.all,      accent: "from-foreground/5 to-foreground/0" },
            { key: "new",      label: "جديدة",       value: counts.new,      accent: "from-blue-500/10 to-transparent" },
            { key: "accepted", label: "مقبولة",      value: counts.accepted, accent: "from-emerald-500/10 to-transparent" },
            { key: "rejected", label: "مرفوضة",      value: counts.rejected, accent: "from-rose-500/10 to-transparent" },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-right transition-all hover:shadow-md hover:-translate-y-0.5 ${
              statusFilter === s.key ? "border-foreground/30 ring-2 ring-foreground/10" : "border-border"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-bl ${s.accent} opacity-80 pointer-events-none`} />
            <div className="relative">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{s.value}</p>
            </div>
          </button>
        ))}
      </div>

      <DataCard>
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-border">
          <div className="flex-1 max-w-md">
            <SearchBar value={q} onChange={setQ} placeholder="ابحث باسم العميل أو الخدمة..." />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | "all")}>
            <SelectTrigger className="w-full md:w-44 rounded-xl">
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

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">الخدمة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="group border-border transition-colors hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 text-xs font-semibold text-foreground">
                        {getInitials(r.profiles?.full_name)}
                      </div>
                      <span className="font-medium text-foreground">{r.profiles?.full_name ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{r.profiles?.phone ?? "—"}</TableCell>
                  <TableCell className="text-foreground">{r.services?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-full font-medium ${getStatusStyle(r.status)}`}>
                      {getStatusLabel(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(r.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setViewingId(r.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.status === "new" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isUpdating}
                            className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                            onClick={() => handleUpdate(r.id, "accepted")}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isUpdating}
                            className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                            onClick={() => handleUpdate(r.id, "rejected")}
                          >
                            <X className="h-4 w-4" />
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

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {filtered.map((r) => (
            <div key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 text-xs font-semibold">
                    {getInitials(r.profiles?.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{r.profiles?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground tabular-nums truncate">{r.profiles?.phone ?? "—"}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`rounded-full ${getStatusStyle(r.status)}`}>
                  {getStatusLabel(r.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{r.services?.name ?? "—"}</span>
                <span className="text-muted-foreground text-xs">{formatDate(r.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-lg"
                  onClick={() => setViewingId(r.id)}
                >
                  <Eye className="h-4 w-4 ml-1" /> عرض
                </Button>
                {r.status === "new" && (
                  <>
                    <Button
                      size="sm"
                      disabled={isUpdating}
                      className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleUpdate(r.id, "accepted")}
                    >
                      <Check className="h-4 w-4 ml-1" /> قبول
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      className="flex-1 rounded-lg border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                      onClick={() => handleUpdate(r.id, "rejected")}
                    >
                      <X className="h-4 w-4 ml-1" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">لا توجد طلبات</p>
            <p className="mt-1 text-sm text-muted-foreground">ستظهر طلبات العملاء هنا فور وصولها</p>
          </div>
        )}
      </DataCard>

      {/* Detail dialog */}
      <Dialog open={!!viewingId} onOpenChange={(open) => { if (!open) setViewingId(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 text-sm font-semibold">
                  {getInitials(viewing.profiles?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{viewing.profiles?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(viewing.created_at)}</p>
                </div>
                <Badge variant="outline" className={`rounded-full ${getStatusStyle(viewing.status)}`}>
                  {getStatusLabel(viewing.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">الهاتف</p>
                  <p className="mt-1 text-sm font-medium text-foreground tabular-nums">{viewing.profiles?.phone ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">الخدمة</p>
                  <p className="mt-1 text-sm font-medium text-foreground truncate">{viewing.services?.name ?? "—"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">الرسالة</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {viewing.message ?? "—"}
                </p>
              </div>

              {viewing.status === "new" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isUpdating}
                    onClick={() => handleUpdate(viewing.id, "accepted", true)}
                  >
                    <Check className="h-4 w-4 ml-1" /> قبول الطلب
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                    disabled={isUpdating}
                    onClick={() => handleUpdate(viewing.id, "rejected", true)}
                  >
                    <X className="h-4 w-4 ml-1" /> رفض
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