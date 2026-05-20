import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@tanstack/react-router";
import { formatDate } from "@/lib/format";
import { useCategories, getCategoryLabel } from "@/hooks/use-categories";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Trash2 } from "lucide-react";
import { PageHeader, DataCard } from "@/components/dashboard-shell";
import { useDeleteConfirm } from "@/hooks/admin/use-delete-confirm";
import { useSearch } from "@/hooks/admin/use-search";
import { DeleteConfirmDialog, SearchBar, EmptyRow } from "./shared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceProvider {
  business_name: string;
}

interface Service {
  id: string;
  name: string;
  wilaya: string | null;
  category: string | null;
  price: number | string;
  photos: string[] | null;
  created_at: string;
  providers: ServiceProvider | null;
}

// ─── Query ───────────────────────────────────────────────────────────────────

const SERVICES_QUERY_KEY = ["admin-services"] as const;

async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select(
      `id,
       name,
       wilaya,
       category,
       price,
       photos,
       created_at,
       providers ( business_name )`
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as Service[]) ?? [];
}

// ─── Component ───────────────────────────────────────────────────────────────

function Services() {
  const qc = useQueryClient();

  const { data = [], isError } = useQuery<Service[], Error>({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: fetchServices,
    staleTime: 30_000,
  });

  const { data: categories } = useCategories();

  const { q, setQ, filtered } = useSearch<Service>(
    data,
    (s) =>
      [s.name, s.wilaya, s.providers?.business_name]
        .filter(Boolean)
        .join(" ")
  );

  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();

  if (isError) {
    toast.error("فشل تحميل الخدمات");
  }

  const handleDelete = (id: string) => {
    askDel(
      "هل أنت متأكد من حذف هذه الخدمة نهائياً؟ سيتم حذف جميع بياناتها وصورها.",
      async () => {
        const { error } = await supabase
          .from("services")
          .delete()
          .eq("id", id);

        if (error) {
          toast.error("حدث خطأ أثناء حذف الخدمة");
          return;
        }

        toast.success("تم حذف الخدمة بنجاح");
        qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      }
    );
  };

  return (
    <>
      <PageHeader
        title="الخدمات"
        description={`إجمالي: ${filtered.length}`}
        actions={
          <SearchBar value={q} onChange={setQ} placeholder="ابحث عن خدمة..." />
        }
      />

      <DataCard className="overflow-hidden p-0">
        <Table dir="ltr" className="w-full text-right">
          <TableHeader>
            <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-12 w-20 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                الصورة
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                الخدمة
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                المزود
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                الفئة
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                الولاية
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                السعر
              </TableHead>
              <TableHead className="h-12 w-[140px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
                إجراءات
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((s) => (
              <TableRow
                key={s.id}
                className="border-b border-border/40 transition-colors hover:bg-muted/30"
              >
                <TableCell className="py-3 px-4">
                  <div className="size-12 overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm">
                    {s.photos?.[0] && (
                      <img
                        src={s.photos[0]}
                        alt=""
                        className="h-full w-full object-cover transition-transform hover:scale-110"
                      />
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-3 px-4 font-medium">
                  {s.name}
                </TableCell>

                <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                  {s.providers?.business_name ?? "—"}
                </TableCell>

                <TableCell className="py-3 px-4">
                  <Badge variant="outline" className="rounded-full font-normal">
                    {getCategoryLabel(categories, s.category)}
                  </Badge>
                </TableCell>

                <TableCell className="py-3 px-4 text-sm">
                  {s.wilaya ?? "—"}
                </TableCell>

                <TableCell className="py-3 px-4 font-num font-semibold text-emerald-deep">
                  {Number(s.price).toLocaleString("ar-DZ")}
                  <span className="text-xs text-muted-foreground">دج</span>
                </TableCell>

                <TableCell className="py-3 px-4 text-left">
                  <div className="flex items-center justify-start gap-1.5">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="size-9 rounded-lg p-0"
                    >
                      <Link
                        to="/services/$serviceId"
                        params={{ serviceId: s.id }}
                      >
                        <Eye className="size-4" />
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <EmptyRow colSpan={7} label="لا توجد خدمات" />
            )}
          </TableBody>
        </Table>
      </DataCard>

      <DeleteConfirmDialog state={delState} onClose={closeDel} />
    </>
  );
}

export default Services;