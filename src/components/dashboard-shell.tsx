import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, LogOut, type LucideIcon } from "lucide-react";
import { useAuthContext } from "@/hooks/auth-context";

export type DashNav = { key: string; label: string; icon: LucideIcon; badge?: ReactNode };

export function DashboardShell({
  title,
  subtitle,
  badge,
  nav,
  active,
  onNav,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  nav: DashNav[];
  active: string;
  onNav: (key: string) => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuthContext();
  const activeItem = nav.find((n) => n.key === active);

  return (
    <div dir="rtl" className="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-emerald-deep/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 p-4 lg:p-6">
        {/* Sidebar */}
        <aside
          className={cn(
            "sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col rounded-2xl border border-border/60 bg-card/80 p-4 shadow-xl shadow-black/5 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex",
            collapsed ? "w-[88px]" : "w-[280px]",
          )}
        >
          <div className="flex items-center justify-between gap-2 pb-4">
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold tracking-tight text-foreground">{title}</h2>
                {subtitle && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((v) => !v)}
              className="size-8 shrink-0 rounded-lg hover:bg-muted"
              aria-label="طي/توسيع"
            >
              {collapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          </div>

          <div className="my-2 h-px bg-gradient-to-l from-transparent via-border to-transparent" />

          <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;
              return (
                <button
                  key={item.key}
                  onClick={() => onNav(item.key)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-emerald-deep text-bone-warm shadow-lg shadow-emerald-deep/20"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {isActive && !collapsed && (
                    <span className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-l-full bg-bone-warm/80" />
                  )}
                  <Icon
                    className={cn(
                      "size-[18px] shrink-0 transition-transform",
                      isActive ? "scale-110" : "group-hover:scale-110",
                    )}
                  />
                  {!collapsed && <span className="flex-1 text-right">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="shrink-0 text-xs">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-border/60 pt-3">
            <button
              onClick={() => signOut()}
              title={collapsed ? "تسجيل الخروج" : undefined}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10",
                collapsed && "justify-center px-0",
              )}
            >
              <LogOut className="size-[18px] shrink-0 transition-transform group-hover:-translate-x-0.5" />
              {!collapsed && <span>تسجيل الخروج</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm backdrop-blur-xl lg:hidden">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold">{title}</h2>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="size-9 text-destructive hover:bg-destructive/10"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="size-4" />
            </Button>
          </div>

          {/* Mobile nav */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;
              return (
                <button
                  key={item.key}
                  onClick={() => onNav(item.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                    isActive
                      ? "border-emerald-deep bg-emerald-deep text-bone-warm shadow-md"
                      : "border-border/60 bg-card/60 text-foreground/70 hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  {item.badge}
                </button>
              );
            })}
          </div>

          {/* Header */}
          <header className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-deep/10 text-emerald-deep sm:flex">
                {activeItem?.icon && <activeItem.icon className="size-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {title}
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {activeItem?.label}
                </h1>
              </div>
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
          </header>

          {/* Content */}
          <section className="flex-1 rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-xl sm:p-6">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DataCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-sm", className)}>{children}</div>
  );
}
