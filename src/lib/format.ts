export const formatDA = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 0 }).format(v) + " دج";
};

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(dt);
};

// Use a synthetic email for Supabase Auth so users only need phone+password
export const phoneToEmail = (phone: string) =>
  `${phone.replace(/\D/g, "")}@metheni.app`;
