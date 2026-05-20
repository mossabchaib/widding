import { useState } from "react";
import { DeleteConfirmState } from "@/components/admin_component/shared/delete-confirm-dialog";

export function useDeleteConfirm() {
  const [state, setState] = useState<DeleteConfirmState>(
    { open: false, message: "", onConfirm: () => {} }
  );
  const ask = (message: string, onConfirm: () => void) =>
    setState({ open: true, message, onConfirm });
  const close = () => setState(s => ({ ...s, open: false }));
  return { state, ask, close };
}