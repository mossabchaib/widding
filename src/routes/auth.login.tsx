import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/auth/login")({ component: LoginPage });

// ─── Validation ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "أدخل كلمة السر"),
});

const forgotSchema = z.object({
  email: z.string().trim().email("البريد الإلكتروني غير صالح"),
});

type LoginFields = z.infer<typeof loginSchema>;
type ForgotFields = z.infer<typeof forgotSchema>;

// ─── Page ──────────────────────────────────────────────────────────────────────

function LoginPage() {
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent">("login");

  if (view === "forgot" || view === "forgot-sent") {
    return <ForgotPasswordView view={view} setView={setView} />;
  }

  return <LoginView setView={setView} />;
}

// ─── Login view ────────────────────────────────────────────────────────────────

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

        {/* Forgot password link */}
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
            <>
              <Loader2 className="size-4 animate-spin ms-2" /> جاري الدخول...
            </>
          ) : (
            "دخول"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

// ─── Forgot password view ──────────────────────────────────────────────────────

function ForgotPasswordView({
  view,
  setView,
}: {
  view: "forgot" | "forgot-sent";
  setView: (v: "login" | "forgot" | "forgot-sent") => void;
}) {
  const form = useForm<ForgotFields>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setView("forgot-sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  });

  const { isSubmitting, errors } = form.formState;

  // ── Sent confirmation screen ──
  if (view === "forgot-sent") {
    return (
      <AuthShell
        title="تحقق من بريدك"
        subtitle="أرسلنا لك رابط إعادة تعيين كلمة السر"
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
        <div className="rounded-2xl bg-muted/60 ring-1 ring-foreground/5 p-6 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-deep/10">
            <Mail className="size-6 text-emerald-deep" />
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed">
            إذا كان البريد مسجلًا لدينا، ستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة السر.
            <br />
            تحقق من مجلد الرسائل غير المرغوب فيها إن لم تجدها.
            اضغط على الرابط في الرسالة لإكمال عملية إعادة تعيين كلمة السر (reset password).
          </p>
          <button
            type="button"
            onClick={() => setView("login")}
            className="mt-2 w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-deep/90 text-bone-warm font-medium text-base shadow-lg shadow-emerald-deep/20 hover:shadow-xl hover:shadow-emerald-deep/30 hover:-translate-y-0.5 transition-all duration-300"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </AuthShell>
    );
  }

  // ── Request form ──
  return (
    <AuthShell
      title="نسيت كلمة السر؟"
      subtitle="أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-deep/90 text-bone-warm font-medium text-base shadow-lg shadow-emerald-deep/20 hover:shadow-xl hover:shadow-emerald-deep/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin ms-2" /> جاري الإرسال...
            </>
          ) : (
            "إرسال رابط الاستعادة"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

// ─── Shared UI atom ────────────────────────────────────────────────────────────

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
          <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
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