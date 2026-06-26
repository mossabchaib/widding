// src/routes/auth/reset-password.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(6, "كلمة السر قصيرة (6 أحرف على الأقل)").max(72),
    confirm: z.string().min(1, "أعد إدخال كلمة السر"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "كلمتا السر غير متطابقتين",
    path: ["confirm"],
  });

type Fields = z.infer<typeof schema>;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("تم تغيير كلمة السر بنجاح");
      navigate({ to: "/auth/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  });

  const { isSubmitting, errors } = form.formState;

  return (
    <AuthShell
      title="تعيين كلمة سر جديدة"
      subtitle="اختر كلمة سر قوية لحماية حسابك"
      altPrompt={null}
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {/* New password */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
            كلمة السر الجديدة
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="size-4" />
            </span>
            <Input
              type={showPwd ? "text" : "password"}
              placeholder="6 أحرف على الأقل"
              className="h-12 ps-11 pe-11 rounded-xl bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:border-emerald-deep transition"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            >
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
            تأكيد كلمة السر
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="size-4" />
            </span>
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              className="h-12 ps-11 pe-11 rounded-xl bg-background/60 border-border/70 focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:border-emerald-deep transition"
              {...form.register("confirm")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirm && (
            <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
              {errors.confirm.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-deep/90 text-bone-warm font-medium text-base shadow-lg shadow-emerald-deep/20 hover:shadow-xl hover:shadow-emerald-deep/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin ms-2" /> جاري الحفظ...
            </>
          ) : (
            "حفظ كلمة السر الجديدة"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}