import Link from "next/link";
import { Wrench, ShieldCheck, Info } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings, whatsappIntl } from "@/lib/settings";
import { publicBaseWhere, publicProductSelect } from "@/lib/search";
import { getBestSellers, getComponentTypes, getDeviceTree } from "@/lib/catalog";
import { waLink } from "@/lib/whatsapp";
import { SearchBox } from "@/components/store/SearchBox";
import { DeviceSelector } from "@/components/store/DeviceSelector";
import { ProductGrid } from "@/components/store/ProductCard";
import { Section } from "@/components/store/Section";
import { CategoryIcon } from "@/components/ui/icons";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await getSettings();
  const base = await publicBaseWhere();
  const offerIds = (await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "compareAtPrice" > "price" AND status = 'ACTIVE' LIMIT 200`).map((r) => r.id);
  const toolsCat = await prisma.category.findUnique({ where: { slug: "tools" }, select: { id: true, children: { select: { id: true } } } });

  const [tree, components, cats, featured, newest, offers, bestSellers, tools, manufacturers, demoCount] = await Promise.all([
    getDeviceTree(),
    getComponentTypes(),
    prisma.category.findMany({
      where: s.featuredCategoryIds.length ? { id: { in: s.featuredCategoryIds }, isActive: true } : { parentId: null, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, nameAr: true, nameEn: true, icon: true, _count: { select: { children: true } } },
    }),
    prisma.product.findMany({ where: { AND: [base, { isFeatured: true }] }, orderBy: { updatedAt: "desc" }, take: 10, select: publicProductSelect }),
    prisma.product.findMany({ where: base, orderBy: { createdAt: "desc" }, take: 10, select: publicProductSelect }),
    offerIds.length ? prisma.product.findMany({ where: { AND: [base, { id: { in: offerIds } }] }, take: 10, select: publicProductSelect }) : Promise.resolve([]),
    getBestSellers(10),
    toolsCat
      ? prisma.product.findMany({ where: { AND: [base, { categoryId: { in: [toolsCat.id, ...toolsCat.children.map((c) => c.id)] } }] }, take: 5, orderBy: { createdAt: "desc" }, select: publicProductSelect })
      : Promise.resolve([]),
    prisma.manufacturer.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    s.showDemoProducts ? prisma.product.count({ where: { isDemo: true, status: "ACTIVE" } }) : Promise.resolve(0),
  ]);
  const wa = whatsappIntl(s);

  return (
    <>
      {/* الواجهة الرئيسية */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 bg-grid-lines [background-size:44px_44px] [mask-image:radial-gradient(70%_70%_at_50%_30%,#000_30%,transparent_100%)]" />
        <div className="container relative grid items-center gap-10 py-12 lg:grid-cols-[1.25fr_1fr] lg:py-20">
          <div className="animate-fade-up">
            <span className="chip mb-5 border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <ShieldCheck className="h-3.5 w-3.5" /> بحث دقيق حسب الموديل
            </span>
            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.2]">
              {s.hero.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-ink-300 sm:text-lg">{s.hero.subtitle}</p>
            <div className="mt-7 max-w-2xl">
              <SearchBox size="lg" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              {["شاشة iPhone 13", "بطارية A54", "منفذ شحن Type-C", "B7000", "كاوية لحام"].map((t) => (
                <Link key={t} href={`/products?q=${encodeURIComponent(t)}`} className="rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1.5 text-ink-200 transition hover:border-brand-500/60 hover:text-white">
                  {t}
                </Link>
              ))}
            </div>
          </div>
          <div className="animate-fade-up [animation-delay:80ms]">
            <DeviceSelector tree={tree} components={components} />
          </div>
        </div>
      </section>

      {demoCount > 0 && (
        <div className="container mt-6">
          <p className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            تحتوي هذه النسخة على منتجات تجريبية موسومة بـ«منتج تجريبي» لعرض إمكانيات الموقع — أسعارها ومخزونها ليست بيانات حقيقية.
          </p>
        </div>
      )}

      {/* الأقسام */}
      <Section title="تسوّق حسب القسم" subtitle="كل ما يحتاجه الفني والزبون في مكان واحد" href="/products" id="cats">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-ink-700/70 bg-gradient-to-b from-ink-850 to-ink-900 p-4 transition hover:-translate-y-0.5 hover:border-brand-500/50"
            >
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-ink-700 bg-ink-800 text-cyan-400 transition group-hover:bg-brand-gradient group-hover:text-ink-950">
                <CategoryIcon name={c.icon} className="h-5 w-5" />
              </span>
              <span className="block text-sm font-semibold text-white">{c.nameAr}</span>
              {c.nameEn && <span className="mt-0.5 block truncate text-[11px] text-ink-400" dir="ltr">{c.nameEn}</span>}
            </Link>
          ))}
        </div>
      </Section>

      {/* الشركات */}
      <section className="container mt-10" aria-label="الشركات المصنعة">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {manufacturers.map((m) => (
            <Link key={m.slug} href={`/devices/${m.slug}`} className="shrink-0 rounded-xl border border-ink-700 bg-ink-900 px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:border-cyan-400/50 hover:text-white" dir="ltr">
              {m.name}
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <Section title="منتجات مميزة" href="/products" id="featured">
          <ProductGrid items={featured} maxQty={s.order.maxQtyPerItem} />
        </Section>
      )}

      {offers.length > 0 && (
        <Section title="العروض" subtitle="تخفيضات حقيقية على السعر السابق" href="/products?offers=1" id="offers">
          <ProductGrid items={offers} maxQty={s.order.maxQtyPerItem} />
        </Section>
      )}

      {bestSellers.length > 0 && (
        <Section title="الأكثر مبيعاً" subtitle="حسب الطلبات المُسلَّمة فعلياً" id="best">
          <ProductGrid items={bestSellers} maxQty={s.order.maxQtyPerItem} />
        </Section>
      )}

      {newest.length > 0 && (
        <Section title="وصل حديثاً" href="/products?sort=newest" id="new">
          <ProductGrid items={newest} maxQty={s.order.maxQtyPerItem} />
        </Section>
      )}

      {/* قسم الفنيين */}
      {s.technicians.enabled && (
        <section className="container mt-16" aria-labelledby="tech">
          <div className="relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-900">
            <div className="absolute inset-0 bg-[radial-gradient(60%_100%_at_100%_0%,rgba(34,211,238,0.14),transparent_60%)]" />
            <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.6fr] lg:items-center">
              <div>
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-ink-950"><Wrench className="h-6 w-6" /></span>
                <h2 id="tech" className="text-2xl font-bold text-white">{s.technicians.title}</h2>
                <p className="mt-3 leading-8 text-ink-300">{s.technicians.text}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href="/technicians" className="btn-primary">قسم الفنيين</Link>
                  <Link href="/category/tools" className="btn-secondary">أدوات الصيانة</Link>
                  <Link href="/category/consumables" className="btn-secondary">المستهلكات</Link>
                </div>
              </div>
              {tools.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {tools.slice(0, 3).map((p) => (
                    <Link key={p.id} href={`/product/${p.slug}`} className="rounded-2xl border border-ink-700 bg-ink-850 p-3 transition hover:border-brand-500/50">
                      <span className="line-clamp-2 text-sm font-semibold text-white">{p.nameAr}</span>
                      <span className="mt-2 block text-sm text-cyan-300 tabular">{p.price.toLocaleString("en-US")} د.ع</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* عناصر الثقة — تظهر فقط إذا أدخلها المالك */}
      {s.trustItems.length > 0 && (
        <section className="container mt-14" aria-label="لماذا نحن">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {s.trustItems.map((t, i) => (
              <div key={i} className="card p-5">
                <ShieldCheck className="mb-3 h-6 w-6 text-cyan-400" />
                <h3 className="font-semibold text-white">{t.title}</h3>
                <p className="mt-1 text-sm leading-7 text-ink-300">{t.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* واتساب */}
      <section className="container mt-16" aria-labelledby="wa">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-whatsapp/25 bg-gradient-to-l from-whatsapp/10 to-ink-900 p-6 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 id="wa" className="text-2xl font-bold text-white">لم تجد القطعة التي تبحث عنها؟</h2>
            <p className="mt-2 max-w-xl leading-8 text-ink-300">أرسل لنا موديل جهازك واسم القطعة عبر واتساب وسنرد عليك بالتوفر والسعر.</p>
          </div>
          <a href={waLink(wa, "السلام عليكم، أبحث عن قطعة لجهاز:\nالموديل: \nالقطعة: ")} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-lg shrink-0">
            <WhatsAppIcon className="h-5 w-5" /> راسلنا على واتساب
          </a>
        </div>
      </section>
    </>
  );
}
