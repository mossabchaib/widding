import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/hooks/use-cart";
import { useAuthContext } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WILAYAS } from "@/lib/wilayas";
import { formatDA } from "@/lib/format";
import {
  ShoppingBag, Trash2, MapPin, Phone, User, Send, ArrowRight,
} from "lucide-react";
import { type ElementType, useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestRow {
  client_id: string;
  service_id: string;
  provider_id: string;
  message: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESSAGE_MAX_LENGTH = 500;

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/cart")({ component: CartPage });

// ─── Page ─────────────────────────────────────────────────────────────────────

function CartPage() {
  const navigate = useNavigate();
  const { items, remove, clear } = useCart();
  const { isAuthenticated, profile, user } = useAuthContext();

  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill contact fields from authenticated profile
  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setWilaya(profile.wilaya ?? "");
  }, [profile]);

  const submit = async () => {
    if (items.length === 0) return;

    if (!isAuthenticated || !user) {
      toast.info("سجّل دخولك أو أنشئ حسابًا لإرسال الطلب");
      navigate({ to: "/auth/login" });
      return;
    }

    const rows: RequestRow[] = items.map((item) => ({
      client_id: user.id,
      service_id: item.serviceId,
      provider_id: item.providerId,
      message: message.trim() || null,
    }));

    setSubmitting(true);
    try {
      const { error } = await supabase.from("requests").insert(rows);
      if (error) throw new Error(error.message);

      const count = rows.length;
      toast.success(`تم إرسال ${count} طلب${count > 1 ? "ات" : ""} للمزودين`);
      clear();
      navigate({ to: "/account/requests" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الإرسال، حاول مجدداً");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background">
        <div className="max-w-2xl mx-auto px-6 pt-32 pb-20 text-center">
          <div className="relative mx-auto w-28 h-28 mb-8">
            <div className="absolute inset-0 rounded-full bg-emerald-deep/10 blur-2xl" />
            <div className="relative h-full w-full rounded-3xl bg-card ring-1 ring-foreground/10 grid place-items-center shadow-sm">
              <ShoppingBag className="size-12 text-emerald-deep" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">سلتك فارغة</h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-md mx-auto">
            اكتشف الخدمات وأضف ما يلائم احتياجاتك لإرسال طلب موحّد لعدة مزوّدين.
          </p>
          <Button asChild className="mt-8 rounded-xl h-12 px-8 bg-emerald-deep text-bone-warm hover:bg-emerald-deep/90">
            <Link to="/browse">
              تصفّح الخدمات
              <ArrowRight className="size-4 ms-2 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
              <Link to="/browse" className="hover:text-foreground transition">الخدمات</Link>
              <span>/</span>
              <span className="text-foreground">السلة</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">السلة</h1>
            <p className="mt-2 text-muted-foreground">
              <span className="font-num font-semibold text-foreground">{items.length}</span> خدمة جاهزة للإرسال للمزودين
            </p>
          </div>
          <button
            onClick={clear}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition px-3 py-2 rounded-lg hover:bg-destructive/5"
          >
            <Trash2 className="size-5" color="red" />
            إفراغ السلة
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Items */}
          <section className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1">
              الخدمات المختارة
            </div>
            {items.map((item) => (
              <div
                key={item.serviceId}
                className="group relative flex gap-4 p-4 bg-card rounded-2xl ring-1 ring-foreground/5 hover:ring-foreground/10 hover:shadow-sm transition-all"
              >
                <div className="size-24 sm:size-28 shrink-0 rounded-xl overflow-hidden bg-muted">
                  {item.photo ? (
                    <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-muted to-muted/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <Link
                      to="/services/$serviceId"
                      params={{ serviceId: item.serviceId }}
                      className="font-semibold text-base hover:text-emerald-deep transition line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="size-3" />
                        {item.providerName}
                      </span>
                      {item.wilaya && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {item.wilaya}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-num font-bold text-emerald-deep mt-2">
                    {formatDA(item.price)}
                  </div>
                </div>

                <button
                  onClick={() => remove(item.serviceId)}
                  className="absolute top-5 left-2 size-8 rounded-full text-red-600 grid place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  aria-label="إزالة"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            ))}
          </section>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {/* Contact info card */}
            <div className="bg-card rounded-2xl ring-1 ring-foreground/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-foreground/5 flex items-center justify-between">
                <h2 className="font-semibold">
                  {isAuthenticated ? "معلوماتك" : "بياناتك للتواصل"}
                </h2>
                {isAuthenticated && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-deep/10 text-emerald-deep font-medium">
                    موثّق
                  </span>
                )}
              </div>

              <div className="p-6">
                {isAuthenticated ? (
                  <div className="space-y-4">
                    <Row icon={User} label="الاسم" value={profile?.full_name || "—"} />
                    <Row icon={Phone} label="الهاتف" value={profile?.phone || "—"} ltr />
                    <Row icon={MapPin} label="الولاية" value={profile?.wilaya || "—"} />
                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-foreground/5">
                      هذه المعلومات سترسل تلقائيًا إلى كل مزوّد.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">الاسم الكامل</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="محمد بن علي"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">الهاتف</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        dir="ltr"
                        placeholder="0555 XX XX XX"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">الولاية</Label>
                      <Select value={wilaya} onValueChange={setWilaya}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="اختر الولاية" />
                        </SelectTrigger>
                        <SelectContent>
                          {WILAYAS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-foreground/5">
                      ستحتاج لإنشاء حساب سريع لإتمام الإرسال — سلتك ستحفظ تلقائيًا.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5 mt-5 pt-5 border-t border-foreground/5">
                  <Label className="text-xs text-muted-foreground">رسالة للمزوّدين (اختيارية)</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={MESSAGE_MAX_LENGTH}
                    placeholder="التاريخ المتوقع، عدد الضيوف، أي ملاحظات..."
                    className="resize-none"
                  />
                  <div className="text-[10px] text-muted-foreground text-end font-num">
                    {message.length}/{MESSAGE_MAX_LENGTH}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl ring-1 ring-foreground/5 p-6 shadow-sm">
              <div className="space-y-3 pb-5 border-b border-dashed border-foreground/10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">عدد الخدمات</span>
                  <span className="font-num font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">رسوم الخدمة</span>
                </div>
              </div>

              <div className="flex justify-between items-end pt-5 mb-5">
                <div>
                  <div className="text-xs text-muted-foreground">المجموع التقريبي</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">يحدد نهائيًا مع كل مزوّد</div>
                </div>
                <span className="font-num font-bold text-emerald-deep text-2xl tracking-tight">
                  {formatDA(total)}
                </span>
              </div>

              <Button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-xl h-12 bg-emerald-deep text-bone-warm hover:bg-emerald-deep/90 shadow-sm"
              >
                <Send className="size-4 ms-2" />
                {submitting
                  ? "جاري الإرسال..."
                  : isAuthenticated
                    ? "إرسال الطلبات"
                    : "تسجيل الدخول وإرسال"}
              </Button>

              <Link
                to="/browse"
                className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground transition"
              >
                متابعة التصفّح
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  icon: ElementType;
  label: string;
  value: string;
  ltr?: boolean;
}

function Row({ icon: Icon, label, value, ltr }: RowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-9 rounded-xl bg-emerald-deep/10 text-emerald-deep grid place-items-center">
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate" dir={ltr ? "ltr" : undefined}>{value}</div>
      </div>
    </div>
  );
}