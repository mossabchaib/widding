import { Link, useRouterState } from "@tanstack/react-router";
import { useAuthContext } from "@/hooks/auth-context";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  Heart, Inbox, LayoutDashboard, LogOut, Menu, ShieldCheck, ShoppingBag,
  Mail, Phone, MapPin, Send,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { isAuthenticated, profile, isAdmin, isProvider, isClient, signOut } = useAuthContext();
  const cartCount = useCart((s) => s.items.length);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => path === to;

  const NavLink = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      className={`relative px-3 py-2 text-sm font-medium transition-colors ${
        isActive(to) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {isActive(to) && (
        <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-primary to-primary/40" />
      )}
    </Link>
  );

  const IconLink = ({ to, label, icon: Icon }: { to: string; label: string; icon: any }) => (
    <Link
      to={to}
      aria-label={label}
      className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
    >
      <Icon className="h-[18px] w-[18px]" />
    </Link>
  );

  return (
    <header dir="rtl" className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand + Nav */}
   <div className="flex items-center gap-8">
  <Link to="/" className="group flex items-center gap-2">
    
    {/* Logo */}
  <img
  src="../public/logo.png"
  alt="Fêteparfaite Logo"
  className="h-20 w-20 object-contain group-hover:scale-105 transition-transform"
/>

    <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent font-display">
      Fêteparfaite
    </span>
    
  </Link>

  <nav className="hidden lg:flex items-center gap-1">
    <NavLink to="/browse" label="تصفح الخدمات" />
    <NavLink to="/how-it-works" label="كيف يعمل" />
    <NavLink to="/for-providers" label="للمزودين" />
  </nav>
</div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <Link
            to="/cart"
            aria-label="السلة"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                {cartCount}
              </span>
            )}
          </Link>

          {!isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex font-medium">
                <Link to="/auth/login">دخول</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-5 shadow-sm shadow-primary/20">
                <Link to="/auth/register">إنشاء حساب</Link>
              </Button>
            </>
          ) : (
            <>
              {isClient && (
                <>
                  <IconLink to="/account/favorites" label="المفضلة" icon={Heart} />
                  <IconLink to="/account/requests" label="طلباتي" icon={Inbox} />
                </>
              )}
              {isProvider && <IconLink to="/provider" label="لوحة المزود" icon={LayoutDashboard} />}
              {isAdmin && <IconLink to="/admin" label="لوحة المشرف" icon={ShieldCheck} />}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 py-1 pl-3 pr-1 hover:border-primary/40 hover:bg-primary/5 transition-all">
                    <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                      {profile?.full_name ?? "حسابي"}
                    </span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-bold">
                      {(profile?.full_name ?? "?").trim().charAt(0)}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-xl">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{profile?.full_name ?? "حسابي"}</span>
                    <span className="text-xs font-normal text-muted-foreground">{profile?.phone ?? "—"}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isClient && (
                    <div className="md:hidden">
                      <DropdownMenuItem asChild>
                        <Link to="/account/favorites" className="flex items-center gap-2">
                          <Heart className="h-4 w-4" /> المفضلة
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/cart" className="flex items-center gap-2">
                          <Inbox className="h-4 w-4" /> طلباتي
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </div>
                  )}
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 ml-2" /> تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {/* Mobile nav */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/60 text-foreground hover:bg-primary/5 transition">
                <Menu className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem asChild><Link to="/browse">تصفح الخدمات</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/how-it-works">كيف يعمل</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/for-providers">للمزودين</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer dir="rtl" className="relative mt-20 border-t border-border/60 bg-gradient-to-b from-background to-muted/40">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4 space-y-5">
            <Link to="/" className="font-display text-3xl font-bold text-emerald-deep tracking-tight">
              Fêteparfaite
            </Link>
            <p className="text-sm leading-7 text-muted-foreground max-w-sm">
              منصتك الأولى في الجزائر لتنظيم الأعراس والمناسبات السعيدة. نجمع لك أفضل مزودي الخدمات لتنظيم ليلة العمر بكل راحة بال، عبر 58 ولاية.
            </p>
            <div className="flex items-center gap-2">
              {[Mail, Phone, MapPin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-foreground">روابط سريعة</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/browse" className="text-muted-foreground hover:text-foreground transition-colors">تصفح الخدمات</Link></li>
              <li><Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">كيف تعمل المنصة</Link></li>
              <li><Link to="/for-providers" className="text-muted-foreground hover:text-foreground transition-colors">انضم كمزود خدمة</Link></li>
              <li><Link to="/auth/register" className="text-muted-foreground hover:text-foreground transition-colors">إنشاء حساب جديد</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-sm font-bold text-foreground">تواصل معنا</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="h-4 w-4" />
                </span>
                <span dir="ltr">+213 550 00 00 00</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </span>
                <span>contact@metheni.dz</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>قالمة,الجزائر</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-sm font-bold text-foreground">النشرة البريدية</h3>
            <p className="text-sm text-muted-foreground leading-7">
              اشترك ليصلك جديد المنصة وأفضل العروض لمنحك زفاف أحلامك.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <input
                type="email"
                placeholder="بريدك الإلكتروني"
                className="h-12 w-full rounded-full border border-border/60 bg-background/80 pr-5 pl-14 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute left-1 top-1 h-10 w-10 rounded-full shadow-sm shadow-primary/30"
                aria-label="اشتراك"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60 pt-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fêteparfaite — جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-6 text-xs">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">سياسة الخصوصية</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">شروط الاستخدام</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
