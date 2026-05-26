import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Building2,
  ImageIcon,
  Save,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Music2,
  ExternalLink,
  Plus,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  business_name: string;
  service_type: string;
  bio: string | null;
  avatar_url: string | null;
}

interface Contact {
  id: string;
  type: string;
  value: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTACT_TYPES = [
  { value: "email",     label: "بريد إلكتروني",  icon: Mail,          placeholder: "example@gmail.com" },
  { value: "address",   label: "عنوان",          icon: MapPin,        placeholder: "شارع الاستقلال، عنابة" },
  { value: "facebook",  label: "فيسبوك",         icon: FacebookIcon,  placeholder: "facebook.com/mypage" },
  { value: "instagram", label: "إنستغرام",       icon: InstagramIcon, placeholder: "instagram.com/mypage" },
  { value: "tiktok",    label: "تيكتوك",         icon: Music2,        placeholder: "tiktok.com/@mypage" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("service-photos").upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from("service-photos").getPublicUrl(path);
  return data.publicUrl;
}

function getContactMeta(type: string) {
  return (
    CONTACT_TYPES.find((t) => t.value === type) ?? {
      label: type,
      icon: ExternalLink,
      placeholder: "",
    }
  );
}

function ContactIcon({ type }: { type: string }) {
  if (type === "facebook")
    return (
      <div className="inline-flex size-8 items-center justify-center rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 shrink-0">
        <FacebookIcon className="size-3.5 text-[#1877F2]" />
      </div>
    );
  if (type === "instagram")
    return (
      <div className="inline-flex size-8 items-center justify-center rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20 shrink-0">
        <InstagramIcon className="size-3.5 text-[#E1306C]" />
      </div>
    );
  const meta = getContactMeta(type);
  return (
    <div className="inline-flex size-8 items-center justify-center rounded-xl bg-muted/60 border border-border/40 shrink-0">
      <meta.icon className="size-3.5 text-muted-foreground" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const [form, setForm] = useState({ business_name: "", service_type: "", bio: "" });

  // per-row edit state: maps contact id → draft {type, value}
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ type: string; value: string }>({ type: "phone", value: "" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // add-new row state
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState<{ type: string; value: string }>({ type: "phone", value: "" });
  const [adding, setAdding] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

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

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["my-provider-contacts", provider?.id],
    enabled: !!provider?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_contacts")
        .select("id, type, value")
        .eq("provider_id", provider!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Contact[];
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

  // ── Profile save ───────────────────────────────────────────────────────────

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = useCallback(async () => {
    if (!provider || !user) return;
    if (!form.business_name.trim()) { toast.error("اسم النشاط مطلوب"); return; }
    if (!form.service_type.trim())  { toast.error("نوع الخدمة مطلوب");  return; }
    setSaving(true);
    try {
      let avatar_url = provider.avatar_url;
      if (avatarFile) {
        const url = await uploadAvatar(user.id, avatarFile);
        if (!url) { toast.error("فشل رفع الصورة"); setSaving(false); return; }
        avatar_url = url;
      }
      const { error } = await supabase
        .from("providers")
        .update({ business_name: form.business_name.trim(), bio: form.bio.trim() || null, avatar_url })
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

  // ── Contact: start edit ────────────────────────────────────────────────────

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setEditDraft({ type: contact.type, value: contact.value });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ type: "phone", value: "" });
  };

  // ── Contact: update ────────────────────────────────────────────────────────

  const handleUpdate = useCallback(async (id: string) => {
    if (!editDraft.value.trim()) { toast.error("القيمة لا يمكن أن تكون فارغة"); return; }
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("provider_contacts")
        .update({ type: editDraft.type, value: editDraft.value.trim() })
        .eq("id", id);
      if (error) throw error;
      toast.success("تم تحديث معلومة التواصل");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["my-provider-contacts", provider?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء التحديث");
    } finally {
      setUpdatingId(null);
    }
  }, [editDraft, provider?.id, qc]);

  // ── Contact: delete ────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("provider_contacts")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("تم حذف معلومة التواصل");
      qc.invalidateQueries({ queryKey: ["my-provider-contacts", provider?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الحذف");
    } finally {
      setDeletingId(null);
    }
  }, [provider?.id, qc]);

  // ── Contact: add new ──────────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    if (!provider) return;
    if (!newContact.value.trim()) { toast.error("القيمة لا يمكن أن تكون فارغة"); return; }
    setAdding(true);
    try {
      const { error } = await supabase
        .from("provider_contacts")
        .insert({ provider_id: provider.id, type: newContact.type, value: newContact.value.trim() });
      if (error) throw error;
      toast.success("تمت إضافة معلومة التواصل");
      setNewContact({ type: "phone", value: "" });
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["my-provider-contacts", provider.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الإضافة");
    } finally {
      setAdding(false);
    }
  }, [provider, newContact, qc]);

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (isLoading || contactsLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-pulse" dir="rtl">
        <div className="h-6 w-36 bg-muted rounded-lg" />
        <div className="h-52 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-2xl" />
        <div className="h-48 bg-muted rounded-2xl" />
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
  const bioProgress = Math.min((form.bio.length / 500) * 100, 100);
  const bioColor = bioProgress > 90 ? "bg-destructive" : bioProgress > 70 ? "bg-amber-500" : "bg-emerald-deep";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16 space-y-6">

        {/* ── Page Title ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">الملف الشخصي</h1>
            <p className="text-xs text-muted-foreground mt-0.5">إدارة هويتك التجارية ومعلومات التواصل</p>
          </div>
          <div className="size-9 rounded-xl bg-emerald-deep/10 grid place-items-center">
            <User className="size-4 text-emerald-deep" />
          </div>
        </div>

        {/* ── Identity Hero Card ── */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <div className="h-28 w-full relative overflow-hidden bg-gradient-to-l from-emerald-deep/30 via-emerald-deep/10 to-transparent">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(ellipse 60% 80% at 20% 50%, var(--color-emerald-deep, #10b981) 0%, transparent 70%)" }} />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12">
              <div className="relative shrink-0 group">
                {currentAvatar ? (
                  <img src={currentAvatar} alt="الصورة الشخصية" className="size-24 rounded-2xl object-cover ring-4 ring-card shadow-lg" />
                ) : (
                  <div className="size-24 rounded-2xl bg-gradient-to-br from-emerald-deep to-emerald-deep/70 text-white grid place-items-center text-4xl font-bold ring-4 ring-card shadow-lg select-none">
                    {initials}
                  </div>
                )}
                <Label htmlFor="avatar-upload" className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer grid place-items-center backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="size-5 text-white" />
                    <span className="text-[9px] text-white/90 font-medium">تغيير</span>
                  </div>
                </Label>
                <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                {avatarFile && (
                  <div className="absolute -bottom-1 -left-1 size-5 rounded-full bg-emerald-deep border-2 border-card grid place-items-center">
                    <CheckCircle2 className="size-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 pb-1 min-w-0">
                <p className="font-bold text-lg text-foreground truncate leading-snug">{provider.business_name || "اسم النشاط"}</p>
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-deep/10 text-emerald-deep text-xs font-medium">
               
                </span>
              </div>
            </div>
            {avatarFile && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-deep/8 border border-emerald-deep/20">
                <CheckCircle2 className="size-3.5 text-emerald-deep shrink-0" />
                <span className="text-xs text-emerald-deep font-medium truncate">
                  {avatarFile.name.length > 30 ? avatarFile.name.slice(0, 30) + "…" : avatarFile.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Info Form Card ── */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
            <div className="size-8 rounded-xl bg-emerald-deep/10 grid place-items-center shrink-0">
              <Building2 className="size-3.5 text-emerald-deep" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">المعلومات الأساسية</p>
              <p className="text-xs text-muted-foreground">اسمك التجاري ونبذتك المعروضة للعملاء</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                اسم النشاط التجاري
                <span className="text-destructive text-[10px] font-normal">(مطلوب)</span>
              </Label>
              <div className="relative">
                <Input
                  value={form.business_name}
                  onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                  placeholder="مثال: مكتبة الأندلس"
                  className="h-11 rounded-xl border-border/60 bg-muted/20 focus:bg-background pe-10 text-sm transition-all focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40"
                />
                <Building2 className="absolute top-1/2 -translate-y-1/2 end-3 size-4 text-muted-foreground/40 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                  نبذة تعريفية
                  <span className="text-muted-foreground/50 text-[10px] font-normal">(اختياري)</span>
                </Label>
                <span className={`text-[10px] font-mono tabular-nums transition-colors ${bioProgress > 90 ? "text-destructive" : "text-muted-foreground"}`}>
                  {form.bio.length}<span className="text-muted-foreground/40">/500</span>
                </span>
              </div>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="اكتب نبذة قصيرة عن نشاطك وخدماتك تساعد العملاء على التعرف عليك..."
                rows={4}
                maxLength={500}
                className="rounded-xl resize-none border-border/60 bg-muted/20 focus:bg-background text-sm transition-all focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40 leading-relaxed"
              />
              <div className="h-[3px] w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${bioColor}`} style={{ width: `${bioProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-t border-border/40">
            <p className="text-xs text-muted-foreground">{saving ? "جاري الحفظ…" : "التغييرات تُطبّق فوراً بعد الحفظ"}</p>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-deep text-bone-warm hover:bg-emerald-deep/90 rounded-xl px-6 h-9 gap-2 shadow-sm text-xs font-semibold transition-all disabled:opacity-50 active:scale-95"
            >
              <Save className="size-3.5" />
              {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
            </Button>
          </div>
        </div>

        {/* ── Contacts Card ── */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-emerald-deep/10 grid place-items-center shrink-0">
                <ExternalLink className="size-3.5 text-emerald-deep" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">معلومات التواصل</p>
                <p className="text-xs text-muted-foreground">
                  {contacts.length > 0 ? `${contacts.length} معلومة مضافة` : "هاتف، بريد إلكتروني، شبكات اجتماعية"}
                </p>
              </div>
            </div>
            <Button
              onClick={() => { setShowAdd(true); setEditingId(null); }}
              variant="outline"
              className="h-8 px-3 rounded-xl text-xs gap-1.5 border-dashed border-emerald-deep/40 text-emerald-deep hover:bg-emerald-deep/5 hover:border-emerald-deep/60 transition-all"
            >
              <Plus className="size-3.5" />
              إضافة
            </Button>
          </div>

          <div className="divide-y divide-border/30">

            {/* Empty state */}
            {contacts.length === 0 && !showAdd && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
                <div className="relative">
                  <div className="size-14 rounded-2xl bg-muted/60 grid place-items-center">
                    <ExternalLink className="size-5 text-muted-foreground/60" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-deep/20 grid place-items-center border-2 border-card">
                    <Plus className="size-2.5 text-emerald-deep" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">لا توجد معلومات تواصل</p>
                  <p className="text-xs text-muted-foreground">أضف هاتفك أو بريدك أو روابط صفحاتك</p>
                </div>
                <Button
                  onClick={() => setShowAdd(true)}
                  variant="outline"
                  className="h-9 px-5 rounded-xl text-xs gap-2 border-dashed"
                >
                  <Plus className="size-3.5" />
                  إضافة أول معلومة
                </Button>
              </div>
            )}

            {/* Existing contacts */}
            {contacts.map((contact) => {
              const isEditing = editingId === contact.id;
              const isUpdating = updatingId === contact.id;
              const isDeleting = deletingId === contact.id;
              const meta = getContactMeta(isEditing ? editDraft.type : contact.type);

              return (
                <div key={contact.id} className="px-5 py-3.5 transition-colors hover:bg-muted/10">
                  {isEditing ? (
                    /* ── Edit mode ── */
                    <div className="flex items-center gap-2.5">
                      <ContactIcon type={editDraft.type} />

                      <select
                        value={editDraft.type}
                        onChange={(e) => setEditDraft((d) => ({ ...d, type: e.target.value }))}
                        className="appearance-none h-8 rounded-lg border border-border/50 bg-background px-2.5 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-deep/30 shrink-0 transition-all"
                      >
                        {CONTACT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>

                      <Input
                        value={editDraft.value}
                        onChange={(e) => setEditDraft((d) => ({ ...d, value: e.target.value }))}
                        placeholder={meta.placeholder}
                        autoFocus
                        className="flex-1 h-8 rounded-lg border-border/50 bg-background text-xs transition-all focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/40"
                      />

                      <Button
                        onClick={() => handleUpdate(contact.id)}
                        disabled={isUpdating}
                        size="icon"
                        className="size-8 shrink-0 rounded-lg bg-emerald-deep text-white hover:bg-emerald-deep/90 disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                      </Button>

                      <Button
                        onClick={cancelEdit}
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div className="flex items-center gap-3">
                      <ContactIcon type={contact.type} />

                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium mb-0.5">
                          {getContactMeta(contact.type).label}
                        </p>
                        <p className="text-sm text-foreground font-medium truncate">{contact.value}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          onClick={() => startEdit(contact)}
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-emerald-deep hover:bg-emerald-deep/10 transition-all"
                        >
                          <Pencil className="size-3.5" />
                        </Button>

                        <Button
                          onClick={() => handleDelete(contact.id)}
                          disabled={isDeleting}
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <span className="size-3.5 border-2 border-muted-foreground/30 border-t-destructive rounded-full animate-spin block" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add new row */}
            {showAdd && (
              <div className="px-5 py-3.5 bg-emerald-deep/4">
                <div className="flex items-center gap-2.5">
                  <ContactIcon type={newContact.type} />

                  <select
                    value={newContact.type}
                    onChange={(e) => setNewContact((c) => ({ ...c, type: e.target.value }))}
                    className="appearance-none h-8 rounded-lg border border-border/50 bg-background px-2.5 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-deep/30 shrink-0 transition-all"
                  >
                    {CONTACT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>

                  <Input
                    value={newContact.value}
                    onChange={(e) => setNewContact((c) => ({ ...c, value: e.target.value }))}
                    placeholder={getContactMeta(newContact.type).placeholder}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setShowAdd(false); setNewContact({ type: "phone", value: "" }); } }}
                    className="flex-1 h-8 rounded-lg border-emerald-deep/30 bg-background text-xs transition-all focus:ring-2 focus:ring-emerald-deep/20 focus:border-emerald-deep/50"
                  />

                  <Button
                    onClick={handleAdd}
                    disabled={adding}
                    size="icon"
                    className="size-8 shrink-0 rounded-lg bg-emerald-deep text-white hover:bg-emerald-deep/90 disabled:opacity-50"
                  >
                    {adding ? (
                      <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                  </Button>

                  <Button
                    onClick={() => { setShowAdd(false); setNewContact({ type: "phone", value: "" }); }}
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 pr-11">اضغط Enter للحفظ أو Escape للإلغاء</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export { ProfileTab };