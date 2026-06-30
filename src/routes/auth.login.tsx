import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WILAYAS } from "@/lib/wilayas";
import { AuthShell } from "@/components/auth-shell";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({ component: LoginPage });

const PHONE_RE = /^[0-9+\s-]{8,15}$/;

const loginSchema = z.object({
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "أدخل كلمة السر"),
});

const forgotSchema = z.object({
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  phone: z.string().trim().regex(PHONE_RE, "رقم هاتف غير صالح"),
  wilaya: z.string().min(1, "اختر الولاية"),
});

type LoginFields = z.infer<typeof loginSchema>;
type ForgotFields = z.infer<typeof forgotSchema>;

function LoginPage() {
  const [view, setView] = useState<"login" | "forgot">("login");

  if (view === "forgot") {
    return <ForgotPasswordView setView={setView} />;
  }

  return <LoginView setView={setView} />;
}

// ✅ LoginView صحيح — signInWithPassword فقط
function LoginView({ setView }: { setView: (v: "forgot") => void }) {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const form = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error("بيانات الدخول غير صحيحة");
        return;
      }

      toast.success("مرحبًا بك مجددًا");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  });

  const { isSubmitting, errors } = form.formState;

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="أدخل بياناتك لمتابعة رحلة تنظيم العرس"
      altPrompt={
        <>
          ليس لديك حساب؟{" "}
          <Link
            to="/auth/register"
            className="text-emerald-deep font-medium underline underline-offset-4 decoration-gold-burnished decoration-2"
          >
            أنشئ حسابًا
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FieldGroup
          icon={<Mail className="size-4" />}
          label="البريد الإلكتروني"
          error={errors.email?.message}
        >
          <Input
            dir="ltr"
            inputMode="email"
            type="email"
            placeholder="example@email.com"
            className="h-12 ps-11 rounded-xl bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:border-emerald-deep transition"
            {...form.register("email")}
          />
        </FieldGroup>

        <FieldGroup
          icon={<Lock className="size-4" />}
          label="كلمة السر"
          error={errors.password?.message}
          extra={
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              aria-label={showPwd ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
            >
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        >
          <Input
            type={showPwd ? "text" : "password"}
            placeholder="••••••••"
            className="h-12 ps-11 pe-11 rounded-xl bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:border-emerald-deep transition"
            {...form.register("password")}
          />
        </FieldGroup>

        <div className="flex justify-end -mt-2">
          <button
            type="button"
            onClick={() => setView("forgot")}
            className="text-xs text-emerald-deep hover:underline underline-offset-4 decoration-gold-burnished"
          >
            نسيت كلمة السر؟
          </button>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-deep/90 text-bone-warm font-medium text-base shadow-lg shadow-emerald-deep/20 hover:shadow-xl hover:shadow-emerald-deep/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isSubmitting ? (
            <><Loader2 className="size-4 animate-spin ms-2" /> جاري الدخول...</>
          ) : (
            "دخول"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

// ✅ ForgotPasswordView صحيح — Edge Function ثم resetPasswordForEmail
function ForgotPasswordView({ setView }: { setView: (v: "login") => void }) {
  const form = useForm<ForgotFields>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "", phone: "", wilaya: "" },
  });

 const onSubmit = form.handleSubmit(async (values) => {
  try {
   const res = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clever-action`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      email: values.email,
      phone: values.phone,
      wilaya: values.wilaya,
    }),
  }
);
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "البيانات غير صحيحة");
      return;
    }

    window.location.href = data.link;

  } catch (err) {
    toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
  }
});
  const { isSubmitting, errors } = form.formState;

  return (
    <AuthShell
      title="نسيت كلمة السر؟"
      subtitle="أدخل بياناتك للتحقق من هويتك"
      altPrompt={
        <button
          type="button"
          onClick={() => setView("login")}
          className="flex items-center gap-1 text-emerald-deep font-medium underline underline-offset-4 decoration-gold-burnished decoration-2"
        >
          <ArrowRight className="size-3.5" />
          العودة لتسجيل الدخول
        </button>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FieldGroup
          icon={<Mail className="size-4" />}
          label="البريد الإلكتروني"
          error={errors.email?.message}
        >
          <Input
            dir="ltr"
            inputMode="email"
            type="email"
            placeholder="example@email.com"
            className="h-12 ps-11 rounded-xl bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:border-emerald-deep transition"
            {...form.register("email")}
          />
        </FieldGroup>

        <FieldGroup
          icon={<Phone className="size-4" />}
          label="رقم الهاتف"
          error={errors.phone?.message}
        >
          <Input
            dir="ltr"
            inputMode="tel"
            placeholder="0555 XX XX XX"
            className="h-12 ps-11 rounded-xl bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:border-emerald-deep transition"
            {...form.register("phone")}
          />
        </FieldGroup>

        <FieldGroup
          icon={<MapPin className="size-4" />}
          label="الولاية"
          error={errors.wilaya?.message}
        >
          <Select
            value={form.watch("wilaya")}
            onValueChange={(v) => form.setValue("wilaya", v, { shouldValidate: true })}
          >
            <SelectTrigger className="h-12 ps-11 rounded-xl bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:border-emerald-deep transition">
              <SelectValue placeholder="اختر الولاية" />
            </SelectTrigger>
            <SelectContent>
              {WILAYAS.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-deep/90 text-bone-warm font-medium text-base shadow-lg shadow-emerald-deep/20 hover:shadow-xl hover:shadow-emerald-deep/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isSubmitting ? (
            <><Loader2 className="size-4 animate-spin ms-2" /> جاري التحقق...</>
          ) : (
            "تأكيد الهوية"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

function FieldGroup({
  label,
  icon,
  error,
  children,
  extra,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
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
        {extra}
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">{error}</p>
      )}
    </div>
  );
}