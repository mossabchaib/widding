import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/for-providers")({
  component: () => (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="font-display text-5xl mb-4">للمزوّدين</h1>
      <p className="text-muted-foreground mb-12 max-w-xl">انضم إلى مئات المهنيين في الجزائر واستقبل طلبات الحجز مباشرة من العرسان.</p>
      <ul className="space-y-3 mb-12">
        {["إنشاء حساب وإضافة خدماتك بكل سهولة","استقبال الطلبات من جميع الولايات","رفع وصل الاشتراك وتفعيل حسابك بسرعة","إبراز خدماتك أمام آلاف العملاء"].map(t => (
          <li key={t} className="flex items-start gap-3"><Check className="size-5 text-emerald-deep shrink-0 mt-0.5" /> <span>{t}</span></li>
        ))}
      </ul>
      <Button asChild size="lg" className="bg-emerald-deep text-bone-warm"><Link to="/auth/register" search={{ role: "provider" } as any}>سجّل كمزود الآن</Link></Button>
    </div>
  ),
});
