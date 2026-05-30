import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { Loader2, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/auth/login")({ component: LoginPage });

// ─── Validation ────────────────────────────────────────────────────────────────

const schema = z.object({
  phone: z.string().trim().regex(/^[0-9+\s-]{8,15}$/, "رقم هاتف غير صالح"),
  password: z.string().min(1, "أدخل كلمة السر"),
});

type LoginFields = z.infer<typeof schema>;

// ─── Role type ─────────────────────────────────────────────────────────────────

type UserRole = "admin" | "provider" | "client";

// ─── Supabase helpers ──────────────────────────────────────────────────────────

/**
 * Returns the list of roles assigned to a user.
 * Throws on a Supabase error so the caller can surface it.
 */
async function fetchUserRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: { role: UserRole }) => r.role);
}

/**
 * Maps a role list to the appropriate redirect path.
 * Priority: admin > provider > client (default).
 */
function resolveRedirectPath(roles: UserRole[]): "/admin" | "/provider" | "/" {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("provider")) return "/provider";
  return "/";
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function LoginPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const form = useForm<LoginFields>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(values.phone),
        password: values.password,
      });

      if (error) {
        // Supabase returns the same error for wrong credentials and unconfirmed
        // accounts; keep the message generic to avoid user enumeration.
        toast.error("بيانات الدخول غير صحيحة");
        return;
      }

      toast.success("مرحبًا بك مجددًا");

      // const roles = await fetchUserRoles(data.user.id);
 navigate({ to:"/" });
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