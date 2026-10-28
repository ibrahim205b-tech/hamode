import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, CircleHelp, ShieldQuestion, Truck, Wrench, ShieldCheck, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings, siteUrl, whatsappIntl } from "@/lib/settings";
import { publicBaseWhere, publicProductSelect } from "@/lib/search";
import { productInquiryMessage, waLink } from "@/lib/whatsapp";
import { formatIQD } from "@/lib/format";
import { COMPAT_LABELS } from "@/lib/constants";
import { Gallery } from "@/components/store/Gallery";
import { AddToCartFull } from "@/components/store/AddToCart";
import { DemoBadge, ProductGrid, StockBadge } from "@/components/store/ProductCard";
import { Price } from "@/components/ui/Price";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import type { CompatStatus } from "@prisma/client";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ model?: string }> };

async function load(slug: string) {
  const base = await publicBaseWhere();
  return prisma.product.findFirst({
    where: { AND: [base, { slug: decodeURIComponent(slug) }] },
    include: {
      images: { orderBy: { sortOrder: "asc" }, select: { uploadId: true, alt: true } },
      category: { include: { parent: true } },
      componentType: true,
      condition: true,
      compat: {
        include: { model: { include: { family: { include: { manufacturer: true } } } }, variant: true },
        orderBy: [{ status: "asc" }],
      },
      relations: { where: { to: base }, include: { to: { select: publicProductSelect } } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "المنتج غير موجود" };
  const models = p.compat.slice(0, 4).map((c) => c.model.name).join("، ");
  const description = `${p.nameAr}${p.nameEn ? ` (${p.nameEn})` : ""} — ${p.category.nameAr}${models ? ` متوافق مع ${models}` : ""}. السعر ${formatIQD(p.price)}.`;
  return {
    title: p.nameAr,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.nameAr, description, type: "website", images: p.images[0] ? [{ url: `/api/images/${p.images[0].uploadId}` }] : undefined },
    robots: p.isDemo ? { index: false, follow: true } : undefined,
  };
}

const COMPAT_STYLE: Record<CompatStatus, { cls: string; Icon: typeof BadgeCheck }> = {
  VERIFIED: { cls: "border-success/30 bg-success/10 text-green-300", Icon: BadgeCheck },
  UNVERIFIED: { cls: "border-warning/30 bg-warning/10 text-amber-300", Icon: ShieldQuestion },
  UNKNOWN: { cls: "border-ink-500 bg-ink-800 text-ink-200", Icon: CircleHelp },
};

export default async function ProductPage({ params, searchParams }: Props) {
  const [p, s] = await Promise.all([load((await params).slug), getSettings()]);
  if (!p) notFound();
  const { model: modelSlug } = await searchParams;
  const selectedCompat = modelSlug ? p.compat.find((c) => c.model.slug === modelSlug) : undefined;
  const url = `${siteUrl()}/product/${p.slug}`;
  const wa = whatsappIntl(s);
  const inquiry = productInquiryMessage({ name: p.nameAr, sku: p.sku, model: selectedCompat?.model.name ?? (p.compat.length === 1 ? p.compat[0].model.name : null), url });
  const icon = p.category.icon || p.category.parent?.icon;
  const specs = (Array.isArray(p.specs) ? p.specs : []) as { label: string; value: string }[];
  const hasUnverified = p.compat.some((c) => c.status !== "VERIFIED");
  const related = p.relations.filter((r) => r.type === "RELATED").map((r) => r.to);
  const alternatives = p.relations.filter((r) => r.type === "ALTERNATIVE").map((r) => r.to);
  const auto = related.length
    ? []
    : await prisma.product.findMany({
        where: { AND: [await publicBaseWhere(), { categoryId: p.categoryId, id: { not: p.id } }] },
        take: 5,
        orderBy: { stockQty: "desc" },
        select: publicProductSelect,
      });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nameAr,
    sku: p.sku,
    ...(p.barcode ? { gtin: p.barcode } : {}),
    ...(p.images[0] ? { image: [`${siteUrl()}/api/images/${p.images[0].uploadId}`] } : {}),
    ...(p.descriptionAr ? { description: p.descriptionAr } : {}),
    ...(p.partBrand ? { brand: { "@type": "Brand", name: p.partBrand } } : {}),
    category: p.category.nameAr,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "IQD",
      price: p.price,
      availability: p.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: p.condition?.slug === "new" ? "https://schema.org/NewCondition" : p.condition?.slug === "refurbished" ? "https://schema.org/RefurbishedCondition" : "https://schema.org/UsedCondition",
    },
  };

  return (
    <div className="container py-8">
      {!p.isDemo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <nav aria-label="مسار التنقل" className="mb-5 flex flex-wrap gap-1 text-xs text-ink-400">
        <Link href="/" className="hover:text-white">الرئيسية</Link> /
        {p.category.parent && <><Link href={`/category/${p.category.parent.slug}`} className="hover:text-white">{p.category.parent.nameAr}</Link> /</>}
        <Link href={`/category/${p.category.slug}`} className="hover:text-white">{p.category.nameAr}</Link> /
        <span className="text-ink-200">{p.nameAr}</span>
      </nav>

      {p.isDemo && (
        <p className="mb-5 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          هذا منتج تجريبي لعرض الموقع فقط. السعر والمخزون والتوافق المعروضة ليست بيانات حقيقية للمتجر.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Gallery images={p.images} name={p.nameAr} icon={icon} />

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {p.isDemo && <DemoBadge />}
            {p.condition && <span className="chip border-brand-500/30 bg-brand-500/10 text-brand-300">{p.condition.nameAr}</span>}
            {p.qualityGrade && <span className="chip border-ink-600 bg-ink-800 text-ink-200">الجودة: {p.qualityGrade}</span>}
            {p.technicianOnly && <span className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-300"><Wrench className="h-3 w-3" /> للفنيين</span>}
          </div>
          <h1 className="text-2xl font-bold leading-snug text-white sm:text-3xl">{p.nameAr}</h1>
          {p.nameEn && <p className="mt-1 text-sm text-ink-400" dir="ltr">{p.nameEn}</p>}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div><dt className="text-ink-400">رمز المنتج</dt><dd className="font-mono text-ink-100" dir="ltr">{p.sku}</dd></div>
            {p.barcode && <div><dt className="text-ink-400">الباركود</dt><dd className="font-mono text-ink-100" dir="ltr">{p.barcode}</dd></div>}
            {p.partBrand && <div><dt className="text-ink-400">الشركة المصنعة للقطعة</dt><dd className="text-ink-100">{p.partBrand}</dd></div>}
            {p.componentType && <div><dt className="text-ink-400">نوع القطعة</dt><dd className="text-ink-100">{p.componentType.nameAr}</dd></div>}
            {p.partNumbers && <div><dt className="text-ink-400">أرقام القطعة</dt><dd className="font-mono text-ink-100" dir="ltr">{p.partNumbers}</dd></div>}
          </dl>

          <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Price price={p.price} compareAt={p.compareAtPrice} size="lg" />
              <div className="flex items-center gap-2 text-sm">
                <StockBadge qty={p.stockQty} low={p.lowStockThreshold ?? s.inventory.defaultLowStock} />
                {s.inventory.showStockQty && p.stockQty > 0 && <span className="text-ink-300 tabular">({p.stockQty} قطعة)</span>}
              </div>
            </div>
            {p.wholesalePrice != null && p.wholesaleMinQty != null && p.wholesalePrice < p.price && (
              <p className="mt-3 rounded-lg bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">
                سعر الجملة: <strong className="tabular">{formatIQD(p.wholesalePrice)}</strong> للقطعة عند شراء {p.wholesaleMinQty} قطع أو أكثر (يُطبق تلقائياً في السلة).
              </p>
            )}
            <div className="mt-5">
              <AddToCartFull
                productId={p.id} nameAr={p.nameAr} slug={p.slug} sku={p.sku} imageId={p.images[0]?.uploadId ?? null}
                price={p.price} stockQty={p.stockQty} maxQty={s.order.maxQtyPerItem}
              />
            </div>
            <a href={waLink(wa, inquiry)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-2.5 w-full">
              <WhatsAppIcon className="h-5 w-5" /> استفسر عن هذا المنتج عبر واتساب
            </a>
          </div>

          {/* التوافق */}
          <section className="mt-6" aria-labelledby="compat-h">
            <h2 id="compat-h" className="mb-3 font-semibold text-white">الأجهزة المتوافقة</h2>
            {p.compat.length ? (
              <ul className="flex flex-wrap gap-2">
                {p.compat.map((c) => {
                  const st = COMPAT_STYLE[c.status];
                  return (
                    <li key={c.id}>
                      <Link href={`/products?model=${c.model.slug}`} className={`chip py-1.5 ${st.cls} ${selectedCompat?.id === c.id ? "ring-2 ring-cyan-400" : ""}`} title={`${COMPAT_LABELS[c.status]}${c.note ? ` — ${c.note}` : ""}`}>
                        <st.Icon className="h-3.5 w-3.5" />
                        <span dir="ltr">{c.model.name}{c.variant ? ` (${c.variant.name})` : ""}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-300">لم تُحدد أجهزة متوافقة لهذا المنتج.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-400">
              <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-green-400" /> توافق مؤكد</span>
              <span className="inline-flex items-center gap-1"><ShieldQuestion className="h-3.5 w-3.5 text-amber-400" /> غير مؤكد</span>
              <span className="inline-flex items-center gap-1"><CircleHelp className="h-3.5 w-3.5" /> غير معروف</span>
            </div>
            {(hasUnverified || p.compatibilityNote) && (
              <div className="mt-3 flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm leading-7 text-amber-100" role="note">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                <div>
                  {p.compatibilityNote && <p>{p.compatibilityNote}</p>}
                  {hasUnverified && <p>بعض التوافقات لم يتم التحقق منها بعد. الموديلات المتشابهة بالاسم قد تختلف في القطع — تواصل معنا عبر واتساب لتأكيد التوافق قبل الطلب.</p>}
                </div>
              </div>
            )}
          </section>

          {(p.warrantyText || p.deliveryNote || s.policies.shipping) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {p.warrantyText && (
                <div className="flex gap-3 rounded-xl border border-ink-700 bg-ink-900 p-4 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-cyan-400" /><div><p className="font-semibold text-white">الضمان</p><p className="mt-1 leading-6 text-ink-300">{p.warrantyText}</p></div></div>
              )}
              {(p.deliveryNote || s.policies.shipping) && (
                <div className="flex gap-3 rounded-xl border border-ink-700 bg-ink-900 p-4 text-sm"><Truck className="h-5 w-5 shrink-0 text-cyan-400" /><div><p className="font-semibold text-white">التوصيل</p><p className="mt-1 line-clamp-3 leading-6 text-ink-300">{p.deliveryNote || s.policies.shipping}</p></div></div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {(p.descriptionAr || specs.length > 0) && (
          <section className="card p-6" aria-labelledby="desc-h">
            <h2 id="desc-h" className="mb-4 text-lg font-bold text-white">الوصف والمواصفات</h2>
            {p.descriptionAr && <p className="whitespace-pre-line leading-8 text-ink-200">{p.descriptionAr}</p>}
            {specs.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <tbody>
                  {specs.map((sp, i) => (
                    <tr key={i} className="border-b border-ink-700/70 last:border-0">
                      <th scope="row" className="w-2/5 py-2.5 text-start font-medium text-ink-400">{sp.label}</th>
                      <td className="py-2.5 text-ink-100">{sp.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
        {p.installationNotes && (
          <section className="card p-6" aria-labelledby="inst-h">
            <h2 id="inst-h" className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Package className="h-5 w-5 text-cyan-400" /> ملاحظات التركيب</h2>
            <p className="whitespace-pre-line leading-8 text-ink-200">{p.installationNotes}</p>
          </section>
        )}
      </div>

      {alternatives.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title mb-5">قطع بديلة</h2>
          <ProductGrid items={alternatives} maxQty={s.order.maxQtyPerItem} />
        </section>
      )}
      {(related.length > 0 || auto.length > 0) && (
        <section className="mt-12">
          <h2 className="section-title mb-5">منتجات ذات صلة</h2>
          <ProductGrid items={related.length ? related : auto} maxQty={s.order.maxQtyPerItem} />
        </section>
      )}
    </div>
  );
}
