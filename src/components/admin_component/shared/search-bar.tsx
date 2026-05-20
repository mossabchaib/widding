import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SearchBar({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  placeholder: string; 
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-lg border-border/60 pr-10 transition-colors focus-visible:border-emerald-deep/40"
      />
    </div>
  );
}