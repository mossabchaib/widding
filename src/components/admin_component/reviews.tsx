import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { formatDate } from "@/lib/format";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Trash2, Star } from "lucide-react";
import { PageHeader, DataCard } from "@/components/dashboard-shell";
import { useDeleteConfirm } from "@/hooks/admin/use-delete-confirm";
import { useSearch } from "@/hooks/admin/use-search";
import { DeleteConfirmDialog, SearchBar, EmptyRow } from "./shared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProviderProfile {
  phone: string | null;
  full_name: string | null;
}

interface Provider {
  id: string;
  business_name: string;
  profiles: ProviderProfile | null;
}

interface Service {
  id: string;
  name: string;
  providers: Provider | null;
}

interface ClientProfile {
  full_name: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_id: string;
  services: Service | null;
  profiles: ClientProfile | null;
}

// ─── Query ───────────────────────────────────────────────────────────────────

const REVIEWS_QUERY_KEY = ["admin-reviews"] as const;

async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id,
       rating,
       comment,
       created_at,
       client_id,
       services (
         id,
         name,
         providers (
           id,
           business_name,
           profiles:user_id ( phone, full_name )
         )
       ),
       profiles:client_id ( full_name )`
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as Review[]) ?? [];
}

// ─── Component ───────────────────────────────────────────────────────────────

function Reviews() {
  const qc = useQueryClient();

  const { data = [], isError } = useQuery<Review[], Error>({
    queryKey: REVIEWS_QUERY_KEY,
    queryFn: fetchReviews,
    staleTime: 30_000,
  });

  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [providerFilter, setProviderFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  // Build unique providers list once from raw data
  const providersList = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of data) {
      const p = r.services?.providers;
      if (p?.id) map.set(p.id, p.business_name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  // Apply provider + rating filters
  const rows = useMemo(
    () =>
      data.filter((r) => {
        const matchProvider =
          providerFilter === "all" || r.services?.providers?.id === providerFilter;
        const matchRating =
          ratingFilter === "all" || r.rating.toString() === ratingFilter;
        return matchProvider && matchRating;
      }),
    [data, providerFilter, ratingFilter]
  );

  // Apply text search on top of filtered rows
  const { q, setQ, filtered } = useSearch<Review>(
    rows,
    (r) =>
      [
        r.services?.name,
        r.profiles?.full_name,
        r.services?.providers?.business_name,
        r.comment,
      ]
        .filter(Boolean)
        .join(" ")
  );

  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();

  const handleDelete = (id: string) => {
    askDel("هل أنت متأكد من حذف هذه المراجعة نهائياً؟", async () => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) {
        toast.error("حدث خطأ أثناء حذف المراجعة");
        return;
      }
      toast.success("تم حذف المراجعة بنجاح");
      qc.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
    });
  };

  if (isError) {
    toast.error("فشل تحميل المراجعات");
  }

  return (
    <>
      <PageHeader
        title="المراجعات"
        description={`إجمالي: ${filtered.length}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="h-10 w-32 rounded-lg">
                <SelectValue placeholder="التقييم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التقييمات</SelectItem>
                <SelectItem value="5">5 نجوم</SelectItem>
                <SelectItem value="4">4 نجوم</SelectItem>
                <SelectItem value="3">3 نجوم</SelectItem>
                <SelectItem value="2">نجمتين</SelectItem>
                <SelectItem value="1">نجمة واحدة</SelectItem>
              </SelectContent>
            </Select>

            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="h-10 w-48 rounded-lg">
                <SelectValue placeholder="اختر المزود" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المزودين</SelectItem>
                {providersList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <SearchBar
              value={q}
              onChange={setQ}
              placeholder="ابحث عن مزود، عميل، تعليق..."
            />
          </div>
        }
      />

      <DataCard className="overflow-hidden p-0">
        <Table dir="ltr" className="w-full text-right">
          <TableHeader>
            <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                الخدمة
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-center">
                التقييم
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                التعليق
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                التاريخ
              </TableHead>
              <TableHead className="h-12 w-[130px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
                إجراءات
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((r) => (
              <TableRow
                key={r.id}
                className="border-b border-border/40 transition-colors hover:bg-muted/30"
              >
                <TableCell className="py-4 px-4">
                  {r.services ? (
                    <Link
                      to="/services/$serviceId"
                      params={{ serviceId: r.services.id }}
                      className="font-medium text-emerald-deep transition-colors hover:underline"
                    >
                      {r.services.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell className="py-4 px-4 text-center">
                  <Badge className="gap-0.5 bg-gold-burnished text-midnight-ink shadow-sm">
                    <Star className="size-3 fill-current" /> {r.rating}
                  </Badge>
                </TableCell>

                <TableCell className="py-4 px-4 max-w-md truncate text-sm text-muted-foreground">
                  {r.comment ?? "—"}
                </TableCell>

                <TableCell className="py-4 px-4 text-sm text-muted-foreground">
                  {formatDate(r.created_at)}
                </TableCell>

                <TableCell className="py-4 px-4 text-left">
                  <div className="flex items-center justify-start gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-9 rounded-lg p-0"
                      onClick={() => setViewingReview(r)}
                    >
                      <Eye className="size-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <EmptyRow colSpan={5} label="لا توجد مراجعات" />
            )}
          </TableBody>
        </Table>
      </DataCard>

      <ReviewViewDialog
        review={viewingReview}
        onClose={() => setViewingReview(null)}
      />
      <DeleteConfirmDialog state={delState} onClose={closeDel} />
    </>
  );
}

// ─── Review View Dialog ───────────────────────────────────────────────────────

interface ReviewViewDialogProps {
  review: Review | null;
  onClose: () => void;
}

function ReviewViewDialog({ review, onClose }: ReviewViewDialogProps) {
  if (!review) return null;

  const provider = review.services?.providers;

  return (
    <Dialog open={!!review} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            تفاصيل المراجعة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <p className="text-xs text-muted-foreground">العميل</p>
                <p className="font-semibold">
                  {review.profiles?.full_name ?? "—"}
                </p>
              </div>
              <Badge className="gap-0.5 bg-gold-burnished text-midnight-ink shadow-sm">
                <Star className="size-3 fill-current" /> {review.rating}
              </Badge>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                الخدمة والمزود
              </p>
              {review.services ? (
                <Link
                  to="/services/$serviceId"
                  params={{ serviceId: review.services.id }}
                  className="font-medium text-emerald-deep hover:underline"
                >
                  {review.services.name}
                </Link>
              ) : (
                <p className="font-medium">—</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                المزود: {provider?.business_name ?? "—"}
                {provider?.profiles?.phone && (
                  <span dir="ltr" className="font-num">
                    {` (${provider.profiles.phone})`}
                  </span>
                )}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">التاريخ</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(review.created_at)}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">التعليق</p>
              <p className="rounded-lg border border-border/60 bg-background p-3 leading-relaxed text-foreground/85">
                {review.comment ?? "لا يوجد تعليق"}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-midnight-ink text-bone-warm hover:bg-midnight-ink/90"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Reviews;