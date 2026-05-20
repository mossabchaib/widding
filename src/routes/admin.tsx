import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuthContext } from "@/hooks/auth-context";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Package,
  Star,
  Tag,
} from "lucide-react";
import { DashboardShell, type DashNav } from "@/components/dashboard-shell";
import React from "react";
import Overview from "@/components/admin_component/overview";
import Subscriptions from "@/components/admin_component/subscriptions";
import Usersp from "@/components/admin_component/users";
import Categories from "@/components/admin_component/categories";
import Services from "@/components/admin_component/services";
import Reviews from "@/components/admin_component/reviews";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminView = "overview" | "subs" | "users" | "categories" | "services" | "reviews";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV: DashNav[] = [
  { key: "overview",    label: "نظرة عامة",   icon: LayoutDashboard },
  { key: "subs",        label: "الاشتراكات",   icon: CreditCard },
  { key: "users",       label: "المستخدمون",   icon: Users },
  { key: "categories",  label: "الفئات",       icon: Tag },
  { key: "services",    label: "الخدمات",      icon: Package },
  { key: "reviews",     label: "المراجعات",    icon: Star },
];

// ─── View map (avoids a chain of ternaries) ───────────────────────────────────

const VIEW_MAP: Record<AdminView, React.ReactElement> = {
  overview:   <Overview />,
  subs:       <Subscriptions />,
  users:      <Usersp />,
  categories: <Categories />,
  services:   <Services />,
  reviews:    <Reviews />,
};

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin")({ component: AdminPanel });

// ─── Component ────────────────────────────────────────────────────────────────

function AdminPanel() {
  const { isAdmin, loading } = useAuthContext();
  const navigate = useNavigate();
  const [view, setView] = useState<AdminView>("overview");

  // Redirect non-admins only after auth has fully resolved.
  // Using a separate effect prevents redirecting during the loading flash.
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate({ to: "/" });
    }
  }, [loading, isAdmin, navigate]);

  // Render nothing while auth is resolving or access is denied.
  // Avoids a blank-page flash — the shell itself never mounts for non-admins.
  if (loading || !isAdmin) return null;

  const handleNav = (key: string) => {
    // Validate that the incoming key is a known view before applying it.
    if (key in VIEW_MAP) setView(key as AdminView);
  };

  return (
    <DashboardShell
      title="لوحة الإدارة"
      subtitle="مَتْهَنّي"
      nav={NAV}
      active={view}
      onNav={handleNav}
      badge={
        <Badge className="bg-emerald-deep text-bone-warm shadow-sm">Admin</Badge>
      }
    >
      {VIEW_MAP[view]}
    </DashboardShell>
  );
}