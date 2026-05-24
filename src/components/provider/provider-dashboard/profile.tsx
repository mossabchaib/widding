import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, DataCard } from "@/components/dashboard-shell";
import {
  User,
  Building2,
  Briefcase,
  ImageIcon,
  Save,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Provider {
  id: string;
  business_name: string;
  service_type: string;
  bio: string | null;
  avatar_url: string | null;
}

async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from("service-photos")
    .upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from("service-photos").getPublicUrl(path);
  return data.publicUrl;
}

function ProfileTab() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    service_type: "",
    bio: "",
  });

  const { data: provider, isLoading } = useQuery<Provider | null>({
    queryKey: ["my-provider", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id,business_name,service_type,bio,avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Provider | null;
    },
  });

  if (provider && !synced) {
    setForm({
      business_name: provider.business_name ?? "",
      service_type: provider.service_type ?? "",
      bio: provider.bio ?? "",
    });
    setSynced(true);
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = useCallback(async () => {
    if (!provider || !user) return;
    if (!form.business_name.trim()) {
      toast.error("اسم النشاط مطلوب");
      return;
    }
    if (!form.service_type.trim()) {
      toast.error("نوع الخدمة مطلوب");
      return;
    }

    setSaving(true);
    try {
      let avatar_url = provider.avatar_url;

      if (avatarFile) {
        const url = await uploadAvatar(user.id, avatarFile);
        if (!url) {
          toast.error("فشل رفع الصورة");
          setSaving(false);
          return;
        }
        avatar_url = url;
      }

      const { error } = await supabase
        .from("providers")
        .update({
          business_name: form.business_name.trim(),
          bio: form.bio.trim() || null,
          avatar_url,
        })
        .eq("id", provider.id);

      if (error) throw error;

      toast.success("تم حفظ التغييرات بنجاح");
      setAvatarFile(null);
      setAvatarPreview(null);
      qc.invalidateQueries({ queryKey: ["my-provider", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }, [provider, user, form, avatarFile, qc]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse" dir="rtl">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-[220px] bg-muted rounded-3xl" />
        <div className="h-[320px] bg-muted rounded-3xl" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3" dir="rtl">
        <div className="size-16 rounded-2xl bg-muted grid place-items-center">
          <User className="size-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">لم يتم العثور على بيانات المزوّد.</p>
      </div>
    );
  }

  const currentAvatar = avatarPreview ?? provider.avatar_url;
  const initials = provider.business_name.charAt(0);
  const bioProgress = (form.bio.length / 500) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">الملف الشخصي</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة معلومات نشاطك التجاري وهويتك البصرية</p>
      </div>

      {/* Avatar + Identity Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card">
        {/* Decorative gradient band */}
        <div className="h-24 w-full bg-gradient-to-l from-emerald-deep/20 via-emerald-deep/10 to-transparent" />

        <div className="px-6 pb-6">
          {/* Avatar pulled up over the band */}
          <div className="flex items-end gap-5 -mt-10">
            <div className="relative shrink-0 group">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="الصورة الشخصية"
                  className="size-20 rounded-2xl object-cover ring-4 ring-card shadow-xl"
                />
              ) : (
                <div className="size-20 rounded-2xl bg-gradient-to-br from-emerald-deep to-emerald-deep/60 text-white grid place-items-center text-3xl font-bold ring-4 ring-card shadow-xl select-none">
                  {initials}
                </div>
              )}
              {/* Hover overlay for upload hint */}
              <Label
                htmlFor="avatar-upload"
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer grid place-items-center"
              >
                <ImageIcon className="size-5 text-white" />
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 pb-1 min-w-0">
              <p className="font-semibold text-base truncate leading-tight">
                {provider.business_name || "اسم النشاط"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{provider.service_type}</p>
            </div>
          </div>

          {/* Upload status row */}
          <div className="mt-4 flex items-center justify-between">
            <Label
              htmlFor="avatar-upload"
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-xl border border-border/40"
            >
              <ImageIcon className="size-3.5" />
              {avatarFile ? "تغيير الصورة" : "تحميل صورة"}
            </Label>
            {avatarFile && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-deep font-medium">
                <CheckCircle2 className="size-3.5" />
                {avatarFile.name.length > 20 ? avatarFile.name.slice(0, 20) + "…" : avatarFile.name}
              </span>
            )}
            {!avatarFile && (
              <span className="text-xs text-muted-foreground">JPG أو PNG — مربعة يُفضَّل</span>
            )}
          </div>
        </div>
      </div>

      {/* Info Form Card */}
      <div className="rounded-3xl border border-border/50 bg-card p-6 space-y-5">
        {/* Section label */}
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-emerald-deep/10 grid place-items-center">
            <Building2 className="size-3.5 text-emerald-deep" />
          </div>
          <span className="text-sm font-semibold text-foreground">المعلومات الأساسية</span>
        </div>

        <div className="h-px bg-border/50" />

        {/* Business Name */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            اسم النشاط التجاري <span className="text-destructive normal-case tracking-normal">*</span>
          </Label>
          <div className="relative">
            <Input
              value={form.business_name}
              onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
              placeholder="مثال: مكتبة الأندلس"
              className="h-11 rounded-xl border-border/60 bg-muted/30 focus:bg-background ps-4 pe-10 transition-colors"
            />
            <Building2 className="absolute top-1/2 -translate-y-1/2 end-3 size-4 text-muted-foreground/50 pointer-events-none" />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              نبذة تعريفية
              <span className="normal-case tracking-normal text-muted-foreground/60 font-normal mr-1">(اختياري)</span>
            </Label>
            <span className="text-xs text-muted-foreground">{form.bio.length} / 500</span>
          </div>
          <Textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="اكتب نبذة قصيرة عن نشاطك وخدماتك تساعد العملاء على التعرف عليك..."
            rows={4}
            maxLength={500}
            className="rounded-xl resize-none border-border/60 bg-muted/30 focus:bg-background transition-colors leading-relaxed"
          />
          {/* Progress bar */}
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-deep/60 rounded-full transition-all duration-300"
              style={{ width: `${bioProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Save Row */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          {saving ? "جاري حفظ التغييرات..." : "سيتم تحديث ملفك الشخصي فور الحفظ"}
        </p>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-deep text-bone-warm hover:bg-emerald-deep/90 rounded-xl px-7 h-10 gap-2 shadow-sm text-sm font-semibold transition-all disabled:opacity-60"
        >
          <Save className="size-3.5" />
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>
    </div>
  );
}

export { ProfileTab };