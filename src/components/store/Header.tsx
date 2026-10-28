import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Logo } from "../ui/Logo";
import { SearchBox } from "./SearchBox";
import { AccountLink, CartButton, MobileMenu, MobileSearchToggle } from "./HeaderClient";
import { DEMO_STATIC } from "@/lib/demo";

export const EXTRA_LINKS = [
  { href: "/devices", label: "تسوق حسب الجهاز" },
  { href: "/products?offers=1", label: "العروض" },
  { href: "/technicians", label: "للفنيين" },
  { href: "/track", label: "تتبع طلبك" },
  { href: "/account", label: "حسابي" },
  { href: "/contact", label: "تواصل معنا" },
].filter((l) => !DEMO_STATIC || !["/track", "/account"].includes(l.href)); // نسخة العرض بدون حسابات أو تتبع

export async function Header() {
  const [s, cats] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { parentId: null, isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, nameAr: true, icon: true } }),
  ]);
  return (
    <header className="site-header sticky top-0 z-40">
      {s.announcement.enabled && s.announcement.text && (
        <div className="bg-brand-gradient px-4 py-2 text-center text-xs font-semibold text-ink-950 sm:text-sm">
          {s.announcement.link ? <Link href={s.announcement.link} className="underline-offset-4 hover:underline">{s.announcement.text}</Link> : s.announcement.text}
        </div>
      )}
      <div className="relative border-b border-ink-800 bg-ink-950/85 backdrop-blur-xl">
        <div className="container flex h-[68px] items-center gap-3 lg:gap-6">
          <MobileMenu cats={cats} extraLinks={EXTRA_LINKS} />
          <Link href="/" className="shrink-0" aria-label={`${s.nameAr} — الصفحة الرئيسية`}>
            <Logo nameAr={s.nameAr} nameEn={s.nameEn} imageId={s.logoUploadId || null} />
          </Link>
          <div className="hidden flex-1 md:block">
            <SearchBox />
          </div>
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <MobileSearchToggle>
              <SearchBox autoFocus />
            </MobileSearchToggle>
            {!DEMO_STATIC && <AccountLink />}
            <CartButton />
          </div>
        </div>
        <nav aria-label="الأقسام" className="hidden border-t border-ink-800/80 lg:block">
          <div className="container flex items-center gap-1 overflow-x-auto py-1.5 text-sm">
            <Link href="/devices" className="whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold text-cyan-400 hover:bg-ink-800">تسوق حسب الجهاز</Link>
            {cats.slice(0, 9).map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-ink-200 hover:bg-ink-800 hover:text-white">
                {c.nameAr}
              </Link>
            ))}
            <Link href="/products" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-ink-300 hover:bg-ink-800">كل المنتجات</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
