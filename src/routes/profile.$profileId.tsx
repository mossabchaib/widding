import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Package, Search, X, FileText } from "lucide-react";
import { formatDA } from "@/lib/format";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";

interface Provider {
  id: string;
  business_name: string;
  bio: string | null;
  avatar_url: string | null;
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
}

export const Route = createFileRoute("/profile/$profileId")({
  component: ProviderProfilePage,
});

function ProviderProfilePage() {
  const { profileId } = Route.useParams();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const key = `viewed_provider_${profileId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    supabase
      .rpc("increment_provider_views", { provider_id: profileId })
      .then(({ error, data }) => {
        if (error) {
          console.error("RPC error:", error);
          sessionStorage.removeItem(key);
        }
      });
  }, [profileId]);

  const { data: provider, isLoading: loadingProvider } = useQuery<Provider | null>({
    queryKey: ["provider", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id,business_name,bio,avatar_url,profiles:user_id(phone,wilaya,full_name)")
        .eq("id", profileId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Provider | null;
    },
  });

  const { data: services, isLoading: loadingServices } = useQuery<Service[]>({
    queryKey: ["provider-services", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,description,price,wilaya,category,photos")
        .eq("provider_id", profileId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Service[];
    },
  });

  const filteredServices = useMemo(() => {
    const term = search.toLowerCase();
    return (services ?? []).filter(
      (s) => !term || s.name.toLowerCase().includes(term)
    );
  }, [services, search]);

  if (loadingProvider) {
    return (
      <div className="min-h-screen bg-[#F7F5F0]">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-6 animate-pulse">
          <div className="h-6 w-48 bg-stone-200 rounded-full" />
          <div className="h-72 bg-stone-200 rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-stone-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl">🔍</div>
          <p className="text-stone-500 text-lg">المزوّد غير موجود</p>
          <Link to="/browse" className="inline-block mt-2 text-sm text-emerald-700 underline underline-offset-4">
            العودة إلى التصفح
          </Link>
        </div>
      </div>
    );
  }
console.log("Provider data:", provider);
  return (
    <div className="min-h-screen bg-[#F7F5F0]" dir="rtl">

      {/* ── Top Nav Strip ── */}
      <div className="border-b border-stone-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-12 flex items-center gap-2 text-xs text-stone-400">
          <Link to="/" className="hover:text-stone-700 transition-colors">الرئيسية</Link>
          <span>/</span>
          <Link to="/browse" className="hover:text-stone-700 transition-colors">تصفح الخدمات</Link>
          <span>/</span>
          <span className="text-stone-700 font-medium truncate max-w-[180px]">{provider.business_name}</span>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-[#10203A] via-[#1B3B6F] to-[#2563EB] relative overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#C9A84C] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-8">

            {/* Avatar */}
            <div className="shrink-0 relative">
              <div className="absolute inset-0 rounded-2xl bg-[#C9A84C]/30 blur-xl scale-110" />
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={provider.business_name}
                  className="relative size-28 md:size-36 rounded-2xl object-cover ring-4 ring-white/20 shadow-2xl"
                />
              ) : (
                <div className="relative size-28 md:size-36 rounded-2xl bg-gradient-to-br from-[#C9A84C]/40 to-[#C9A84C]/10 text-[#C9A84C] grid place-items-center text-5xl font-bold ring-4 ring-white/10 shadow-2xl">
                  {provider.business_name.charAt(0)}
                </div>
              )}
            </div>

            {/* Text block */}
            <div className="flex-1 text-center sm:text-right space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
                {provider.business_name}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                {provider.profiles?.wilaya && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
                    <MapPin className="size-3.5 text-[#C9A84C]" />
                    {provider.profiles.wilaya}
                  </span>
                )}
                {provider.profiles?.phone && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/60 font-num">
                    <Phone className="size-3.5 text-[#C9A84C]" />
                    {provider.profiles.phone}
                  </span>
                )}
              </div>

              {/* Service count pill */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/70">
                <Package className="size-3.5 text-[#C9A84C]" />
                {(services ?? []).length} خدمة متاحة
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bio Section ── */}
      {provider.bio && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8">
          <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <FileText className="size-4 text-emerald-700" />
              </div>
              <h2 className="text-base font-semibold text-stone-800">نبذة عن المزوّد</h2>
            </div>
            <p className="text-stone-600 leading-loose text-sm whitespace-pre-wrap text-right">
              {provider.bio}
            </p>
          </div>
        </div>
      )}

      {/* ── Services Section ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-6">

        {/* Section header + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-stone-800">الخدمات</h2>
            {!loadingServices && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                {filteredServices.length}
              </span>
            )}
          </div>

          <div className="sm:mr-auto relative w-full sm:w-72">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
            <Input
              placeholder="ابحث في الخدمات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 h-10 rounded-xl border-stone-200 bg-white shadow-sm focus:border-emerald-400 focus:ring-emerald-400/20 text-sm placeholder:text-stone-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {loadingServices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-stone-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !filteredServices.length ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-stone-100 shadow-sm">
            <div className="text-5xl mb-4">🗂️</div>
            <p className="text-stone-400 text-sm">
              {search ? "لا توجد خدمات تطابق بحثك." : "لا توجد خدمات بعد."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filteredServices.map((s) => (
              <ServiceCard key={s.id} service={s} categories={categories} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCard({
  service: s,
  categories,
}: {
  service: Service;
  categories: any;
}) {
  return (
    <Link
      to="/services/$serviceId"
      params={{ serviceId: s.id }}
      className="group bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      {/* Photo */}
      <div className="relative w-full aspect-[16/10] bg-stone-100 overflow-hidden">
        {s.photos?.[0] ? (
          <img
            src={s.photos[0]}
            alt={s.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
            <Package className="size-10 text-stone-300" />
          </div>
        )}

        {/* Category chip over image */}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-semibold bg-white/90 backdrop-blur-sm text-stone-600 px-2.5 py-1 rounded-full border border-white/60 shadow-sm">
            {getCategoryLabel(categories, s.category)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-base text-stone-800 line-clamp-2 leading-snug group-hover:text-emerald-800 transition-colors">
          {s.name}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-auto">
          <MapPin className="size-3 flex-shrink-0" />
          <span>{s.wilaya}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          <span className="font-num font-bold text-sm text-[#C9A84C]">
            {s.price === 0 ? "عند الاتصال" : formatDA(s.price)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full group-hover:bg-emerald-700 group-hover:text-white transition-colors duration-200">
            التفاصيل
            <ArrowLeft className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}