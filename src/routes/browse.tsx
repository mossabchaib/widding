import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WILAYAS } from "@/lib/wilayas";
import { formatDA } from "@/lib/format";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { useState, useMemo } from "react";
import { ArrowLeft, MapPin, Star, Search, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceProvider {
  business_name: string;
  is_active: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  wilaya: string;
  category: string;
  photos: string[] | null;
  providers: ServiceProvider;
}

interface RatingEntry {
  sum: number;
  n: number;
}

type RatingsMap = Record<string, RatingEntry>;

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/browse")({
  component: BrowsePage,
  validateSearch: (s: Record<string, unknown>) => ({
    wilaya: (s.wilaya as string) || "",
    category: (s.category as string) || "",
  }),
});

// ─── Wilson Score ─────────────────────────────────────────────────────────────
// Lower-bound of Wilson score confidence interval.
// A service with 4.8★ from 3 reviews won't outrank one with 4.5★ from 50 reviews.

function wilsonScore(sum: number, n: number, max = 5): number {
  if (n === 0) return 0;
  const phat = sum / n / max; // normalize to [0, 1]
  const z = 1.96; // 95% confidence interval
  return (
    (phat + (z * z) / (2 * n) -
      z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchServices(wilaya: string, category: string): Promise<Service[]> {
  let q = supabase
    .from("services")
    .select("id, name, price, wilaya, category, photos, providers!inner(business_name, is_active)")
    .eq("providers.is_active", true);

  if (wilaya) q = q.eq("wilaya", wilaya);
  if (category) q = q.eq("category", category as any);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Service[]) ?? [];
}

// Scoped to only the service IDs currently visible — avoids fetching the entire
// reviews table when the dataset is large.
async function fetchRatings(serviceIds: string[]): Promise<RatingsMap> {
  if (serviceIds.length === 0) return {};

  const { data, error } = await supabase
    .from("reviews")
    .select("service_id, rating")
    .in("service_id", serviceIds);

  if (error) throw new Error(error.message);

  const map: RatingsMap = {};
  for (const r of data ?? []) {
    const k = r.service_id as string;
    if (!map[k]) map[k] = { sum: 0, n: 0 };
    map[k].sum += r.rating as number;
    map[k].n += 1;
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

function BrowsePage() {
  const init = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });

  const [wilaya, setWilaya] = useState(init.wilaya);
  const [category, setCategory] = useState(init.category);
  const [search, setSearch] = useState("");
  const { data: categories } = useCategories();

  // Keep URL in sync with filter state so the page is shareable / back-nav works
  const updateFilter = (patch: { wilaya?: string; category?: string }) => {
    const next = { wilaya, category, ...patch };
    setWilaya(next.wilaya);
    setCategory(next.category);
    navigate({ search: () => next, replace: true });
  };

  const clearFilters = () => {
    setWilaya("");
    setCategory("");
    setSearch("");
    navigate({ search: () => ({ wilaya: "", category: "" }), replace: true });
  };

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["services", wilaya, category],
    queryFn: () => fetchServices(wilaya, category),
    staleTime: 60_000,
  });

  const serviceIds = useMemo(() => (services ?? []).map((s) => s.id), [services]);

  // Ratings are scoped to only the services currently returned by the query
  const { data: ratings } = useQuery<RatingsMap>({
    queryKey: ["service-ratings", serviceIds],
    queryFn: () => fetchRatings(serviceIds),
    enabled: serviceIds.length > 0,
    staleTime: 120_000,
  });

  const isLoading = servicesLoading;

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (services ?? [])
      .filter((s) => !term || s.name.toLowerCase().includes(term))
      .sort((a, b) => {
        const ra = ratings?.[a.id];
        const rb = ratings?.[b.id];
        const scoreA = ra ? wilsonScore(ra.sum, ra.n) : 0;
        const scoreB = rb ? wilsonScore(rb.sum, rb.n) : 0;
        return scoreB - scoreA;
      });
  }, [services, search, ratings]);

  const hasActiveFilters = wilaya || category || search;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-4xl font-bold mb-3 text-foreground">
            تصفح الخدمات
          </h1>
        </div>

        {/* Filters Card */}
        <div className="mb-2 rounded-lg flex flex-col md:flex-row md:items-end gap-4">
          {/* Row 1: Search — full width on all screens */}
          <div className="w-full space-y-2">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="ابحث عن خدمة أو مقدم خدمة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-4 pr-11 h-12 rounded-lg border-border/60 bg-muted/40 focus:bg-muted/60 focus:border-border/80 text-base"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Wilaya + Category + Clear — always side by side */}
          <div className="flex flex-row gap-3 items-end">
            {/* Wilaya Filter */}
            <div className="flex-1 space-y-2">
              <Select
                value={wilaya || "_all"}
                onValueChange={(v) => updateFilter({ wilaya: v === "_all" ? "" : v })}
              >
                <SelectTrigger className="h-11 rounded-lg border-border/60 bg-muted/40 focus:bg-muted/60 focus:border-border/80 text-sm">
                  <SelectValue placeholder="كل الولايات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">كل الولايات</SelectItem>
                  {WILAYAS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="flex-1 space-y-2">
              <Select
                value={category || "_all"}
                onValueChange={(v) => updateFilter({ category: v === "_all" ? "" : v })}
              >
                <SelectTrigger className="h-11 rounded-lg border-border/60 bg-muted/40 focus:bg-muted/60 focus:border-border/80 text-sm">
                  <SelectValue placeholder="كل الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">كل الفئات</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-11 px-4 rounded-lg hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-colors whitespace-nowrap self-end"
                onClick={clearFilters}
              >
                مسح
              </Button>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div>
          {/* Results Header */}
          <div className="mb-8">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                <span className="animate-pulse">جاري البحث...</span>
              ) : (
                <>
                  <span className="text-foreground font-bold text-base">
                    {filtered.length}
                  </span>
                  <span> خدمة</span>
                </>
              )}
            </p>
          </div>

          {/* Services Grid */}
          {!isLoading && filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((s) => {
                const r = ratings?.[s.id];
                const avg = r
  ? Number.isInteger(r.sum / r.n)
    ? r.sum / r.n
    : (r.sum / r.n).toFixed(1)
  : null;
                return (
                  <Link
                    key={s.id}
                    to="/services/$serviceId"
                    params={{ serviceId: s.id }}
                    className="group bg-card border border-border/40 rounded-lg overflow-hidden hover:border-border hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                      {s.photos?.[0] ? (
                        <img
                          src={s.photos[0]}
                          alt={s.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <span className="text-xs uppercase tracking-widest font-medium">
                            صورة الخدمة
                          </span>
                        </div>
                      )}

                      {avg && r && (
                        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md border border-border/40">
                          <Star className="size-3.5 fill-gold-burnished text-gold-burnished" />
                          <span className="text-sm font-num font-bold text-foreground">
                            {avg}
                          </span>
                         
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-4 flex flex-col gap-3">
                      <div>
                        <h3 className="font-medium text-base text-foreground line-clamp-2 mb-2">
                          {s.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3.5 flex-shrink-0" />
                          <span>{s.wilaya}</span>
                          <span className="mx-1">•</span>
                          <span className="line-clamp-1">
                            {getCategoryLabel(categories, s.category)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
                        <span className="font-num font-semibold text-emerald-600 text-sm">
                          {formatDA(s.price)}
                        </span>
                        <span className="text-xs font-medium text-oxblood-rich inline-flex items-center gap-1">
                          التفاصيل <ArrowLeft className="size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : !isLoading ? (
            <div className="py-24 px-8 text-center bg-muted/40 border border-border/40 rounded-lg">
              <div className="space-y-3">
                <p className="text-lg text-muted-foreground font-medium">
                  لا توجد خدمات
                </p>
                <p className="text-sm text-muted-foreground">
                  جرب تغيير معايير البحث
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-lg overflow-hidden border border-border/40 animate-pulse"
                >
                  <div className="w-full aspect-[4/3] bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}