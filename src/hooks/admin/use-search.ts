import { useState, useMemo } from "react";

export function useSearch<T>(rows: T[], get: (r: T) => string) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => get(r).toLowerCase().includes(t));
  }, [rows, q, get]);
  return { q, setQ, filtered };
}