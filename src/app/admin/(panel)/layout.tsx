import { requireStaff, can, type Permission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { adminLogout } from "../(auth)/actions";
import { LogOut } from "lucide-react";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/admin", label: "نظرة عامة", icon: "LayoutDashboard", perm: "dashboard" },
  { href: "/admin/orders", label: "الطلبات", icon: "ShoppingCart", perm: "orders" },
  { href: "/admin/products", label: "المنتجات", icon: "Package", perm: "products" },
  { href: "/admin/inventory", label: "المخزون", icon: "Boxes", perm: "inventory" },
  { href: "/admin/categories", label: "الأقسام", icon: "FolderTree", perm: "catalog" },
  { href: "/admin/devices", label: "الأجهزة والتوافق", icon: "Smartphone", perm: "catalog" },
  { href: "/admin/attributes", label: "أنواع القطع والحالات", icon: "Layers", perm: "catalog" },
  { href: "/admin/customers", label: "الزبائن", icon: "Users", perm: "customers" },
  { href: "/admin/suppliers", label: "الموردون", icon: "Truck", perm: "suppliers" },
  { href: "/admin/purchases", label: "المشتريات", icon: "ClipboardList", perm: "purchases" },
  { href: "/admin/reports", label: "التقارير", icon: "BarChart3", perm: "reports" },
  { href: "/admin/discounts", label: "أكواد الخصم", icon: "Percent", perm: "discounts" },
  { href: "/admin/delivery", label: "التوصيل", icon: "Truck", perm: "settings" },
  { href: "/admin/settings", label: "الإعدادات", icon: "Settings", perm: "settings" },
  { href: "/admin/users", label: "المستخدمون", icon: "ShieldCheck", perm: "users" },
  { href: "/admin/audit", label: "سجل العمليات", icon: "ScrollText", perm: "audit" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("dashboard");
  const items = NAV.filter((n) => can(user, n.perm)).map(({ perm: _p, ...n }) => n);
  return (
    <>
      <AdminNav items={items} user={{ name: user.name, role: ROLE_LABELS[user.role] }} />
      <div className="lg:ps-60">
        <div className="no-print flex justify-end border-b border-ink-100 bg-white px-4 py-2 lg:px-8">
          <form action={adminLogout}><button className="btn-ghost btn-sm"><LogOut className="h-4 w-4" /> خروج</button></form>
        </div>
        <main id="main" className="mx-auto max-w-[1400px] p-4 lg:p-8">{children}</main>
      </div>
    </>
  );
}
