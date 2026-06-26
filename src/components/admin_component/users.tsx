import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Trash2, Users } from "lucide-react";
import { PageHeader, DataCard } from "@/components/dashboard-shell";
import { useDeleteConfirm } from "@/hooks/admin/use-delete-confirm";
import { useSearch } from "@/hooks/admin/use-search";
import { DeleteConfirmDialog, SearchBar, EmptyRow } from "./shared";
function Usersp() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profs, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      
      
      const rmap: Record<string, string[]> = {};
      (roles.data ?? []).forEach((r: any) => { rmap[r.user_id] = [...(rmap[r.user_id] ?? []), r.role]; });
      return (profs.data ?? []).map((p: any) => ({ ...p, roles: rmap[p.id] ?? [] }));
    },
  });
  const [viewing, setViewing] = useState<any | null>(null);
  const [filterMode, setFilterMode] = useState<string>("all");
  const { state: delState, ask: askDel, close: closeDel } = useDeleteConfirm();

  const rows = useMemo(() => {
    if (!data) return [];
    return data.filter((u: any) => {
      if (filterMode === "clients") return u.roles.includes("client") && !u.roles.includes("provider") && !u.roles.includes("admin");
      if (filterMode === "providers") return u.roles.includes("provider");
      if (filterMode === "admins") return u.roles.includes("admin");
      return true;
    });
  }, [data, filterMode]);

  const { q, setQ, filtered } = useSearch<any>(rows, (u) => `${u.full_name} ${u.phone} ${u.wilaya}`);

 const del = (id: string) => {
  askDel(
    "هل أنت متأكد من حذف هذا المستخدم نهائياً؟ سيتم حذف جميع بياناته ولا يمكن استرجاعها.",
    async () => {
      try {
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", id);
        if (error) {
          throw error;
        }
        toast.success("تم حذف المستخدم بنجاح");
        qc.invalidateQueries({ queryKey: ["admin-users"] });
      } catch (error: any) {
        console.error("Delete user error:", error);
        toast.error(error.message || "حدث خطأ أثناء حذف المستخدم");
      }
    }
  );
};
  const roleStyle = (r: string) =>
    r === "admin" ? "border-oxblood-rich/30 bg-oxblood-rich/10 text-oxblood-rich"
    : r === "provider" ? "border-emerald-deep/30 bg-emerald-deep/10 text-emerald-deep"
    : "border-midnight-ink/20 bg-midnight-ink/5 text-midnight-ink";

  return (
   <>
  <PageHeader
    title="المستخدمون"
    description={`إجمالي: ${filtered.length}`}
    actions={
      <>
        <Select value={filterMode} onValueChange={setFilterMode}>
          <SelectTrigger className="h-10 w-48 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="clients">العملاء فقط</SelectItem>
            <SelectItem value="providers">المزودون</SelectItem>
            <SelectItem value="admins">المشرفين</SelectItem>
          </SelectContent>
        </Select>
        <SearchBar value={q} onChange={setQ} placeholder="ابحث عن اسم، هاتف، ولاية..." />
      </>
    }
  />

  <DataCard className="overflow-hidden p-0">
    <Table dir="ltr" className="w-full text-right">
      <TableHeader>
        <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الاسم
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الهاتف
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الولاية
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            الأدوار
          </TableHead>
          <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-right">
            التسجيل
          </TableHead>
          <TableHead className="h-12 w-[140px] px-4 text-left text-xs font-semibold uppercase tracking-wider">
            إجراءات
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {filtered.map((u: any) => (
          <TableRow key={u.id} className="border-b border-border/40 transition-colors hover:bg-muted/30">
            <TableCell className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-deep/10 text-sm font-semibold text-emerald-deep">
                  {(u.full_name?.[0] ?? "?").toUpperCase()}
                </div>
                <span className="font-medium">{u.full_name}</span>
              </div>
            </TableCell>

            <TableCell className="py-4 px-4 font-num text-sm text-muted-foreground" dir="ltr">
              {u.phone}
            </TableCell>

            <TableCell className="py-4 px-4 text-sm">
              {u.wilaya ?? "—"}
            </TableCell>

            <TableCell className="py-4 px-4">
              <div className="flex flex-wrap gap-1">
                {u.roles.map((r: string) => (
                  <Badge key={r} variant="outline" className={`capitalize ${roleStyle(r)}`}>
                    {r}
                  </Badge>
                ))}
                {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </TableCell>

            <TableCell className="py-4 px-4 text-sm text-muted-foreground">
              {formatDate(u.created_at)}
            </TableCell>

            <TableCell className="py-4 px-4 text-left">
              <div className="flex items-center justify-start gap-1.5">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="size-9 rounded-lg p-0" 
                  onClick={() => setViewing(u)}
                >
                  <Eye className="size-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="size-9 rounded-lg p-0 text-destructive hover:bg-destructive/10" 
                  onClick={() => del(u.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}

        {filtered.length === 0 && <EmptyRow colSpan={6} label="لا يوجد مستخدمون" />}
      </TableBody>
    </Table>
  </DataCard>

  <UserViewDialog user={viewing} onClose={() => setViewing(null)} />
  <DeleteConfirmDialog state={delState} onClose={closeDel} />
</>
  );
}

function UserViewDialog({ user, onClose }: { user: any | null; onClose: () => void }) {
  if (!user) return null;
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">تفاصيل المستخدم</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-deep/15 text-xl font-semibold text-emerald-deep">
              {(user.full_name?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">عضو منذ {formatDate(user.created_at)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <div><p className="text-xs text-muted-foreground">الهاتف</p><p className="mt-0.5 font-medium font-num" dir="ltr">{user.phone}</p></div>
            <div><p className="text-xs text-muted-foreground">الولاية</p><p className="mt-0.5 font-medium">{user.wilaya}</p></div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">الأدوار والصلاحيات</p>
            <div className="flex flex-wrap gap-2">
              {user.roles?.map((r: string) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
              {(!user.roles || user.roles.length === 0) && <span>—</span>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-midnight-ink text-bone-warm hover:bg-midnight-ink/90">إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Usersp;