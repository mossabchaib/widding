import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  component: () => (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="font-display text-5xl mb-4">كيف يعمل Fêteparfaite؟</h1>
      <p className="text-muted-foreground mb-12">ثلاث خطوات بسيطة تفصلك عن تنظيم عرس استثنائي.</p>
      <div className="space-y-12">
        {[
          { n: "01", t: "تصفّح الخدمات", d: "ابحث في 58 ولاية بكل أنواع الخدمات: قاعات، مصورون، DJ، حلويات، تجميل وفساتين." },
          { n: "02", t: "أرسل طلبًا", d: "اضغط زر «إرسال طلب» في أي خدمة وأرفق رسالتك. سيصل الطلب مباشرة إلى المزود." },
          { n: "03", t: "نظّم بكل راحة", d: "تابع حالة طلباتك (جديد / مقبول / مرفوض)، احتفظ بالمفضلة، وقيّم تجربتك." },
        ].map(s => (
          <div key={s.n} className="flex gap-6">
            <span className="font-num text-5xl text-gold-burnished/40 font-semibold">{s.n}</span>
            <div>
              <h3 className="text-2xl mb-2">{s.t}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-16">
        <Button asChild size="lg" className="bg-emerald-deep text-bone-warm"><Link to="/browse">ابدأ التصفّح</Link></Button>
      </div>
    </div>
  ),
});
