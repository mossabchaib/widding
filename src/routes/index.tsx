import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WILAYAS } from "@/lib/wilayas";
import { ArrowLeft, MapPin, Sparkles, Star, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDA } from "@/lib/format";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeaturedService {
  id: string;
  name: string;
  price: number;
  wilaya: string;
  category: string;
  photos: string[] | null;
  providers: {
    business_name: string;
    is_active: boolean;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOW_IT_WORKS_STEPS = [
  {
    n: "01",
    t: "تصفح وقارن",
    d: "ابحث عن أفضل الخدمات في ولايتك من خلال الصور، الأسعار، وتقييمات العرسان.",
  },
  {
    n: "02",
    t: "أرسل طلبًا",
    d: "تواصل مباشرة مع المزود لإتمام الحجز بدون عمولات أو وسطاء.",
  },
  {
    n: "03",
    t: "نظّم بكل راحة",
    d: "تابع حالة طلباتك في مكان واحد واحفظ مفضلاتك.",
  },
] as const;

const FEATURED_LIMIT = 6;
const FEATURED_DISPLAY = 3;

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "عرسي — نظّم عرس الأحلام بكل راحة" },
      {
        name: "description",
        content:
          "اكتشف أفضل قاعات الأفراح، المصورين، خبيرات التجميل، الـDJ ومحلات الفساتين عبر 58 ولاية.",
      },
    ],
  }),
});

// ─── Query Keys ───────────────────────────────────────────────────────────────

const queryKeys = {
  featured: () => ["featured-services"] as const,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function HomePage() {
  const [wilaya, setWilaya] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const navigate = useNavigate();
  const { data: categories } = useCategories();

  const { data: featured } = useQuery<FeaturedService[]>({
    queryKey: queryKeys.featured(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,price,wilaya,category,photos,providers!inner(business_name,is_active)")
        .eq("providers.is_active", true)
        .order("created_at", { ascending: false })
        .limit(FEATURED_LIMIT);
      if (error) throw new Error(error.message);
      return (data ?? []) as FeaturedService[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — featured list doesn't need to be live
  });

  const onSearch = () => {
    // Build only the params that have values to keep the URL clean
    const search: Record<string, string> = {};
    if (wilaya) search.wilaya = wilaya;
    if (category) search.category = category;
    navigate({ to: "/browse", search: search as any });
  };

  const displayedServices = (featured ?? []).slice(0, FEATURED_DISPLAY);

  return (
    <div dir="rtl" className="overflow-x-hidden">
      {/* HERO */}
      <section className="relative pt-20 md:pt-28 pb-28 md:pb-36 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-gold-burnished/15 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[28rem] h-[28rem] rounded-full bg-emerald-deep/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.04),transparent_60%)]" />

        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.2fr_0.9fr] gap-12 lg:gap-20 items-center">
          <div className="relative z-10 text-center lg:text-right">
            <span className="inline-flex items-center gap-2 mb-7 rounded-full bg-emerald-deep/10 px-4 py-2 text-xs font-semibold text-emerald-deep ring-1 ring-emerald-deep/15">
              <Sparkles className="size-3.5" />
              أكبر منصة لتنظيم الأعراس في الجزائر
            </span>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[1.05] tracking-tight text-balance text-midnight-ink mb-7 mx-auto lg:mx-0 max-w-[18ch]">
              ليلة العمر، بتفاصيل{" "}
              <span className="relative inline-block text-gold-burnished">
                جزائرية
                <span className="absolute -bottom-1 left-0 right-0 h-[6px] bg-gold-burnished/20 rounded-full -z-10" />
              </span>{" "}
              أصيلة
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10">
              نجمع لك نخبة من مزودي خدمات الأفراح عبر 58 ولاية. من القاعات الفاخرة إلى أدق تفاصيل الحلويات،
              عرسي يرافقك في تنظيم يومك الموعود.
            </p>

            <div className="bg-card/95 backdrop-blur rounded-2xl p-2 ring-1 ring-foreground/10 shadow-2xl shadow-emerald-deep/10 max-w-2xl mx-auto lg:mx-0 flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center px-4 py-3 gap-3 border-b md:border-b-0 md:border-l border-border/60 hover:bg-muted/40 rounded-xl transition-colors">
                <MapPin className="size-4 text-gold-burnished shrink-0" />
                <Select value={wilaya} onValueChange={setWilaya}>
                  <SelectTrigger className="border-0 shadow-none focus:ring-0 px-0 h-auto bg-transparent text-sm font-medium">
                    <SelectValue placeholder="اختر الولاية" />
                  </SelectTrigger>
                  <SelectContent>
                    {WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 flex items-center px-4 py-3 gap-3 hover:bg-muted/40 rounded-xl transition-colors">
                <Sparkles className="size-4 text-gold-burnished shrink-0" />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="border-0 shadow-none focus:ring-0 px-0 h-auto bg-transparent text-sm font-medium">
                    <SelectValue placeholder="نوع الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={onSearch}
                className="bg-oxblood-rich hover:bg-oxblood-rich/90 text-bone-warm rounded-xl px-8 h-12 md:h-auto shadow-lg shadow-oxblood-rich/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                ابحث الآن
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-deep" /> بدون عمولات</div>
              <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-gold-burnished" /> تواصل مباشر مع المزودين</div>
              <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-oxblood-rich" /> تغطية 58 ولاية</div>
            </div>
          </div>

          <div className="relative max-w-md mx-auto w-full">
            <div className="absolute -inset-6 bg-gradient-to-tr from-gold-burnished/20 to-emerald-deep/10 rounded-[3rem] blur-2xl" />
            <div className="relative aspect-[4/5] w-full rounded-[2rem] overflow-hidden ring-1 ring-foreground/10 bg-gradient-to-br from-emerald-deep via-emerald-deep/95 to-oxblood-rich grid place-items-center shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="absolute top-6 right-6 size-2 rounded-full bg-gold-burnished animate-pulse" />
              <div className="relative text-center text-bone-warm px-8">
                <div className="text-[8rem] md:text-[10rem] font-display leading-none mb-2 bg-gradient-to-b from-bone-warm to-gold-burnished bg-clip-text text-transparent">58</div>
                <div className="font-display text-2xl tracking-wide">ولاية</div>
                <div className="mt-3 h-px w-12 bg-gold-burnished/50 mx-auto" />
                <div className="text-sm mt-3 opacity-80">تغطية كاملة للجزائر</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 md:py-24 bg-muted/40 border-y border-border/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs uppercase tracking-[0.3em] text-gold-burnished font-semibold">الفئات</span>
            <h2 className="font-display text-3xl md:text-4xl mt-3 mb-4">اكتشف أرقى الخدمات</h2>
            <div className="w-16 h-px bg-gold-burnished mx-auto" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6 md:gap-8">
            {categories?.map(c => (
              <Link
                key={c.id}
                to="/browse"
                search={{ category: c.slug } as any}
                className="flex flex-col items-center gap-3 group"
              >
                <div className="size-20 md:size-24 overflow-hidden rounded-full bg-card ring-1 ring-foreground/5 grid place-items-center group-hover:shadow-xl group-hover:ring-gold-burnished/30 group-hover:-translate-y-1 transition-all duration-300">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name_ar}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <Tag className="size-8 text-muted-foreground opacity-50 group-hover:text-gold-burnished group-hover:opacity-100 transition" />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground/80 text-center group-hover:text-foreground transition-colors">
                  {c.name_ar}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="py-24 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-14">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-gold-burnished font-semibold">مختارات</span>
              <h2 className="font-display text-3xl md:text-4xl mt-3 mb-2">خدمات مختارة بعناية</h2>
              <p className="text-muted-foreground text-sm">أحدث ما أُضيف إلى المنصة</p>
            </div>
            <Link
              to="/browse"
              className="group inline-flex items-center gap-2 text-sm font-medium text-gold-burnished border-b border-gold-burnished/30 pb-1 hover:border-gold-burnished transition-colors w-fit"
            >
              مشاهدة الكل
              <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {displayedServices.length > 0 ? (
              displayedServices.map((s) => (
                <FeaturedServiceCard key={s.id} service={s} categories={categories} />
              ))
            ) : (
              <div className="md:col-span-2 lg:col-span-3 text-center text-muted-foreground py-20 rounded-2xl bg-muted/40 ring-1 ring-border/40">
                <Sparkles className="size-8 mx-auto mb-3 opacity-40" />
                لا توجد خدمات بعد. كن أول مزود وانضم إلينا.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-24 md:py-28 bg-emerald-deep text-bone-warm overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(212,175,99,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-gold-burnished font-semibold">خطوات بسيطة</span>
            <h2 className="font-display text-3xl md:text-4xl mt-3 mb-4">كيف يعمل عرسي؟</h2>
            <p className="text-bone-warm/70 mb-12 max-w-md leading-relaxed">
              ثلاث خطوات بسيطة تفصلك عن تنظيم عرس استثنائي.
            </p>
            <div className="space-y-8">
              {HOW_IT_WORKS_STEPS.map(s => (
                <div key={s.n} className="group flex gap-6 items-start p-4 -mx-4 rounded-2xl hover:bg-bone-warm/5 transition-colors">
                  <span className="font-num text-4xl md:text-5xl font-semibold text-gold-burnished/60 group-hover:text-gold-burnished transition-colors shrink-0">
                    {s.n}
                  </span>
                  <div className="pt-1">
                    <h4 className="text-xl font-medium mb-2">{s.t}</h4>
                    <p className="text-bone-warm/65 leading-relaxed max-w-[42ch]">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex justify-center mt-8 lg:mt-0">
            <div className="absolute -inset-4 border border-gold-burnished/30 rounded-full animate-[spin_60s_linear_infinite]" />
            <div className="absolute -inset-12 border border-gold-burnished/20 rounded-full" />
            <div className="absolute -inset-20 border border-gold-burnished/10 rounded-full" />
            <div className="relative size-72 md:size-96 bg-gradient-to-br from-bone-warm/10 to-bone-warm/5 backdrop-blur rounded-full grid place-items-center text-center px-12 ring-1 ring-bone-warm/15 shadow-2xl">
              <div>
                <Star className="size-10 mx-auto mb-5 text-gold-burnished fill-gold-burnished/30" />
                <p className="font-display text-xl md:text-2xl leading-relaxed">«ليلة لا تُنسى تبدأ بتنظيم متقن»</p>
                <div className="mt-6 h-px w-12 bg-gold-burnished/50 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROVIDER CTA */}
      <section className="py-24 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/60 ring-1 ring-foreground/10 p-10 md:p-16 rounded-3xl text-center shadow-xl">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold-burnished/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-emerald-deep/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 mb-5 rounded-full bg-gold-burnished/10 px-4 py-1.5 text-xs font-semibold text-gold-burnished ring-1 ring-gold-burnished/20">
                <Sparkles className="size-3.5" />
                للمحترفين
              </span>
              <h2 className="font-display text-3xl md:text-4xl mb-4">هل أنت مزود خدمة محترف؟</h2>
              <p className="text-muted-foreground mb-9 max-w-[52ch] mx-auto leading-relaxed">
                انضم إلى عرسي اليوم وابدأ باستقبال طلبات الحجز من العرسان مباشرة في ولايتك.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-midnight-ink text-bone-warm hover:bg-midnight-ink/90 rounded-xl px-10 h-12 shadow-xl shadow-midnight-ink/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                <Link to="/auth/register" search={{ role: "provider" } as any}>سجّل كمزود الآن</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Featured Service Card ────────────────────────────────────────────────────

function FeaturedServiceCard({
  service: s,
  categories,
}: {
  service: FeaturedService;
  categories: ReturnType<typeof useCategories>["data"];
}) {
  return (
    <Link
      to="/services/$serviceId"
      params={{ serviceId: s.id }}
      className="invitation-card hover:invitation-card-hover bg-card p-4 rounded-2xl ring-1 ring-foreground/5 hover:ring-gold-burnished/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 block group"
    >
      <div className="relative w-full aspect-[4/3] bg-muted rounded-xl mb-5 overflow-hidden grid place-items-center">
        {s.photos?.[0] ? (
          <img
            src={s.photos[0]}
            alt={s.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-xs uppercase tracking-widest text-muted-foreground">صورة الخدمة</span>
        )}
        <span className="absolute top-3 right-3 bg-bone-warm/95 backdrop-blur text-[10px] uppercase tracking-wider font-semibold text-midnight-ink px-3 py-1 rounded-full ring-1 ring-foreground/5">
          {getCategoryLabel(categories, s.category)}
        </span>
      </div>
      <div className="px-2 pb-2">
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0">
            <h3 className="font-medium text-lg truncate">{s.name}</h3>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="size-3" />
              {s.wilaya}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-border/60">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">السعر</span>
            <span className="font-num font-semibold text-gold-burnished text-base"> {s.price==0?"متوفر عند الاتصال":formatDA(s.price)}</span>
          </div>
          <span className="text-sm font-medium text-oxblood-rich inline-flex items-center gap-1 group-hover:gap-2 transition-all">
            التفاصيل <ArrowLeft className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}