import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, ImageOff, MapPin, Lock, ArrowLeft, Sparkles } from "lucide-react";
import { formatDA } from "@/lib/format";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { toast } from "sonner";
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FavoriteService {
  id: string;
  name: string;
  price: number;
  wilaya: string;
  category: string;
  photos: string[] | null;
}

interface Favorite {
  id: string;
  service_id: string;
  services: FavoriteService | null;
}

// ─── Query key factory ────────────────────────────────────────────────────────

const favoritesKey = (userId: string) => ["favorites", userId] as const;

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function fetchFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select(
      "id, service_id, services(id, name, price, wilaya, category, photos)"
    )
    .eq("client_id", userId);

  if (error) throw new Error(error.message);
  return (data as Favorite[]) ?? [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/account/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user, isAuthenticated, loading } = useAuthContext();
  const qc = useQueryClient();
  const { data: categories } = useCategories();

  const { data, isLoading } = useQuery<Favorite[]>({
    queryKey: favoritesKey(user?.id ?? ""),
    enabled: !!user?.id,
    queryFn: () => fetchFavorites(user!.id),
    staleTime: 30_000,
  });

  // Defined outside render path; uses optimistic removal for instant feedback
  const remove = useCallback(
    async (favoriteId: string) => {
      if (!user?.id) return;

      const key = favoritesKey(user.id);

      // Optimistic update — remove the item immediately from the cache
      const previous = qc.getQueryData<Favorite[]>(key);
      qc.setQueryData<Favorite[]>(key, (old) =>
        old ? old.filter((f) => f.id !== favoriteId) : []
      );

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) {
        // Roll back on failure
        qc.setQueryData(key, previous);
        toast.error("فشلت الإزالة، يرجى المحاولة مجدداً");
        return;
      }

      toast.success("تمت الإزالة");
    },
    [user?.id, qc]
  );

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-card border border-border/60 rounded-3xl p-10 shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">يجب تسجيل الدخول</h2>
          <p className="text-sm text-muted-foreground mb-6">
            سجّل دخولك للوصول إلى قائمة الخدمات المفضلة لديك.
          </p>
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/auth/login">دخول</Link>
          </Button>
        </div>
      </div>
    );
  }

  const favorites = data ?? [];
  const count = favorites.length;

  return (
    <div dir="rtl" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-bl from-primary/10 via-card to-card p-8 sm:p-10 mb-8">
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              مجموعتك الخاصة
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              المفضلة
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              كل الخدمات التي حفظتها للرجوع إليها لاحقاً في مكان واحد.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-background/70 backdrop-blur border border-border/60 rounded-2xl px-5 py-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground leading-none">{count}</div>
              <div className="text-xs text-muted-foreground mt-1">خدمة محفوظة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-5 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : count === 0 ? (
        <div className="text-center bg-card border border-dashed border-border rounded-3xl py-20 px-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-5">
            <Heart className="w-9 h-9 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            لا توجد خدمات في المفضلة بعد
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            ابدأ بتصفح الخدمات واضغط على القلب لحفظ ما يعجبك.
          </p>
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/browse">
              تصفح الخدمات
              <ArrowLeft className="w-4 h-4 mr-1" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {favorites.map((f) => {
            // Guard against orphaned favorites (service was deleted)
            if (!f.services) return null;

            const s = f.services;
            const photo = s.photos?.[0];

            return (
              <div
                key={f.id}
                className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
              >
                {/* Image */}
                <Link to="/services/$id" params={{ id: s.id }} className="block relative aspect-[4/3] overflow-hidden bg-muted">
                  {photo ? (
                    <img
                      src={photo}
                      alt={s.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <ImageOff className="w-8 h-8" />
                      <span className="text-xs">لا توجد صورة</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 right-3 bg-background/90 backdrop-blur border border-border/60 rounded-full px-3 py-1 text-xs font-medium text-foreground">
                    {getCategoryLabel(categories, s.category)}
                  </div>
                </Link>

                {/* Body */}
                <div className="p-4">
                  <Link to="/services/$id" params={{ id: s.id }}>
                    <h3 className="font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors">
                      {s.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{s.wilaya}</span>
                  </div>
                  <div className="flex items-end justify-between mt-4 pt-3 border-t border-border/60">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">السعر</div>
                      <div className="text-lg font-bold text-primary leading-tight">
                        {formatDA(s.price)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(f.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-9 px-3"
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      إزالة
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}