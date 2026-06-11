export const PROVIDER_PLANS = [
  { id: "basic",   name: "أساسية",   days: 30,  price: 1500,  color: "border-emerald-deep/40",       badge: "bg-emerald-deep/10 text-emerald-deep" },
  { id: "premium", name: "بريميوم", days: 90,  price: 3500, color: "border-gold-burnished/40",     badge: "bg-gold-burnished/10 text-gold-burnished" },
  { id: "annual",  name: "نصف سنوي", days: 180, price: 5000, color: "border-midnight-ink/40",       badge: "bg-midnight-ink/10 text-midnight-ink" },
   { id: "annual",  name: " سنوي", days: 360, price: 10000, color: "border-midnight-ink/40",       badge: "bg-midnight-ink/10 text-midnight-ink" }
] as const;