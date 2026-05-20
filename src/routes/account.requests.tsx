import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/categories";
import { Button } from "@/components/ui/button";

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/account/requests")({ component: RequestsPage });

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

const statusColor = (s: string): string => {
  if (s === "accepted") return "bg-emerald-deep text-bone-warm";
  if (s === "rejected") return "bg-destructive text-white";
  return "bg-gold-burnished/20 text-gold-burnished";
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

// ─── Page ──────────────────────────────────────────────────────────────────────

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
      <div className="max-w-xl mx-auto py-20 text-center">
        <Button asChild>
          <Link to="/auth/login">دخول</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl mb-8">طلباتي</h1>

      {isLoading ? (
        <p className="text-muted-foreground">جاري التحميل...</p>
      ) : isError ? (
        <div className="text-center py-16 bg-card rounded-2xl ring-1 ring-foreground/5 text-destructive">
          حدث خطأ أثناء تحميل الطلبات
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl ring-1 ring-foreground/5 text-muted-foreground">
          لم ترسل أي طلبات بعد
        </div>
      ) : (
        <div className="space-y-3">
          {data!.map((r) => {
            // Guard against a missing joined service row (e.g. service deleted)
            if (!r.services) return null;

            return (
              <Link
                key={r.id}
                to="/services/$serviceId"
                params={{ serviceId: r.services.id }}
                className="bg-card p-5 rounded-xl ring-1 ring-foreground/5 flex justify-between items-center hover:ring-emerald-deep/30 transition-all"
              >
                <div>
                  <h3 className="font-medium">{r.services.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {r.services.wilaya} • {formatDate(r.created_at)}
                  </p>
                  {r.message && (
                    <p className="text-sm mt-2 text-foreground/70">{r.message}</p>
                  )}
                </div>
                <Badge className={statusColor(r.status)}>{STATUS_LABEL[r.status]}</Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}