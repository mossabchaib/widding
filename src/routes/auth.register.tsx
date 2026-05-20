import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WILAYAS } from "@/lib/wilayas";
import { useCategories } from "@/hooks/use-categories";
import { AuthShell } from "@/components/auth-shell";
import { User, Phone, Lock, MapPin, Briefcase, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
  validateSearch: (s: Record<string, unknown>) => ({
    role: (s.role as string) === "provider" ? "provider" : "client",
  }),
});

// ─── Validation schemas ────────────────────────────────────────────────────────

const PHONE_RE = /^[0-9+\s-]{8,15}$/;

const baseSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم قصير").max(100),
  phone: z.string().trim().regex(PHONE_RE, "رقم هاتف غير صالح"),
  password: z.string().min(6, "كلمة السر قصيرة (6 أحرف على الأقل)").max(72),
  wilaya: z.string().min(1, "اختر الولاية"),
});

const providerSchema = baseSchema.extend({
  service_type: z.string().min(1, "اختر الفئة"),
});

type ClientFields = z.infer<typeof baseSchema>;
type ProviderFields = z.infer<typeof providerSchema>;

// ─── Role tab type ─────────────────────────────────────────────────────────────

type Role = "client" | "provider";

// ─── Supabase helpers ──────────────────────────────────────────────────────────

/**
 * Attempts sign-up and returns the user ID on success.
 * Throws a localised error string on failure.
 */
async function signUpUser(
  phone: string,
  password: string,
  metadata: Record<string, string>
): Promise<string> {
  const email = phoneToEmail(phone);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: metadata,
    },
  });

  if (error) throw new Error(error.message);

  const userId = data.user?.id;
  if (!userId) throw new Error("لم يتم إنشاء المستخدم، يرجى المحاولة مجددًا");

  return userId;
}

/**
 * Creates the provider row in the `providers` table.
 * The `service_type` column uses a DB enum; we insert the canonical fallback
 * value "hall" here because the real category is selected per-service, not
 * per-provider. The chosen service_type from the registration form is kept in
 * metadata only (passed via signUpUser → handle_new_user trigger).
 */
async function createProviderRow(userId: string, businessName: string): Promise<void> {
  const { error } = await supabase.from("providers").insert({
    user_id: userId,
    business_name: businessName,
    service_type: "hall", // enum fallback — see comment above
  });

  if (error) throw new Error(error.message);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function RegisterPage() {
  const search = useSearch({ from: "/auth/register" });
  const [tab, setTab] = useState<Role>(search.role as Role);

  return (
    <AuthShell
      title="إنشاء حساب"
      subtitle="انضم إلى منصّة متهني — مجانًا للعملاء، باشتراك ميسّر للمزوّدين"
      altPrompt={
        <>
          لديك حساب؟{" "}
          <Link
            to="/auth/login"
            className="text-emerald-deep font-medium underline underline-offset-4 decoration-gold-burnished decoration-2"
          >
            سجّل الدخول
          </Link>
        </>
      }
    >
      {/* Role switcher */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted/60 ring-1 ring-foreground/5 mb-6 text-sm font-medium">
        {(
          [
            { v: "client" as const, l: "عميل" },
            { v: "provider" as const, l: "مزوّد خدمة" },
          ] satisfies { v: Role; l: string }[]
        ).map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => setTab(opt.v)}
            className={`relative h-10 rounded-xl transition-all ${
              tab === opt.v
                ? "bg-emerald-deep text-bone-warm shadow-md shadow-emerald-deep/20"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {tab === "client" ? <ClientForm /> : <ProviderForm />}
    </AuthShell>
  );
}

// ─── Client form ───────────────────────────────────────────────────────────────

function ClientForm() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const form = useForm<ClientFields>({
    resolver: zodResolver(baseSchema),
    defaultValues: { full_name: "", phone: "", password: "", wilaya: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUpUser(values.phone, values.password, {
        full_name: values.full_name,
        phone: values.phone,
        wilaya: values.wilaya,
        role: "client",
      });
      toast.success("تم إنشاء الحساب بنجاح");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  });

  const { isSubmitting, errors } = form.formState;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field icon={<User className="size-4" />} label="الاسم الكامل" error={errors.full_name?.message}>
        <StyledInput placeholder="محمد بن علي" {...form.register("full_name")} />
      </Field>

      <Field icon={<Phone className="size-4" />} label="رقم الهاتف" error={errors.phone?.message}>
        <StyledInput dir="ltr" inputMode="tel" placeholder="0555 XX XX XX" {...form.register("phone")} />
      </Field>

      <Field
        icon={<Lock className="size-4" />}
        label="كلمة السر"
        error={errors.password?.message}
        rightSlot={<PasswordToggle show={showPwd} onToggle={() => setShowPwd((v) => !v)} />}
      >
        <StyledInput
          type={showPwd ? "text" : "password"}
          placeholder="6 أحرف على الأقل"
          hasRight
          {...form.register("password")}
        />
      </Field>

      <Field icon={<MapPin className="size-4" />} label="الولاية" error={errors.wilaya?.message}>
        <WilayaSelect
          value={form.watch("wilaya")}
          onChange={(v) => form.setValue("wilaya", v, { shouldValidate: true })}
        />
      </Field>

      <SubmitButton submitting={isSubmitting}>إنشاء الحساب</SubmitButton>
    </form>
  );
}

// ─── Provider form ─────────────────────────────────────────────────────────────

function ProviderForm() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const { data: categories } = useCategories();

  const form = useForm<ProviderFields>({
    resolver: zodResolver(providerSchema),
    defaultValues: { full_name: "", phone: "", password: "", wilaya: "", service_type: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const userId = await signUpUser(values.phone, values.password, {
        full_name: values.full_name,
        phone: values.phone,
        wilaya: values.wilaya,
        role: "provider",
        // Stored in metadata for reference; not used for DB enum constraint
        service_type: values.service_type,
      });

      await createProviderRow(userId, values.full_name);

      toast.success("تم تسجيل المزوّد بنجاح");
      navigate({ to: "/provider" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  });

  const { isSubmitting, errors } = form.formState;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field icon={<Briefcase className="size-4" />} label="اسم النشاط" error={errors.full_name?.message}>
        <StyledInput placeholder="قاعة الأندلس" {...form.register("full_name")} />
      </Field>

      <Field icon={<Phone className="size-4" />} label="رقم الهاتف" error={errors.phone?.message}>
        <StyledInput dir="ltr" inputMode="tel" placeholder="0555 XX XX XX" {...form.register("phone")} />
      </Field>

      <Field
        icon={<Lock className="size-4" />}
        label="كلمة السر"
        error={errors.password?.message}
        rightSlot={<PasswordToggle show={showPwd} onToggle={() => setShowPwd((v) => !v)} />}
      >
        <StyledInput
          type={showPwd ? "text" : "password"}
          placeholder="6 أحرف على الأقل"
          hasRight
          {...form.register("password")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field icon={<MapPin className="size-4" />} label="الولاية" error={errors.wilaya?.message}>
          <WilayaSelect
            value={form.watch("wilaya")}
            onChange={(v) => form.setValue("wilaya", v, { shouldValidate: true })}
            placeholder="الولاية"
          />
        </Field>

        <Field label="نوع الخدمة" error={errors.service_type?.message}>
          <Select
            value={form.watch("service_type")}
            onValueChange={(v) => form.setValue("service_type", v, { shouldValidate: true })}
          >
            <SelectTrigger className="h-12 rounded-xl bg-background/60">
              <SelectValue placeholder="اختر الفئة" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name_ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <SubmitButton submitting={isSubmitting}>تسجيل المزوّد</SubmitButton>
    </form>
  );
}

// ─── Shared UI atoms (no visual changes) ──────────────────────────────────────

function Field({
  label,
  icon,
  error,
  children,
  rightSlot,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/70 uppercase tracking-wider">{label}</Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
            {icon}
          </span>
        )}
        {children}
        {rightSlot}
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">{error}</p>
      )}
    </div>
  );
}

const StyledInput = ({
  hasRight,
  className,
  ...rest
}: React.ComponentProps<typeof Input> & { hasRight?: boolean }) => (
  <Input
    className={`h-12 ps-11 ${hasRight ? "pe-11" : ""} rounded-xl bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:border-emerald-deep transition ${className ?? ""}`}
    {...rest}
  />
);

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

function WilayaSelect({
  value,
  onChange,
  placeholder = "اختر الولاية",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 ps-11 rounded-xl bg-background/60 border-border/70">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {WILAYAS.map((w) => (
          <SelectItem key={w} value={w}>
            {w}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SubmitButton({ submitting, children }: { submitting: boolean; children: React.ReactNode }) {
  return (
    <Button
      type="submit"
      disabled={submitting}
      className="group relative w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-deep/90 text-bone-warm font-medium text-base shadow-lg shadow-emerald-deep/20 hover:shadow-xl hover:shadow-emerald-deep/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {submitting ? (
        <>
          <Loader2 className="size-4 animate-spin ms-2" /> جاري الإنشاء...
        </>
      ) : (
        children
      )}
    </Button>
  );
}