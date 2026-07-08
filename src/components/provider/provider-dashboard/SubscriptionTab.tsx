import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { PROVIDER_PLANS } from "../../../constants/provider-plans";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, DataCard } from "@/components/dashboard-shell";
import {
  CreditCard,
  Calendar,
  Upload,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Plan {
  id: string;
  name: string;
  days: number;
  price: number;
  color: string;
  badge: string;
}

interface Subscription {
  id: string;
  provider_id: string;
  receipt_url: string | null;
  plan_days: number;
  plan_name: string | null;
  status: "pending" | "active" | "expired" ;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Provider {
  id: string;
  is_active: boolean;
  subscription_expires_at?: string | null;
}

interface SubscriptionTabProps {
  provider: Provider;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function uploadFile(userId: string, bucket: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return path;
}

async function openSignedUrl(path: string): Promise<void> {
  const newWindow = window.open("", "_blank");
  if (!newWindow) {
    toast.error("يرجى السماح بالنوافذ المنبثقة (Pop-ups)");
    return;
  }
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
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
}

async function fetchSubscriptions(providerId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Subscription[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SubscriptionTab({ provider }: SubscriptionTabProps) {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: subs = [] } = useQuery<Subscription[]>({
    queryKey: ["my-subs", provider.id],
    queryFn: () => fetchSubscriptions(provider.id),
  });

  // ── حساب حالة الاشتراك من جدول subscriptions ──
  const isSubscriptionActive = useMemo(() => {
    const latest = subs[0];
    if (!latest) return false;
    if (latest.status !== "active") return false;
    if (!latest.end_date) return false;
    return new Date(latest.end_date) > new Date();
  }, [subs]);

  const isPlatformActive = useMemo(
    () => provider.is_active || isSubscriptionActive,
    [provider.is_active, isSubscriptionActive],
  );

  const latestEndDate = subs[0]?.end_date ?? null;

  const hasPending = useMemo(() => subs.some((s) => s.status === "pending"), [subs]);
  const canSubscribe = !isSubscriptionActive && !hasPending;

  const submit = useCallback(async () => {
    if (!selectedPlan) { toast.error("يرجى اختيار باقة أولاً"); return; }
    if (!receiptFile)  { toast.error("يرجى رفع وصل الدفع"); return; }
    if (!user) return;

    setUploading(true);
    try {
      const [receiptPath] = await Promise.all([
        uploadFile(user.id, "receipts", receiptFile),
      ]);

      const insertData: any = {
        provider_id: provider.id,
        receipt_url: receiptPath,
        plan_days: selectedPlan.days,
        plan_name: selectedPlan.name,
        status: "pending",
      };

      const { error } = await supabase.from("subscriptions").insert(insertData);
      if (error) throw error;

      toast.success("تم الإرسال للمراجعة بنجاح!");
      setReceiptFile(null);
      setSelectedPlan(null);
      qc.invalidateQueries({ queryKey: ["my-subs", provider.id] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الإرسال");
    } finally {
      setUploading(false);
    }
  }, [selectedPlan, receiptFile, user, provider.id, qc]);

  const handleViewDoc = useCallback((path: string | null) => {
    if (!path) { toast.error("مسار الوثيقة غير موجود"); return; }
    openSignedUrl(path);
  }, []);

  return (
    <>
      <PageHeader title="الاشتراك" description="اختر باقتك وأرسل الوثائق المطلوبة" />

      {/* ── Status Card ── */}
      <DataCard className="mb-8 overflow-hidden p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`grid size-14 place-items-center rounded-2xl ${
                isSubscriptionActive
                  ? "bg-emerald-deep/10 text-emerald-deep ring-1 ring-emerald-deep/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <CreditCard className="size-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                حالة الاشتراك
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    isPlatformActive
                      ? "bg-emerald-deep text-bone-warm"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {isPlatformActive ? "مفعّل" : "غير مفعّل"}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  ينتهي: {latestEndDate ? formatDate(latestEndDate) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
         <div className="mt-3 flex flex-wrap gap-4 border-t border-border/50 pt-3">
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        رقم CCP الذي تدفع فيه
      </p>
      <p className="font-num text-sm font-bold text-foreground">007999990040155733</p>
    </div>
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        المفتاح
      </p>
      <p className="font-num text-sm font-bold text-foreground">23</p>
    </div>
  </div>
      </DataCard>

      {canSubscribe ? (
        <>
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-display text-xl">اختر الباقة</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">اختر ما يناسب حجم نشاطك</p>
            </div>
            <p className="text-xs text-muted-foreground">جميع الأسعار بالدينار الجزائري</p>
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROVIDER_PLANS.map((plan: Plan) => {
              const active = selectedPlan?.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative overflow-hidden rounded-2xl border-2 bg-card p-5 text-right transition-all duration-200 ${plan.color} ${
                    active
                      ? "scale-[1.02] shadow-xl ring-2 ring-emerald-deep ring-offset-2 ring-offset-background"
                      : "hover:-translate-y-1 hover:shadow-md"
                  }`}
                >
                  {active && (
                    <div className="absolute -end-2 -top-2 grid size-7 place-items-center rounded-full bg-emerald-deep text-bone-warm shadow-md">
                      <CheckCircle2 className="size-4" />
                    </div>
                  )}
                  <Badge className={`mb-3 ${plan.badge}`}>{plan.name}</Badge>
                  <p className="font-num text-3xl font-bold tracking-tight text-foreground">
                    {plan.price.toLocaleString("ar-DZ")}
                    <span className="ms-1 text-sm font-normal text-muted-foreground">دج</span>
                  </p>
                  <p className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {plan.days} يوم
                  </p>
                </button>
              );
            })}
          </div>

          {selectedPlan && (
            <DataCard className="mb-8 border-emerald-deep/30 bg-emerald-deep/[0.02] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-deep/10 text-emerald-deep">
                  <Upload className="size-5" />
                </div>
                <div>
                  <h4 className="font-display text-base font-semibold">رفع الوثائق المطلوبة</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    باقة {selectedPlan.name} — {selectedPlan.days} يوم
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="block">
                    وصل الدفع <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    صورة الشاك أو إيصال التحويل البنكي
                  </p>
                   <div className="mt-3 flex flex-wrap gap-4 border-t border-border/50 pt-3">
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        رقم CCP الذي تدفع فيه
      </p>
      <p className="font-num text-sm font-bold text-foreground">007999990040155733</p>
    </div>
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        المفتاح
      </p>
      <p className="font-num text-sm font-bold text-foreground">23</p>
    </div>
  </div>
                  {receiptFile && (
                    <p className="flex items-center gap-1 rounded-md bg-emerald-deep/10 px-2 py-1 text-xs text-emerald-deep">
                      <CheckCircle2 className="size-3.5" /> {receiptFile.name}
                    </p>
                  )}
                </div>

            
              </div>

              <div className="mt-6 flex justify-end border-t border-emerald-deep/10 pt-5">
                <Button
                  className="bg-emerald-deep text-bone-warm shadow-sm hover:bg-emerald-deep/90"
                  onClick={submit}
                  disabled={uploading || !receiptFile }
                >
                  {uploading ? "جاري الرفع..." : "إرسال للمراجعة"}
                </Button>
              </div>
            </DataCard>
          )}
        </>
      ) : (
        <div className="mb-8 rounded-xl border border-emerald-deep/20 bg-emerald-deep/5 p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-emerald-deep/10 text-emerald-deep">
            {isSubscriptionActive ? (
              <CheckCircle2 className="size-6" />
            ) : (
              <Clock className="size-6" />
            )}
          </div>
          <h3 className="font-display text-lg font-semibold">
            {isPlatformActive ? "أنت جاهز للعمل الآن" : "طلب اشتراكك قيد المراجعة"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {isPlatformActive
              ? "حسابك مفعل الآن ويمكنك العمل مباشرة. الاشتراك اختياري ومتاح لاحقًا إذا أردت."
              : "لقد استلمنا طلبك وهو الآن قيد المراجعة من قبل الإدارة. ستتلقى إشعاراً فور تفعيل حسابك."}
          </p>
        </div>
      )}

      {/* ── History Table ── */}
      <div>
        <div className="mb-4">
          <h3 className="font-display text-xl">سجل الاشتراكات</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">جميع طلبات الاشتراك السابقة</p>
        </div>

        <DataCard className="overflow-hidden">
          <Table  dir="ltr">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">الباقة</TableHead>
                <TableHead className="font-semibold">التاريخ</TableHead>
                <TableHead className="font-semibold">الحالة</TableHead>
                <TableHead className="font-semibold">المدة</TableHead>
                <TableHead className="text-end font-semibold">الوثائق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s) => (
                <TableRow key={s.id} className="transition-colors hover:bg-muted/40">
                  <TableCell className="font-medium text-foreground">
                    {s.plan_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(s.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        s.status === "active"
                          ? "bg-emerald-deep text-bone-warm"
                          : s.status === "pending"
                          ? "bg-gold-burnished/20 text-gold-burnished"
                          : "bg-destructive/15 text-destructive"
                      }
                    >
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-num text-muted-foreground">
                    {s.start_date ? `${s.start_date} → ${s.end_date}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {s.receipt_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDoc(s.receipt_url)}
                          title="وصل الدفع"
                        >
                          <FileText className="size-4" color="green" />
                        </Button>
                      )}
                    
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {subs.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="grid size-14 place-items-center rounded-full bg-muted">
                        <CreditCard className="size-7 opacity-50" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">لا توجد اشتراكات سابقة</p>
                        <p className="mt-1 text-xs">سجل اشتراكاتك سيظهر هنا</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataCard>
      </div>
    </>
  );
}

export { SubscriptionTab };