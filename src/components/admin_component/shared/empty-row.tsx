import { TableCell, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-16">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Search className="size-5 opacity-50" />
          </div>
          <span className="text-sm">{label}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}