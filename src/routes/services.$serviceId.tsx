import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, Heart, MapPin, ShoppingBag, Star, X,
  ShieldCheck, Sparkles, BadgeCheck, Check,
} from "lucide-react";
import { formatDA, formatDate } from "@/lib/format";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  business_name: string;
  user_id: string;
  is_active: boolean;
  profiles: {
    phone: string | null;
    wilaya: string | null;
    full_name: string | null;
  } | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  wilaya: string;
  category: string;
  photos: string[] | null;
  providers: Provider;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_id: string;
  profiles: { full_name: string | null } | null;
}

interface CartItem {
  serviceId: string;
  providerId: string;
  name: string;
  price: number;
  photo: string | undefined;
  wilaya: string;
  providerName: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

const queryKeys = {
  service: (id: string) => ["service", id] as const,
  reviews: (id: string) => ["reviews", id] as const,
  fav: (serviceId: string, userId: string | undefined) => ["fav", serviceId, userId] as const,
};

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/services/$serviceId")({
  component: ServiceDetailPage,
});

// ─── Main Page ────────────────────────────────────────────────────────────────

function ServiceDetailPage() {
  const { serviceId } = Route.useParams();
  const { user, isClient, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories } = useCategories();

  const { data: service, isLoading, error: serviceError } = useQuery<Service | null>({
    queryKey: queryKeys.service(serviceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, providers!inner(id,business_name,user_id,is_active,profiles:user_id(phone,wilaya,full_name))")
        .eq("id", serviceId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Service | null;
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes — service data is relatively stable
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: queryKeys.reviews(serviceId),
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,comment,created_at,client_id,profiles:client_id(full_name)")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Review[];
    },
    staleTime: 1000 * 30, // 30 seconds — reviews can change frequently
  });

  const { data: isFav } = useQuery<boolean>({
    queryKey: queryKeys.fav(serviceId, user?.id),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("service_id", serviceId)
        .eq("client_id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return !!data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes — favorites don't change often
  });

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const closeLightbox = useCallback(() => setLightbox(false), []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
          <div className="space-y-6">
            <div className="h-[480px] bg-muted rounded-3xl" />
            <div className="h-40 bg-muted/70 rounded-3xl" />
          </div>
          <div className="space-y-4">
            <div className="h-10 w-1/2 bg-muted rounded" />
            <div className="h-8 w-3/4 bg-muted rounded" />
            <div className="h-64 bg-muted/70 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (serviceError || !service) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-grid place-items-center size-16 rounded-full bg-muted mb-4">
          <X className="size-7 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl mb-2">الخدمة غير موجودة</h1>
        <p className="text-sm text-muted-foreground mb-6">قد تكون الخدمة محذوفة أو الرابط غير صحيح.</p>
        <Button asChild className="rounded-xl"><Link to="/browse">تصفح الخدمات</Link></Button>
      </div>
    );
  }

  const photos: string[] = service.photos?.length ? service.photos : [];
  const avg = reviews?.length
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;
  const avgStr = reviews?.length ? avg.toFixed(1) : null;

  const toggleFav = async () => {
    if (!isAuthenticated || !isClient) {
      toast.info("سجّل دخولك كعميل أولًا");
      navigate({ to: "/auth/login" });
      return;
    }
    try {
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("service_id", serviceId)
          .eq("client_id", user!.id);
        if (error) throw new Error(error.message);
        toast.success("تمت الإزالة من المفضلة");
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ service_id: serviceId, client_id: user!.id });
        if (error) throw new Error(error.message);
        toast.success("تمت الإضافة للمفضلة");
      }
      qc.invalidateQueries({ queryKey: queryKeys.fav(serviceId, user?.id) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ ما، حاول مجدداً");
    }
  };

  const next = () => setActive((i) => (i + 1) % Math.max(photos.length, 1));
  const prev = () => setActive((i) => (i - 1 + Math.max(photos.length, 1)) % Math.max(photos.length, 1));

  return (
    <div className="bg-bone-warm min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-emerald-deep transition-colors">الرئيسية</Link>
        <span className="opacity-50">/</span>
        <Link to="/browse" className="hover:text-emerald-deep transition-colors">تصفح الخدمات</Link>
        <span className="opacity-50">/</span>
        <span className="text-foreground/80 font-medium">{getCategoryLabel(categories, service.category)}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-10">
          {/* === Editorial gallery === */}
          <div>
            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[360px] md:h-[520px] rounded-3xl overflow-hidden ring-1 ring-foreground/5 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.3)]">
              {/* Hero photo */}
              <button
                onClick={() => { setActive(0); setLightbox(true); }}
                className="col-span-4 md:col-span-3 row-span-2 bg-muted relative group overflow-hidden"
              >
                {photos[0] ? (
                  <img src={photos[0]} alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">لا توجد صور</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {photos[0] && (
                  <span className="absolute bottom-4 right-4 bg-bone-warm/95 backdrop-blur text-midnight-ink text-xs font-medium px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    اضغط للتكبير
                  </span>
                )}
              </button>
              {/* Side thumbs (only md+) */}
              {photos.slice(1, 3).map((p, i) => (
                <button key={i}
                  onClick={() => { setActive(i + 1); setLightbox(true); }}
                  className="hidden md:block bg-muted relative group overflow-hidden"
                >
                  <img src={p} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {photos.length > 3 && (
                <button
                  onClick={() => { setActive(3); setLightbox(true); }}
                  className="hidden md:block bg-muted relative group overflow-hidden"
                >
                  <img src={photos[3]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {photos.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] grid place-items-center text-bone-warm font-display text-2xl tracking-wide">
                      +{photos.length - 3}
                    </div>
                  )}
                </button>
              )}
            </div>

            {/* Mobile thumbnails strip */}
            {photos.length > 1 && (
              <div className="md:hidden mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                {photos.map((p, i) => (
                  <button key={i} onClick={() => { setActive(i); setLightbox(true); }}
                    className={`size-16 shrink-0 rounded-xl overflow-hidden ring-2 snap-start transition-all ${active === i ? "ring-emerald-deep" : "ring-foreground/10"}`}>
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description card */}
            {service.description && (
              <section className="mt-8 bg-card rounded-3xl ring-1 ring-foreground/5 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="size-9 rounded-full bg-gold-burnished/10 grid place-items-center">
                    <Sparkles className="size-4 text-gold-burnished" />
                  </div>
                  <h2 className="font-display text-2xl">عن هذه الخدمة</h2>
                </div>
                <p className="text-foreground/80 leading-loose whitespace-pre-wrap">{service.description}</p>
              </section>
            )}

            {/* Trust strip */}
            <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: BadgeCheck, t: "مزوّد موثّق", s: "اشتراك مفعّل" },
                { icon: ShieldCheck, t: "حماية الطلبات", s: "تواصل آمن" },
                { icon: MapPin, t: service.wilaya, s: "خدمة محلية" },
              ].map((b, i) => (
                <div key={i} className="bg-card rounded-2xl ring-1 ring-foreground/5 p-4 flex items-center gap-3 hover:ring-emerald-deep/20 hover:-translate-y-0.5 transition-all">
                  <div className="size-11 rounded-2xl bg-emerald-deep/10 grid place-items-center text-emerald-deep shrink-0">
                    <b.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{b.t}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.s}</div>
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* === Sticky sidebar === */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <div>
              <span className="inline-block text-[10px] uppercase tracking-[0.2em] font-bold text-gold-burnished bg-gold-burnished/10 px-3 py-1 rounded-full ring-1 ring-gold-burnished/20">
                {getCategoryLabel(categories, service.category)}
              </span>
              <h1 className="font-display text-3xl md:text-4xl mt-3 leading-tight tracking-tight">{service.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {service.wilaya}</span>
                {avgStr && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="inline-flex items-center gap-1 text-gold-burnished font-num font-medium">
                      <Star className="size-3.5 fill-current" /> {avgStr}
                      <span className="text-muted-foreground font-normal">({reviews?.length})</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-card rounded-3xl ring-1 ring-foreground/5 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)]">
              <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">السعر يبدأ من</div>
<div className="font-num text-4xl font-bold text-gold-burnished tracking-tight">{service.price==0?"متوفر عند الاتصال":formatDA(service.price)}</div>
              <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Sparkles className="size-3" />
                السعر النهائي يُحدد مع المزوّد
              </div>

              <div className="my-5 h-px bg-foreground/5" />

              <CartActions service={service} />

              <Button variant="outline" onClick={toggleFav}
                className={`w-full mt-3 rounded-xl h-11 transition-colors ${isFav ? "bg-oxblood-rich/5 border-oxblood-rich/30 text-oxblood-rich hover:bg-oxblood-rich/10" : ""}`}>
                <Heart className={`size-4 ms-2 transition-all ${isFav ? "fill-oxblood-rich text-oxblood-rich scale-110" : ""}`} />
                {isFav ? "في المفضلة" : "أضف للمفضلة"}
              </Button>
            </div>

         {/* Provider card */}
         <Link
  to="/profile/$profileId"
  params={{ profileId: service.providers.id }}
  className="block bg-card rounded-3xl ring-1 ring-foreground/5 p-5 hover:ring-emerald-deep/30 hover:-translate-y-0.5 transition-all shadow-sm group"
>
  <div className="flex items-center gap-3">
    <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-deep/15 to-gold-burnished/15 text-emerald-deep grid place-items-center text-lg font-bold shrink-0">
      {service.providers.business_name.charAt(0)}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
        مزوّد الخدمة
      </div>
      <div className="font-semibold text-sm truncate">
        {service.providers.business_name}
      </div>
    </div>
    <div className="flex items-center gap-1 text-muted-foreground group-hover:text-emerald-deep transition-colors shrink-0">
      <span className="text-xs">زيارة</span>
      <ChevronLeft className="size-4" />
    </div>
  </div>
</Link>

       
         
          </aside>
        </div>

        {/* === Reviews === */}
        <section className="mt-16 md:mt-20">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-gold-burnished font-semibold">آراء العملاء</span>
              <h2 className="font-display text-3xl md:text-4xl mt-2">التقييمات</h2>
              {avgStr && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <div className="flex text-gold-burnished">
                    {[1,2,3,4,5].map(i => <Star key={i} className={`size-4 ${i <= Math.round(avg) ? "fill-current" : "opacity-30"}`} />)}
                  </div>
                  <span className="font-num font-semibold text-foreground">{avgStr}</span>
                  <span className="opacity-50">•</span>
                  <span>{reviews?.length} مراجعة</span>
                </div>
              )}
            </div>
            {isClient && user?.id && (
              <ReviewDialog serviceId={service.id} clientId={user.id} />
            )}
          </div>

          {(!reviews || reviews.length === 0) ? (
            <div className="text-center py-20 bg-card rounded-3xl ring-1 ring-foreground/5">
              <div className="inline-grid place-items-center size-12 rounded-full bg-muted mb-3">
                <Star className="size-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">لا توجد مراجعات بعد. كن أول من يقيّم هذه الخدمة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* === Lightbox === */}
      {lightbox && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md grid place-items-center animate-in fade-in"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-5 right-5 size-11 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors backdrop-blur"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors backdrop-blur"
                aria-label="السابق"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 size-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors backdrop-blur"
                aria-label="التالي"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
          <img
            src={photos[active]}
            alt=""
            className="max-w-[94vw] max-h-[86vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-xs font-num bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
            {active + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review: r }: { review: Review }) {
  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-foreground/5 hover:ring-foreground/10 transition-all">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-gradient-to-br from-emerald-deep/15 to-gold-burnished/15 text-emerald-deep grid place-items-center text-sm font-bold">
            {r.profiles?.full_name?.charAt(0) ?? "ع"}
          </div>
          <div>
            <div className="font-medium text-sm">{r.profiles?.full_name ?? "عميل"}</div>
            <div className="text-[11px] text-muted-foreground">{formatDate(r.created_at)}</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 text-gold-burnished bg-gold-burnished/5 px-2 py-1 rounded-full">
          {[1,2,3,4,5].map(i => (
            <Star key={i} className={`size-3.5 ${i <= r.rating ? "fill-current" : "opacity-30"}`} />
          ))}
        </div>
      </div>
      {r.comment && <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>}
    </div>
  );
}

// ─── Cart Actions ─────────────────────────────────────────────────────────────

function CartActions({ service }: { service: Service }) {
  const navigate = useNavigate();
  const { add, has, remove } = useCart();
  const inCart = has(service.id);

  const cartItem: CartItem = {
    serviceId: service.id,
    providerId: service.providers.id,
    name: service.name,
    price: Number(service.price ?? 0),
    photo: service.photos?.[0],
    wilaya: service.wilaya,
    providerName: service.providers.business_name,
  };

  const handleAddToCart = useCallback(() => {
    add(cartItem);
    toast.success("تمت الإضافة إلى السلة");
  }, [add, cartItem]);

  // Add to cart first (if not already), then navigate — avoids race condition
  const handleOrderNow = useCallback(() => {
    if (!inCart) add(cartItem);
    navigate({ to: "/cart" });
  }, [inCart, add, cartItem, navigate]);

  return (
    <div className="space-y-2">
      <Button
        onClick={handleOrderNow}
        className="w-full bg-emerald-deep hover:bg-emerald-deep/90 text-bone-warm rounded-xl h-12 text-base font-semibold shadow-lg shadow-emerald-deep/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
      >
        <ShoppingBag className="size-4 ms-2" /> اطلب الآن
      </Button>
      {inCart ? (
        <Button
          variant="outline"
          onClick={() => remove(service.id)}
          className="w-full rounded-xl h-11 text-emerald-deep border-emerald-deep/30 bg-emerald-deep/5 hover:bg-emerald-deep/10"
        >
          <Check className="size-4 ms-2" /> في السلة — إزالة
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={handleAddToCart}
          className="w-full rounded-xl h-11 hover:border-emerald-deep/30 hover:text-emerald-deep transition-colors"
        >
          <ShoppingBag className="size-4 ms-2" /> أضف إلى السلة
        </Button>
      )}
    </div>
  );
}

// ─── Review Dialog ────────────────────────────────────────────────────────────

const MAX_COMMENT_LENGTH = 1000;
const DEFAULT_RATING = 5;

function ReviewDialog({ serviceId, clientId }: { serviceId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(DEFAULT_RATING);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();

  const handleClose = useCallback(() => {
    setOpen(false);
    setComment("");
    setRating(DEFAULT_RATING);
  }, []);

  const submit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").upsert(
        {
          client_id: clientId,
          service_id: serviceId,
          rating,
          comment: comment.trim() || null,
        },
        { onConflict: "client_id,service_id" }
      );
      if (error) throw new Error(error.message);
      toast.success("تم نشر المراجعة");
      handleClose();
      qc.invalidateQueries({ queryKey: queryKeys.reviews(serviceId) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل نشر المراجعة، حاول مجدداً");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, clientId, serviceId, rating, comment, handleClose, qc]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full hover:border-gold-burnished/40 hover:text-gold-burnished transition-colors">
          <Star className="size-3.5 ms-1" /> اكتب مراجعة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-2xl">مراجعتك</DialogTitle></DialogHeader>
        <div className="flex items-center justify-center gap-2 my-6">
          {[1,2,3,4,5].map(i => (
            <button key={i} onClick={() => setRating(i)} className="transition-transform hover:scale-110">
              <Star className={`size-10 transition-all ${i <= rating ? "fill-gold-burnished text-gold-burnished drop-shadow-sm" : "text-muted-foreground/40"}`} />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="شاركنا تجربتك..."
          rows={4}
          className="rounded-xl resize-none"
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="rounded-xl">إلغاء</Button>
          <Button
            className="bg-emerald-deep text-bone-warm hover:bg-emerald-deep/90 rounded-xl"
            onClick={submit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "جارٍ النشر..." : "نشر المراجعة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}