import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  altPrompt: ReactNode;
  children: ReactNode;
}

/**
 * Premium auth layout used by /auth/login and /auth/register.
 * - Split-screen on desktop with editorial brand panel
 * - Gradient backdrop + subtle Andalusian motif
 * - RTL-first, fully responsive
 */
export function AuthShell({ title, subtitle, altPrompt, children }: AuthShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] grid lg:grid-cols-[1.1fr_1fr] overflow-hidden">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 text-bone-warm overflow-hidden bg-emerald-deep">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, var(--gold-burnished) 0, transparent 40%), radial-gradient(circle at 80% 70%, var(--oxblood-rich) 0, transparent 45%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--bone-warm) 0 1px, transparent 1px 22px), repeating-linear-gradient(-45deg, var(--bone-warm) 0 1px, transparent 1px 22px)",
          }}
        />

        <Link to="/" className="relative z-10 font-display text-3xl tracking-tight">متهني</Link>

        <div className="relative z-10 max-w-md">
          <p className="text-gold-burnished/90 text-xs uppercase tracking-[0.3em] mb-4">
            ليلة العمر
          </p>
          <h2 className="font-display text-5xl leading-[1.15] mb-5">
            نظّم عرسك بطمأنينة، من قاعةٍ إلى ضحكة.
          </h2>
          <p className="text-bone-warm/75 leading-relaxed">
            منصّة متهني تجمع لك أرقى مزوّدي خدمات الأعراس عبر 58 ولاية —
            قاعات، تصوير، تجميل، حلويات و DJ.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 text-center">
          {[
            { v: "+1.2k", l: "مزوّد" },
            { v: "58", l: "ولاية" },
            { v: "4.8★", l: "متوسط" },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-num text-3xl text-gold-burnished">{s.v}</div>
              <div className="text-xs text-bone-warm/70 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative grid place-items-center px-5 py-12 sm:px-10 bg-gradient-to-br from-bone-warm via-bone-warm to-secondary">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="font-display text-3xl text-emerald-deep">متهني</Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="font-display text-4xl sm:text-[2.6rem] text-emerald-deep">{title}</h1>
            {subtitle && <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-px rounded-[1.75rem] bg-gradient-to-br from-gold-burnished/40 via-emerald-deep/10 to-oxblood-rich/30 blur-sm"
            />
            <div className="relative bg-card/95 backdrop-blur-sm rounded-[1.65rem] ring-1 ring-foreground/5 shadow-[0_30px_80px_-30px_rgba(6,78,59,0.25)] p-7 sm:p-9">
              {children}
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">{altPrompt}</p>
        </div>
      </section>
    </div>
  );
}
