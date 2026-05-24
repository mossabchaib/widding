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
  src="../assets/logo.png"
  alt="Fêteparfaite Logo"
  className="h-20 w-20 object-contain group-hover:scale-105 transition-transform"
/>

<span className="hidden sm:inline text-2xl font-extrabold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent font-display">
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
              منصتك الأولى في الجزائر لتنظيم الأعراس والمناسبات السعيدة. نجمع لك أفضل مزودي الخدمات لتنظيم ليلة العمر بكل راحة بال، عبر 69 ولاية.
            </p>
           <div className="flex items-center gap-2">
  <a
    href="https://www.facebook.com/share/1Fnp3KRR44/?mibextid=wwXIfr"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Facebook"
    className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1877F2]/40 bg-[#1877F2]/5">
    <svg className="h-[18px] w-[18px] text-muted-foreground group-hover:text-[#1877F2] transition-colors" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  </a>
  <a
    href="https://www.instagram.com/feteparfaite_?igsh=MWtuczM3enBxb2J0NQ"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Instagram"
   className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E1306C]/40 bg-[#E1306C]/5" >
    <svg className="h-[18px] w-[18px] text-muted-foreground group-hover:text-[#E1306C] transition-colors" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  </a>
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
                <span dir="ltr">+213 664 69 97 80</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </span>
                <span>Feteparfaite04@gmail.com</span>
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
