import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/categories";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account/requests")({ component: RequestsPage });

interface RequestRow {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  services: {
    id: string;
    name: string;
    wilaya: string;
  } | null;
}

const statusStyles = (s: string): string => {
  if (s === "accepted")
    return "bg-emerald-deep/10 text-emerald-deep ring-1 ring-emerald-deep/30";
  if (s === "rejected")
    return "bg-destructive/10 text-destructive ring-1 ring-destructive/30";
  return "bg-gold-burnished/10 text-gold-burnished ring-1 ring-gold-burnished/30";
};

const statusDot = (s: string): string => {
  if (s === "accepted") return "bg-emerald-deep";
  if (s === "rejected") return "bg-destructive";
  return "bg-gold-burnished";
};

async function fetchMyRequests(userId: string): Promise<RequestRow[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("id,status,message,created_at,services(id,name,wilaya)")
    .eq("client_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as RequestRow[];
}

function RequestsPage() {
  const { user, isAuthenticated, loading } = useAuthContext();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-requests", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyRequests(user!.id),
  });

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center rounded-3xl border border-border/60 bg-card/60 backdrop-blur p-10 shadow-sm">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gold-burnished/15 flex items-center justify-center mb-5">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
          <p className="text-sm text-muted-foreground mb-6">
            سجّل الدخول لعرض طلباتك ومتابعة حالتها.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth/login">دخول</Link>
          </Button>
        </div>
      </div>
    );
  }

  const total = data?.length ?? 0;
  const accepted = data?.filter((r) => r.status === "accepted").length ?? 0;
  const pending = data?.filter((r) => r.status !== "accepted" && r.status !== "rejected").length ?? 0;
  const rejected = data?.filter((r) => r.status === "rejected").length ?? 0;

  return (
    <div dir="rtl" className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            لوحة الحساب
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">طلباتي</h1>
          <p className="text-sm text-muted-foreground mt-2">
            تابع حالة طلباتك المرسلة إلى مزوّدي الخدمات.
          </p>
        </div>

        {!isLoading && !isError && total > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "الكل", value: total, tone: "bg-foreground/5 text-foreground" },
              { label: "مقبول", value: accepted, tone: "bg-emerald-deep/10 text-emerald-deep" },
              { label: "قيد المراجعة", value: pending, tone: "bg-gold-burnished/10 text-gold-burnished" },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl px-3 py-2 text-center ${s.tone}`}
              >
                <div className="text-lg font-semibold leading-none">{s.value}</div>
                <div className="text-[10px] mt-1 opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/50"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive px-6 py-8 text-center">
          حدث خطأ أثناء تحميل الطلبات
        </div>
      ) : total === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <span className="text-2xl">📭</span>
          </div>
          <h3 className="text-lg font-semibold mb-1">لا توجد طلبات بعد</h3>
          <p className="text-sm text-muted-foreground mb-6">
            عند إرسال طلب لأي خدمة ستظهر هنا.
          </p>
          <Button asChild variant="outline">
            <Link to="/">تصفح الخدمات</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {data!.map((r) => {
            if (!r.services) return null;

            return (
              <li
                key={r.id}
                className="group relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm hover:border-foreground/20 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-5 sm:p-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-base sm:text-lg font-semibold truncate">
                        {r.services.name}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                        {r.services.wilaya}
                      </span>
                      <span className="opacity-50">•</span>
                      <span>{formatDate(r.created_at)}</span>
                    </div>

                    {r.message && (
                      <p className="mt-3 text-sm text-foreground/80 leading-relaxed line-clamp-3 border-r-2 border-border pr-3">
                        {r.message}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${statusStyles(
                        r.status,
                      )}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(r.status)}`} />
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
