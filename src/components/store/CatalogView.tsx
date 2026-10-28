import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { catalogQuery, type CatalogFilters } from "@/lib/search";
import { getComponentTypes, getConditions, getDeviceTree } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { formatNumber } from "@/lib/format";
import { ProductGrid } from "./ProductCard";
import { EmptyState } from "../ui/Empty";
import { AutoSubmitSelect } from "./AutoSubmit";

const SORTS: [string, string][] = [
  ["relevance", "الأكثر صلة"],
  ["newest", "الأحدث"],
  ["price_asc", "السعر: من الأقل"],
  ["price_desc", "السعر: من الأعلى"],
  ["name", "الاسم"],
];

function toParams(f: CatalogFilters, override: Partial<Record<string, string | undefined>> = {}) {
  const sp = new URLSearchParams();
  const base: Record<string, string | undefined> = {
    q: f.q, category: f.category, manufacturer: f.manufacturer, model: f.model, component: f.component, condition: f.condition,
    min: f.min?.toString(), max: f.max?.toString(), stock: f.inStock ? "1" : undefined, compat: f.compat,
    offers: f.offers ? "1" : undefined, tech: f.technician ? "1" : undefined, sort: f.sort,
  };
  for (const [k, v] of Object.entries({ ...base, ...override })) if (v) sp.set(k, v);
  return sp;
}

export async function CatalogView({ filters, basePath = "/products", lockCategory = false, title, description }: { filters: CatalogFilters; basePath?: string; lockCategory?: boolean; title: string; description?: string | null }) {
  const [s, result, tree, components, conditions, topCats] = await Promise.all([
    getSettings(),
    catalogQuery(filters),
    getDeviceTree(),
    getComponentTypes(),
    getConditions(),
    prisma.category.findMany({ where: { parentId: null, isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, nameAr: true, children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, nameAr: true } } } }),
  ]);
  const modelsForMan = filters.manufacturer ? tree.find((m) => m.slug === filters.manufacturer)?.families ?? [] : tree.flatMap((m) => m.families.map((f) => ({ ...f, name: `${m.name} · ${f.name}` })));
  const currentModel = filters.model ? tree.flatMap((m) => m.families.flatMap((f) => f.models)).find((m) => m.slug === filters.model) : null;
  const href = (o: Partial<Record<string, string | undefined>>) => {
    const sp = toParams(filters, o);
    if (lockCategory) sp.delete("category");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const active: { label: string; key: string }[] = [];
  if (filters.q) active.push({ label: `بحث: ${filters.q}`, key: "q" });
  if (currentModel) active.push({ label: `الجهاز: ${currentModel.name}`, key: "model" });
  else if (filters.manufacturer) active.push({ label: `الشركة: ${tree.find((m) => m.slug === filters.manufacturer)?.name ?? filters.manufacturer}`, key: "manufacturer" });
  if (filters.component) active.push({ label: `القطعة: ${components.find((c) => c.slug === filters.component)?.nameAr ?? filters.component}`, key: "component" });
  if (filters.condition) active.push({ label: `الحالة: ${conditions.find((c) => c.slug === filters.condition)?.nameAr ?? ""}`, key: "condition" });
  if (filters.inStock) active.push({ label: "المتوفر فقط", key: "stock" });
  if (filters.offers) active.push({ label: "العروض", key: "offers" });
  if (filters.technician) active.push({ label: "للفنيين", key: "tech" });
  if (filters.compat) active.push({ label: filters.compat === "VERIFIED" ? "توافق مؤكد" : filters.compat === "UNVERIFIED" ? "توافق غير مؤكد" : "توافق غير معروف", key: "compat" });
  if (filters.min != null || filters.max != null) active.push({ label: `السعر ${filters.min ?? 0} - ${filters.max ?? "∞"}`, key: "price" });
  if (!lockCategory && filters.category) active.push({ label: `القسم: ${topCats.flatMap((c) => [c, ...c.children]).find((c) => c.slug === filters.category)?.nameAr ?? ""}`, key: "category" });

  const filterForm = (
    <form action={basePath} method="get" className="space-y-4">
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
      {filters.offers && <input type="hidden" name="offers" value="1" />}
      {filters.technician && <input type="hidden" name="tech" value="1" />}
      {!lockCategory && (
        <div>
          <label className="label" htmlFor="f-cat">القسم</label>
          <select id="f-cat" name="category" defaultValue={filters.category ?? ""} className="input">
            <option value="">كل الأقسام</option>
            {topCats.map((c) => (
              <optgroup key={c.slug} label={c.nameAr}>
                <option value={c.slug}>كل {c.nameAr}</option>
                {c.children.map((ch) => <option key={ch.slug} value={ch.slug}>{ch.nameAr}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="f-man">الشركة المصنعة للجهاز</label>
        <select id="f-man" name="manufacturer" defaultValue={filters.manufacturer ?? ""} className="input">
          <option value="">الكل</option>
          {tree.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-model">موديل الجهاز</label>
        <select id="f-model" name="model" defaultValue={filters.model ?? ""} className="input">
          <option value="">الكل</option>
          {modelsForMan.map((f) => (
            <optgroup key={f.name} label={f.name}>
              {f.models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-comp">نوع القطعة</label>
        <select id="f-comp" name="component" defaultValue={filters.component ?? ""} className="input">
          <option value="">الكل</option>
          {components.map((c) => <option key={c.slug} value={c.slug}>{c.nameAr}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-cond">حالة المنتج</label>
        <select id="f-cond" name="condition" defaultValue={filters.condition ?? ""} className="input">
          <option value="">الكل</option>
          {conditions.map((c) => <option key={c.slug} value={c.slug}>{c.nameAr}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="label">السعر (د.ع)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="min" inputMode="numeric" placeholder="من" defaultValue={filters.min ?? ""} className="input" aria-label="السعر من" />
          <input name="max" inputMode="numeric" placeholder="إلى" defaultValue={filters.max ?? ""} className="input" aria-label="السعر إلى" />
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="f-compat">حالة التوافق</label>
        <select id="f-compat" name="compat" defaultValue={filters.compat ?? ""} className="input">
          <option value="">الكل</option>
          <option value="VERIFIED">توافق مؤكد</option>
          <option value="UNVERIFIED">توافق غير مؤكد</option>
          <option value="UNKNOWN">توافق غير معروف</option>
        </select>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-200">
        <input type="checkbox" name="stock" value="1" defaultChecked={filters.inStock} className="h-4 w-4 accent-brand-500" /> المتوفر فقط
      </label>
      <div className="flex gap-2">
        <button className="btn-primary flex-1" type="submit">تطبيق</button>
        <Link href={basePath} className="btn-secondary">مسح</Link>
      </div>
    </form>
  );

  return (
    <div className="container py-8">
      <nav aria-label="مسار التنقل" className="mb-4 text-xs text-ink-400">
        <Link href="/" className="hover:text-white">الرئيسية</Link> <span aria-hidden>/</span> <span className="text-ink-200">{title}</span>
      </nav>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-300">{description}</p>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-32 p-4">
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4 text-cyan-400" /> تصفية النتائج</h2>
            {filterForm}
          </div>
        </aside>
        <div className="min-w-0">
          <details className="card mb-4 p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4 text-cyan-400" /> تصفية النتائج</summary>
            <div className="mt-4">{filterForm}</div>
          </details>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-300" aria-live="polite"><span className="font-semibold text-white tabular">{formatNumber(result.total)}</span> منتج</p>
            <form action={basePath} method="get" className="flex items-center gap-2">
              {[...toParams(filters, { sort: undefined }).entries()].filter(([k]) => !(lockCategory && k === "category")).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <label htmlFor="sort" className="text-sm text-ink-300">ترتيب</label>
              <AutoSubmitSelect id="sort" name="sort" defaultValue={filters.sort ?? "relevance"} className="input !w-auto !py-2" options={SORTS} />
              <noscript><button className="btn-secondary btn-sm">تطبيق</button></noscript>
            </form>
          </div>
          {active.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {active.map((a) => (
                <Link key={a.key} href={href(a.key === "price" ? { min: undefined, max: undefined, page: undefined } : { [a.key]: undefined, page: undefined })} className="chip border-ink-600 bg-ink-800 py-1 text-ink-100 hover:border-danger/50">
                  {a.label} <X className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}
          {currentModel && (
            <p className="mb-4 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm leading-7 text-ink-300">
              تُعرض القطع المرتبطة بجهاز <strong className="text-white">{currentModel.name}</strong>. انتبه لشارة التوافق في صفحة كل منتج — القطع غير المؤكدة تحتاج تأكيداً قبل الطلب.
            </p>
          )}
          {result.items.length ? (
            <ProductGrid items={result.items} maxQty={s.order.maxQtyPerItem} />
          ) : (
            <EmptyState
              title="لا توجد نتائج مطابقة"
              text="جرّب كلمات أخرى (بالعربي أو الإنجليزي)، أو أزل بعض الفلاتر، أو راسلنا عبر واتساب وسنبحث لك عن القطعة."
              action={<Link href={basePath} className="btn-secondary">مسح الفلاتر</Link>}
            />
          )}
          {result.pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="الصفحات">
              {result.page > 1 && <Link className="btn-secondary btn-sm" href={href({ page: String(result.page - 1) })} rel="prev">السابق</Link>}
              <span className="px-3 text-sm text-ink-300 tabular">صفحة {result.page} من {result.pages}</span>
              {result.page < result.pages && <Link className="btn-secondary btn-sm" href={href({ page: String(result.page + 1) })} rel="next">التالي</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
