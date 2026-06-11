import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/categories";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Trash2, Eye, FileText, ShieldCheck, CreditCard, User } from "lucide-react";
import { PageHeader, DataCard } from "@/components/dashboard-shell";
import { useDeleteConfirm } from "@/hooks/admin/use-delete-confirm";
import { useSearch } from "@/hooks/admin/use-search";
import { DeleteConfirmDialog, SearchBar, EmptyRow } from "./shared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileForProvider {
  full_name: string;
  phone: string;
}

interface ProviderForSub {
  id: string;
  business_name: string | null;
  service_type: string | null;
  commerce_register_number: string | null;
  commerce_register_url: string | null;
  verified: boolean | null;
  is_active: boolean | null;
  subscription_expires_at: string | null;
  profiles: ProfileForProvider | null;
}

interface Subscription {
  id: string;
  status: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  receipt_url: string | null;
  commerce_doc_url: string | null;
  plan_name: string | null;
  providers: ProviderForSub | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SUBS_QUERY_KEY = ["admin-subs"] as const;

const PLAN_OPTIONS = [
  { value: "all",       label: "كل الباقات" },
  { value: "أساسية",   label: "أساسية" },
  { value: "بريميوم",  label: "بريميوم" },
  { value: "نصف سنوي", label: "نصف سنوي" },
  { value: "سنوية",    label: "سنوية" },
] as const;

// ─── Query ───────────────────────────────────────────────────────────────────

async function fetchSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `id,
       status,
       created_at,
       start_date,
       end_date,
       receipt_url,
       commerce_doc_url,
       plan_name,
       providers (
         id,
         business_name,
         service_type,
         commerce_register_number,
         commerce_register_url,
         verified,
         is_active,
         subscription_expires_at,
         profiles (
           full_name,
           phone
         )
       )`
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as Subscription[]) ?? [];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveProviderId(providers: ProviderForSub | null): string | null {
  if (!providers) return null;
  return Array.isArray(providers)
    ? (providers as ProviderForSub[])[0]?.id ?? null
    : providers.id;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─── Component ───────────────────────────────────────────────────────────────

function Subscriptions() {
  const qc = useQueryClient();

  const { data = [], isError } = useQuery<Subscription[], Error>({
    queryKey: SUBS_QUERY_KEY,
    queryFn: fetchSubscriptions,
    staleTime: 30_000,
  });

  const [days, setDays] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [viewingSub, setViewingSub] = useState<Subscription | null>(null);

  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();


  if (isError) {
    toast.error("فشل تحميل الاشتراكات");
  }

 

  async function handleApprove(s: Subscription): Promise<void> {
    const providerId = s.providers?.id;
    if (!providerId) { toast.error("لا يمكن التفعيل: المزود غير موجود"); return; }

    const durationDays = days[s.id] ?? 30;
    if (durationDays < 1) { toast.error("يجب أن تكون المدة يوماً واحداً على الأقل"); return; }

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + durationDays);

    const [subResult, provResult] = await Promise.all([
      supabase.from("subscriptions").update({ status: "active", start_date: toDateString(start), end_date: toDateString(end) }).eq("id", s.id),
      supabase.from("providers").update({ is_active: true, subscription_expires_at: end.toISOString() }).eq("id", providerId),
    ]);

    if (subResult.error || provResult.error) {
      toast.error("حدث خطأ أثناء التفعيل");
      console.error(subResult.error ?? provResult.error);
      return;
    }

    toast.success("تم التفعيل");
    qc.invalidateQueries({ queryKey: SUBS_QUERY_KEY });
  }

  async function handleReject(s: Subscription): Promise<void> {
    const { error } = await supabase.from("subscriptions").update({ status: "rejected" }).eq("id", s.id);
    if (error) { toast.error("حدث خطأ أثناء الرفض"); return; }
    toast.success("تم الرفض");
    qc.invalidateQueries({ queryKey: SUBS_QUERY_KEY });
  }

  function handleDelete(id: string, providerId: string | null): void {
    askDel(
      "هل أنت متأكد من حذف هذا الاشتراك نهائياً؟\n\nسيتم حذف الاشتراك وتعطيل حساب المزود بالكامل.",
      async () => {
        const { error: subError } = await supabase.from("subscriptions").delete().eq("id", id);
        if (subError) { toast.error("حدث خطأ أثناء عملية الحذف"); console.error(subError.message); return; }

        if (providerId) {
          const { error: provError } = await supabase
            .from("providers")
            .update({ is_active: false, subscription_expires_at: null })
            .eq("id", providerId);
          if (provError) console.error("Provider deactivation failed:", provError.message);
        }

        toast.success("تم حذف الاشتراك وتعطيل المزود بنجاح");
        qc.invalidateQueries({ queryKey: SUBS_QUERY_KEY });
      }
    );
  }

  async function viewDocument(path: string | null | undefined, bucket: string): Promise<void> {
    if (!path) { toast.error("المستند غير موجود"); return; }
    if (path.startsWith("http")) { window.open(path, "_blank"); return; }

    const newWindow = window.open("", "_blank");
    if (!newWindow) { toast.error("يرجى السماح بالنوافذ المنبثقة (Pop-ups)"); return; }

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { newWindow.close(); toast.error(error?.message ?? "فشل توليد الرابط"); return; }

    newWindow.location.href = data.signedUrl;
  }

  // ── Filter + search ────────────────────────────────────────────────────────
  const rows = data.filter((s) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchPlan   = planFilter === "all" || s.plan_name === planFilter;
    return matchStatus && matchPlan;
  });

  const { q, setQ, filtered } = useSearch<Subscription>(
    rows,
    (s) => s.providers?.business_name ?? ""
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="الاشتراكات"
        description={`إجمالي: ${filtered.length}`}
        actions={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-44 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="active">مفعّل</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-10 w-44 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
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
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                الباقة
              </TableHead>
              <TableHead className="h-12 w-[320px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
                إجراءات
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((s) => (
              <TableRow
                key={s.id}
                className="border-b border-border/40 transition-colors hover:bg-muted/30"
              >
                <TableCell className="py-4 px-4 font-medium">
                  {s.providers?.business_name ?? "—"}
                </TableCell>

                <TableCell className="py-4 px-4 text-sm text-muted-foreground">
                  {formatDate(s.created_at)}
                </TableCell>

                <TableCell className="py-4 px-4">
                  <Badge
                    className={
                      s.status === "active"
                        ? "bg-emerald-deep text-bone-warm shadow-sm"
                        : s.status === "pending"
                        ? "border border-gold-burnished/30 bg-gold-burnished/15 text-gold-burnished"
                        : "border border-destructive/30 bg-destructive/10 text-destructive"
                    }
                  >
                    {STATUS_LABEL[s.status]}
                  </Badge>
                </TableCell>

                <TableCell className="py-4 px-4 font-num text-sm">
                  {s.start_date ? `${s.start_date} → ${s.end_date}` : "—"}
                </TableCell>

                <TableCell className="py-4 px-4 font-num text-sm">
                  {s.plan_name ?? "—"}
                </TableCell>

                <TableCell className="py-4 px-4 text-left">
                  <div className="flex flex-wrap items-center justify-start gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-9 rounded-lg p-0"
                      onClick={() => setViewingSub(s)}
                      title="معلومات المزود"
                    >
                      <Eye className="size-4" />
                    </Button>

                    {s.receipt_url && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="size-9 rounded-lg p-0"
                          onClick={() => viewDocument(s.receipt_url, "receipts")}
                          title="وصل الدفع"
                        >
                          <FileText className="size-4 text-emerald-deep" />
                        </Button>
                        
                      </>
                    )}

                    {s.status === "pending" && (
                      <>
                        <Input
                          type="number"
                          min={1}
                         defaultValue={
                                s.plan_name === "أساسية"
                                ? 30
                                : s.plan_name === "بريميوم"
                                ? 90
                                : s.plan_name === "نصف سنوي"
                                ? 180
                                : s.plan_name === "سنوية"
                                ? 360
                                : 30
                                        }
 className="h-9 w-16 rounded-lg text-center font-num"
                          onChange={(e) =>
                            setDays((prev) => ({
                              ...prev,
                              [s.id]: Math.max(1, Number(e.target.value)),
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          className="size-9 rounded-lg bg-emerald-deep p-0 text-bone-warm shadow-sm hover:bg-emerald-deep/90"
                          onClick={() => handleApprove(s)}
                          title="تفعيل"
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="size-9 rounded-lg border-destructive/30 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(s)}
                          title="رفض"
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(s.id, s.providers?.id ?? null)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <EmptyRow colSpan={6} label="لا توجد اشتراكات" />
            )}
          </TableBody>
        </Table>
      </DataCard>

      <SubscriptionInfoDialog
        sub={viewingSub}
        onClose={() => setViewingSub(null)}
      />
      <DeleteConfirmDialog state={delState} onClose={closeDel} />
    </>
  );
}

// ─── Subscription Info Dialog ─────────────────────────────────────────────────

interface SubscriptionInfoDialogProps {
  sub: Subscription | null;
  onClose: () => void;
}

function SubscriptionInfoDialog({ sub, onClose }: SubscriptionInfoDialogProps) {
  const { data: categories } = useCategories();
  if (!sub) return null;

  const p = sub.providers;

  return (
    <Dialog open={!!sub} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            معلومات الاشتراك والمزود
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">

          {/* ── Profile Section ── */}
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-deep">
              <User className="size-4" /> بيانات صاحب الحساب
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">الاسم الكامل</p>
                <p className="mt-0.5 font-medium">{p?.profiles?.full_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                <p className="mt-0.5 font-medium font-num">
                  {p?.profiles?.phone ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Provider Section ── */}
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-deep">
              <ShieldCheck className="size-4" /> تفاصيل المزود
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">اسم العمل</p>
                <p className="mt-0.5 font-medium">{p?.business_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">نوع الخدمة</p>
                <p className="mt-0.5 font-medium">
                  {p?.service_type ? getCategoryLabel(categories, p.service_type) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">السجل التجاري</p>
                <p className="mt-0.5 font-medium font-num" >
                  {sub?.commerce_doc_url? "موجود" : "غير موجود"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">حالة التوثيق</p>
                <p className="mt-0.5 font-medium">
                  {sub?.status ? (
                    <span className="text-emerald-deep">موثق ✓</span>
                  ) : (
                    <span className="text-gold-burnished">غير موثق</span>
                  )}
                </p>
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

          {/* ── Subscription Section ── */}
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-deep">
              <CreditCard className="size-4" /> بيانات الاشتراك
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">تاريخ الطلب</p>
                <p className="mt-0.5 font-medium">{formatDate(sub.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الحالة</p>
                <p className="mt-0.5 font-medium">{STATUS_LABEL[sub.status]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الباقة</p>
                <p className="mt-0.5 font-medium">{sub.plan_name ?? "—"}</p>
              </div>
              {sub.start_date && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">البداية</p>
                    <p className="mt-0.5 font-medium font-num">{sub.start_date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">النهاية</p>
                    <p className="mt-0.5 font-medium font-num">{sub.end_date}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="bg-midnight-ink text-bone-warm hover:bg-midnight-ink/90">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Subscriptions;