import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Edit, Trash2, Tag, Plus, Upload } from "lucide-react";
import { PageHeader, DataCard } from "@/components/dashboard-shell";
import { useDeleteConfirm } from "@/hooks/admin/use-delete-confirm";
import { useSearch } from "@/hooks/admin/use-search";
import { DeleteConfirmDialog, SearchBar, EmptyRow } from "./shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name_ar: string;
  slug: string;
  image_url: string | null;
  created_at: string;
  products_count: number;
}

// ─── Query helpers ────────────────────────────────────────────────────────────

async function fetchCategories(): Promise<Category[]> {
  const [catsRes, servsRes] = await Promise.all([
    supabase.from("categories").select("*").order("created_at", { ascending: false }),
    supabase.from("services").select("category"),
  ]);

  if (catsRes.error) throw new Error(catsRes.error.message);
  if (servsRes.error) throw new Error(servsRes.error.message);

  const counts = (servsRes.data ?? []).reduce<Record<string, number>>((acc, s) => {
    if (s.category) acc[s.category] = (acc[s.category] ?? 0) + 1;
    return acc;
  }, {});

  return (catsRes.data ?? []).map((c) => ({
    ...c,
    products_count: counts[c.slug] ?? 0,
  }));
}

// ─── Categories ───────────────────────────────────────────────────────────────

function Categories() {
  const qc = useQueryClient();

  const { data } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: fetchCategories,
  });

  const { q, setQ, filtered } = useSearch<Category>(
    data ?? [],
    (c) => `${c.name_ar} ${c.slug}`,
  );

  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();

  const handleDelete = (id: string) => {
    askDel(
      "هل أنت متأكد من حذف هذه الفئة؟ جميع الخدمات المرتبطة بها ستفقد رابط فئتها.",
      async () => {
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("تم حذف الفئة بنجاح");
        qc.invalidateQueries({ queryKey: ["admin-categories"] });
      },
    );
  };

  const openNew = () => {
    setIsNew(true);
    setEditing({});
  };

  const openEdit = (c: Category) => {
    setIsNew(false);
    setEditing(c);
  };

  const closeDialog = () => setEditing(null);

  return (
    <>
      <PageHeader
        title="الفئات"
        description={`إجمالي: ${data?.length ?? 0}`}
        actions={
          <>
            <SearchBar value={q} onChange={setQ} placeholder="ابحث عن فئة..." />
            <Button
              className="h-10 rounded-lg bg-emerald-deep text-bone-warm shadow-sm hover:bg-emerald-deep/90"
              onClick={openNew}
            >
              <Plus className="ml-1.5 size-4" /> إضافة فئة
            </Button>
          </>
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
                الاسم بالعربية
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-center">
                عدد الخدمات
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
                التاريخ
              </TableHead>
              <TableHead className="h-12 w-[140px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
                إجراءات
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                className="border-b border-border/40 transition-colors hover:bg-muted/30"
              >
                <TableCell className="py-3 px-4">
                  <div className="size-12 overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name_ar}
                        className="h-full w-full object-cover transition-transform hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Tag className="size-5 text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-3 px-4 font-medium">{c.name_ar}</TableCell>

                <TableCell className="py-3 px-4 text-center">
                  <Badge
                    variant="secondary"
                    className="font-num bg-emerald-deep/10 text-emerald-deep"
                  >
                    {c.products_count}
                  </Badge>
                </TableCell>

                <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                  {formatDate(c.created_at)}
                </TableCell>

                <TableCell className="py-3 px-4 text-left">
                  <div className="flex items-center justify-start gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-9 rounded-lg p-0"
                      onClick={() => openEdit(c)}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && <EmptyRow colSpan={5} label="لا توجد فئات" />}
          </TableBody>
        </Table>
      </DataCard>

      <CategoryEditDialog category={editing} isNew={isNew} onClose={closeDialog} />
      <DeleteConfirmDialog state={delState} onClose={closeDel} />
    </>
  );
}

// ─── CategoryEditDialog ───────────────────────────────────────────────────────

interface CategoryEditDialogProps {
  category: Partial<Category> | null;
  isNew: boolean;
  onClose: () => void;
}

function CategoryEditDialog({ category, isNew, onClose }: CategoryEditDialogProps) {
  const qc = useQueryClient();
  const [nameAr, setNameAr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Key the reset off the record's id (or the "new" sentinel) so that a
  // parent re-render with a new object reference doesn't wipe in-flight edits.
  useEffect(() => {
    if (category) {
      setNameAr(category.name_ar ?? "");
      setImageUrl(category.image_url ?? "");
    }
  }, [category?.id, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!category) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      // Crypto-random filename avoids collisions without calling createBucket
      // (the bucket must be pre-created once in the Supabase dashboard).
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("category-images")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("category-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل رفع الصورة";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const trimmedName = nameAr.trim();
    if (!trimmedName) {
      toast.error("يرجى تعبئة اسم الفئة");
      return;
    }

    setSaving(true);
    try {
      const payload = { name_ar: trimmedName, image_url: imageUrl || null };

      if (isNew) {
        // Use a UUID-based slug for uniqueness guarantees.
        const slug = `cat-${crypto.randomUUID().slice(0, 8)}`;
        const { error } = await supabase
          .from("categories")
          .insert([{ ...payload, slug }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", category.id!);
        if (error) throw error;
      }

      toast.success("تم الحفظ بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {isNew ? "إضافة فئة جديدة" : "تعديل الفئة"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              الاسم بالعربية <span className="text-destructive">*</span>
            </label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: قاعات أفراح"
              className="h-10 rounded-lg"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              الصورة
            </label>
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Tag className="size-6 text-muted-foreground opacity-40" />
                )}
              </div>
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="cursor-pointer rounded-lg"
                />
                {uploading ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-deep">
                    <Upload className="size-3 animate-pulse" /> جاري الرفع...
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG حتى 2MB</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button
            className="bg-emerald-deep text-bone-warm shadow-sm hover:bg-emerald-deep/90"
            onClick={save}
            disabled={uploading || saving}
          >
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Categories;