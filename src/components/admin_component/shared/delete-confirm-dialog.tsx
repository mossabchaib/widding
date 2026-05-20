import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export type DeleteConfirmState = {
  open: boolean;
  message: string;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({ 
  state, 
  onClose 
}: { 
  state: DeleteConfirmState; 
  onClose: () => void; 
}) {
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold tracking-tight">تأكيد الحذف</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{state.message}</p>
        <DialogFooter className="mt-2 flex-row justify-center gap-3">
          <Button variant="outline" onClick={onClose} className="min-w-24">إلغاء</Button>
          <Button
            className="min-w-24 bg-destructive text-white shadow-sm hover:bg-destructive/90"
            onClick={() => { state.onConfirm(); onClose(); }}
          >حذف</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}