import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeleteConfirm } from "@/hooks/admin/use-delete-confirm";
import { DeleteConfirmDialog } from "../../admin_component/shared";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { formatDA, formatDate } from "@/lib/format";
import { useSearch } from "@/hooks/admin/use-search";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Trash2 } from "lucide-react";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { toast } from "sonner";
import { SearchBar } from "./SearchBar";
import { useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
  wilaya?: string;
  photos?: string[];
  category_id?: string;
  category?: string;
  created_at: string;
  provider_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the storage path from a service-photos public URL.
 * Returns null if the URL doesn't contain the expected bucket segment.
 */
function extractStoragePath(url: string): string | null {
  const parts = url.split("/service-photos/");
  return parts.length > 1 ? parts[1] : null;
}

function buildSearchText(s: Service): string {
  return `${s.name} ${s.description ?? ""}`;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchProviderServices(providerId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Delete a service and all its associated data:
 *   1. Storage photos
 *   2. Linked reviews
 *   3. Linked favorites
 *   4. The service row itself
 *
 * Steps 1–3 run in parallel; the service row is deleted last so foreign-key
 * constraints (if any) are respected.
 */
async function deleteServiceById(id: string, photos: string[] = []): Promise<void> {
  const photoPaths = photos
    .map(extractStoragePath)
    .filter((p): p is string => p !== null);

  await Promise.all([
    photoPaths.length > 0
      ? supabase.storage.from("service-photos").remove(photoPaths)
      : Promise.resolve(),
    supabase.from("reviews").delete().eq("service_id", id),
    supabase.from("favorites").delete().eq("service_id", id),
  ]);

  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ServicesTab({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["provider-services", providerId],
    queryFn: () => fetchProviderServices(providerId),
  });

  const { data: categories } = useCategories();
  const { q, setQ, filtered } = useSearch<Service>(services, buildSearchText);

  const totalValue = useMemo(
    () => filtered.reduce((sum, s) => sum + Number(s.price ?? 0), 0),
    [filtered],
  );

  const totalPhotos = useMemo(
    () => filtered.reduce((sum, s) => sum + (s.photos?.length ?? 0), 0),
    [filtered],
  );

  const handleDelete = useCallback(
    (id: string, photos: string[] = []) => {
      askDel("هل تريد حذف هذه الخدمة؟ لا يمكن التراجع عن هذا الإجراء.", async () => {
        try {
          await deleteServiceById(id, photos);
          toast.success("تم حذف الخدمة بنجاح");
          qc.invalidateQueries({ queryKey: ["provider-services", providerId] });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "حدث خطأ أثناء الحذف";
          toast.error(message);
        }
      });
    },
    [askDel, providerId, qc],
  );

  return (
    <div dir="rtl" className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-bl from-primary/5 via-card to-card p-6 shadow-sm">
        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                خدماتك
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                أدر، عدّل، واعرض كل الخدمات التي تقدمها لعملائك
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-background/60 px-4 py-2 backdrop-blur">
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-foreground">{filtered.length}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">خدمة</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-foreground">{totalPhotos}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">صورة</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums text-foreground">{formatDA(totalValue)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">القيمة</div>
              </div>
            </div>

            <ServiceFormDialog providerId={providerId} />
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <SearchBar value={q} onChange={setQ} placeholder="ابحث في الخدمات..." />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-right font-semibold text-foreground">الاسم</TableHead>
              <TableHead className="text-right font-semibold text-foreground">الفئة</TableHead>
              <TableHead className="text-right font-semibold text-foreground">الولاية</TableHead>
              <TableHead className="text-right font-semibold text-foreground">السعر</TableHead>
              <TableHead className="text-right font-semibold text-foreground">الصور</TableHead>
              <TableHead className="text-right font-semibold text-foreground">تاريخ الإضافة</TableHead>
              <TableHead className="text-right font-semibold text-foreground">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow
                key={s.id}
                className="group border-b border-border/60 transition hover:bg-muted/30"
              >
                <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="rounded-full font-normal">
                    {getCategoryLabel(categories, s.category_id ?? s.category) ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.wilaya ?? "—"}</TableCell>
                <TableCell className="font-semibold tabular-nums text-gold-burnished">
                  {s.price==0?"متوفر عند الاتصال":formatDA(s.price)}
                
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-full tabular-nums">
                    {s.photos?.length ?? 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(s.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-70 transition group-hover:opacity-100">
                    <ServiceFormDialog providerId={providerId} service={s} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s.id, s.photos)}
                      className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">لا توجد خدمات</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ابدأ بإضافة خدمتك الأولى لعرضها هنا
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-foreground">{s.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="rounded-full font-normal">
                    {getCategoryLabel(categories, s.category_id ?? s.category) ?? "—"}
                  </Badge>
                  {s.wilaya && (
                    <Badge variant="outline" className="rounded-full font-normal">
                      {s.wilaya}
                    </Badge>
                  )}
                  <Badge variant="outline" className="rounded-full tabular-nums">
                    {s.photos?.length ?? 0} صورة
                  </Badge>
                </div>
              </div>
              <div className="text-left">
                <div className="text-base font-bold tabular-nums text-primary">
                  {formatDA(s.price)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(s.created_at)}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-1 border-t border-border/60 pt-3">
              <ServiceFormDialog providerId={providerId} service={s} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(s.id, s.photos)}
                className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">لا توجد خدمات</p>
              <p className="mt-1 text-sm text-muted-foreground">ابدأ بإضافة خدمتك الأولى</p>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmDialog state={delState} onClose={closeDel} />
    </div>
  );
}

export { ServicesTab };