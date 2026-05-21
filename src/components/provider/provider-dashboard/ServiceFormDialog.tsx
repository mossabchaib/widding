import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, Plus } from "lucide-react";
import { WILAYAS } from "@/lib/wilayas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceCategory =
  | "hall"
  | "photographer"
  | "salon"
  | "makeup"
  | "dj"
  | "pastry"
  | "dress";

interface Category {
  id: string;
  slug: string;
  name_ar: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
  wilaya?: string;
  photos?: string[];
  category_id?: string;
  /** Legacy field kept for backwards-compat lookup */
  category?: string;
}

interface ServiceFormDialogProps {
  providerId: string;
  service?: Service;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the initial category slug when editing an existing service. */
function resolveInitialCategory(service: Service | undefined, categories: Category[]): string {
  if (!service) return "";
  if (service.category_id) {
    return categories.find((c) => c.id === service.category_id)?.slug ?? "";
  }
  return categories.find((c) => c.slug === service.category)?.slug ?? "";
}

/** Upload a single file and return its public URL, or null on failure. */
async function uploadPhoto(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("service-photos").upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from("service-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  category: string;
  wilaya: string;
  price: string;
  slug: string;
}

function validate({ name, category, wilaya, price, slug }: FormState): string | null {
  if (!name.trim()) return "اسم الخدمة مطلوب";
  if (!category) return "اختر الفئة أولًا";
  if (!wilaya) return "اختر الولاية";
  if (!slug.trim()) return "الـ Slug مطلوب";
  if (!/^[a-z0-9-]+$/.test(slug.trim())) return "الـ Slug يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط";
  const parsedPrice = Number(price);
  if (price !== "" && (isNaN(parsedPrice) || parsedPrice < 0)) return "السعر غير صالح";
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ServiceFormDialog({ providerId, service }: ServiceFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(service?.name ?? "");
  const [desc, setDesc] = useState(service?.description ?? "");
  const [price, setPrice] = useState<string>(service?.price != null ? String(service.price) : "");
  const [wilaya, setWilaya] = useState(service?.wilaya ?? "");
  const [category, setCategory] = useState("");
  const [slug, setSlug] = useState("");
  const [photos, setPhotos] = useState<string[]>(service?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const qc = useQueryClient();
  const { user } = useAuthContext();
  const { data: categories } = useCategories();

  // Resolve category slug once categories have loaded (edit mode only).
  useEffect(() => {
    if (!service || !categories || category) return;
    const resolved = resolveInitialCategory(service, categories);
    if (resolved) setCategory(resolved);
  }, [service, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate slug from name (only when slug is empty and not editing).
  useEffect(() => {
    if (!service && name && !slug) {
      const generated = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      if (generated) setSlug(generated);
    }
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form fields when the dialog opens for a new service.
  useEffect(() => {
    if (open && !service) {
      setName("");
      setDesc("");
      setPrice("");
      setWilaya("");
      setCategory("");
      setSlug("");
      setPhotos([]);
    }
  }, [open, service]);

  const onUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length || !user) return;

      setUploading(true);
      try {
        const results = await Promise.all(files.map((f) => uploadPhoto(user.id, f)));
        const successful = results.filter((url): url is string => url !== null);
        const failCount = results.length - successful.length;

        if (failCount > 0) {
          toast.warning(`فشل رفع ${failCount} صورة. تم رفع ${successful.length} بنجاح.`);
        }

        if (successful.length > 0) {
          setPhotos((prev) => [...prev, ...successful]);
        }
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [user],
  );

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const save = useCallback(async () => {
    const validationError = validate({ name, category, wilaya, price, slug });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedCat = categories?.find((c) => c.slug === category);
    if (!selectedCat) {
      toast.error("الفئة المختارة غير صالحة");
      return;
    }

    const payload = {
      name: name.trim(),
      description: desc.trim(),
      price: price !== "" ? Number(price) : 0,
      wilaya,
      // ✅ إصلاح الخطأ: نستخدم slug بدل name_ar مع casting للـ union type
      category: selectedCat.slug as ServiceCategory,
      category_id: selectedCat.id,
      photos,
      provider_id: providerId,
    };

    setSaving(true);
    try {
      const query = service
        ? supabase.from("services").update(payload).eq("id", service.id)
        : supabase.from("services").insert(payload);

      const { error } = await query;
      if (error) throw error;

      toast.success("تم الحفظ");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["provider-services", providerId] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [name, category, wilaya, price, slug, desc, photos, providerId, service, categories, qc]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {service ? (
          <Button size="sm" variant="outline">
            <Edit className="size-4" />
          </Button>
        ) : (
          <Button size="sm" className="bg-emerald-deep text-bone-warm shadow-sm hover:bg-emerald-deep/90">
            <Plus className="me-1 size-4" /> إضافة خدمة
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {service ? "تعديل خدمة" : "خدمة جديدة"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>الاسم</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم الخدمة"
            />
          </div>
          <div className="space-y-1.5">
            <Label>الوصف</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="وصف موجز للخدمة"
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>السعر (دج) يمكنك عدم وضع السعر</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="font-num"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                الفئة <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={!category ? "border-destructive/60" : ""}>
                  <SelectValue placeholder="اختر فئة الخدمة" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!category && (
                <p className="text-xs text-destructive">يجب اختيار الفئة قبل إنشاء الخدمة</p>
              )}
            </div>
          </div>
          {/* ✅ حقل الـ Slug الجديد */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="مثال: my-service-name"
              dir="ltr"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              أحرف إنجليزية صغيرة وأرقام وشرطات فقط — يُستخدم في رابط الخدمة
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>الولاية</Label>
            <Select value={wilaya} onValueChange={setWilaya}>
              <SelectTrigger>
                <SelectValue placeholder="اختر" />
              </SelectTrigger>
              <SelectContent>
                {WILAYAS.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الصور</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={onUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
            {photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-2">
                {photos.map((p, i) => (
                  <div
                    key={p}
                    className="group relative size-16 overflow-hidden rounded-md border border-border shadow-sm"
                  >
                    <img src={p} className="h-full w-full object-cover transition-transform group-hover:scale-110" alt="" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-destructive text-xs text-white shadow-md transition-transform hover:scale-110"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={save}
            disabled={saving || uploading}
            className="bg-emerald-deep text-bone-warm hover:bg-emerald-deep/90"
          >
            {saving ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}