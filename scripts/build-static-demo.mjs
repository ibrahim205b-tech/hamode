/**
 * يبني «نسخة عرض ثابتة» من واجهة المتجر الحقيقية لنشرها على GitHub Pages.
 * - يستخدم قاعدة بيانات عرض منفصلة تحتوي منتجات تجريبية فقط (لا بيانات حقيقية ولا أسرار).
 * - يبني التطبيق نفسه في وضع العرض (basePath + صور ثابتة)، ثم يحفظ كل صفحة كملف HTML.
 * - الناتج في out-demo/ وجاهز للنشر على فرع gh-pages.
 *
 *   DEMO_DATABASE_URL=postgresql://.../hammoudi_demo node scripts/build-static-demo.mjs
 *
 * متغيرات اختيارية: DEMO_BASE_PATH (افتراضي /hamode)، DEMO_SITE_URL، DEMO_PORT
 */
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, cpSync, rmSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const DB = process.env.DEMO_DATABASE_URL;
if (!DB) throw new Error("DEMO_DATABASE_URL مطلوب (قاعدة بيانات عرض منفصلة)");
const BASE = process.env.DEMO_BASE_PATH ?? "/hamode";
const SITE = process.env.DEMO_SITE_URL ?? `https://ibrahim205b-tech.github.io${BASE}`;
const PORT = Number(process.env.DEMO_PORT || 4100);
const OUT = path.resolve("out-demo");
const env = { ...process.env, DATABASE_URL: DB, NEXT_PUBLIC_DEMO_STATIC: "1", NEXT_PUBLIC_BASE_PATH: BASE, NEXT_PUBLIC_SITE_URL: SITE, NEXT_TELEMETRY_DISABLED: "1" };
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", env, timeout: 15 * 60_000 });

const prisma = new PrismaClient({ datasources: { db: { url: DB } } });

// 1) قاعدة بيانات العرض: ترحيل + بيانات أساسية + منتجات تجريبية + صور توضيحية
console.log("▶ تجهيز قاعدة بيانات العرض");
run("npx", ["prisma", "migrate", "deploy"]);
const realProducts = await prisma.product.count({ where: { isDemo: false } });
const orders = await prisma.order.count();
if (realProducts || orders) throw new Error("قاعدة البيانات تحتوي منتجات حقيقية أو طلبات — استخدم قاعدة عرض منفصلة وفارغة");
run("npx", ["tsx", "prisma/seed.ts", "--demo"]);
run("node", ["scripts/demo-images.mjs"]);
await prisma.setting.upsert({
  where: { key: "store" },
  create: { key: "store", value: {} },
  update: {},
});
const current = (await prisma.setting.findUnique({ where: { key: "store" } }))?.value ?? {};
await prisma.setting.update({
  where: { key: "store" },
  data: {
    value: {
      ...current,
      announcement: { enabled: true, text: "نسخة عرض تجريبية — المنتجات والأسعار والصور للعرض فقط، ولا يتم تسجيل أي طلب", link: "" },
      showDemoProducts: true,
    },
  },
});

// 2) بناء التطبيق في وضع العرض
console.log("▶ بناء التطبيق (وضع العرض)");
run("npx", ["next", "build"]);

// 3) تشغيل الخادم مؤقتاً وحفظ الصفحات
console.log("▶ حفظ الصفحات");
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
const origin = `http://localhost:${PORT}`;
const killServer = () => { try { process.kill(-server.pid, "SIGKILL"); } catch {} };
process.on("exit", killServer);
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`${origin}${BASE}/`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const [products, cats, mans] = await Promise.all([
  prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true } }),
  prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
  prisma.manufacturer.findMany({ where: { isActive: true }, select: { slug: true } }),
]);
const queue = ["/", "/products", "/devices", "/technicians", "/contact", "/cart", "/checkout",
  ...cats.map((c) => `/category/${c.slug}`), ...mans.map((m) => `/devices/${m.slug}`), ...products.map((p) => `/product/${p.slug}`)];
const seen = new Set();
const skip = /^\/(admin|api|account|track|order|_next)/;
let pages = 0;
while (queue.length) {
  const route = queue.shift();
  if (seen.has(route) || skip.test(route)) continue;
  seen.add(route);
  const res = await fetch(`${origin}${BASE}${route === "/" ? "" : route}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) { console.log(`  ! ${route} → ${res.status}`); continue; }
  const html = await res.text();
  const file = route === "/" ? "index.html" : `${route.slice(1)}.html`;
  mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
  writeFileSync(path.join(OUT, file), html);
  pages++;
  // اكتشاف روابط داخلية إضافية (بدون معاملات استعلام)
  for (const m of html.matchAll(new RegExp(`href="${BASE}(/[^"?#]*)"`, "g"))) {
    const r = decodeURIComponent(m[1]).replace(/\/$/, "") || "/";
    if (!seen.has(r) && !skip.test(r) && !/\.[a-z0-9]+$/i.test(r)) queue.push(r);
  }
}
const nf = await fetch(`${origin}${BASE}/__not-found__`);
writeFileSync(path.join(OUT, "404.html"), await nf.text());
killServer();
console.log(`  ${pages} صفحة`);

// 4) الملفات الثابتة: JS/CSS/الخطوط + public + الصور
cpSync(".next-demo/static", path.join(OUT, "_next/static"), { recursive: true });
for (const f of readdirSync("public")) cpSync(path.join("public", f), path.join(OUT, f), { recursive: true });
mkdirSync(path.join(OUT, "media"), { recursive: true });
const uploads = await prisma.upload.findMany({ select: { id: true, data: true } });
for (const u of uploads) writeFileSync(path.join(OUT, "media", `${u.id}.webp`), u.data);

// 5) بيانات العرض للبحث والفلترة والسلة في المتصفح (منتجات تجريبية فقط — بدون التكلفة أو أي بيانات خاصة)
const full = await prisma.product.findMany({
  where: { status: "ACTIVE", isDemo: true },
  include: {
    condition: { select: { nameAr: true, slug: true } },
    componentType: { select: { slug: true } },
    category: { select: { nameAr: true, slug: true, icon: true, parent: { select: { icon: true, slug: true } } } },
    images: { select: { uploadId: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    compat: { select: { model: { select: { slug: true, family: { select: { manufacturer: { select: { slug: true } } } } } } } },
  },
});
const models = await prisma.deviceModel.findMany({ where: { isActive: true }, select: { slug: true, name: true, family: { select: { manufacturer: { select: { name: true } } } } }, orderBy: { sortOrder: "asc" } });
const categories = await prisma.category.findMany({ where: { isActive: true }, select: { slug: true, nameAr: true, nameEn: true } });
const catalog = {
  products: full.map((p) => ({
    id: p.id, slug: p.slug, sku: p.sku, nameAr: p.nameAr, nameEn: p.nameEn, price: p.price, compareAtPrice: p.compareAtPrice,
    stockQty: p.stockQty, isDemo: p.isDemo, isFeatured: p.isFeatured, technicianOnly: p.technicianOnly, qualityGrade: p.qualityGrade,
    condition: p.condition, category: { nameAr: p.category.nameAr, slug: p.category.slug, icon: p.category.icon, parent: p.category.parent ? { icon: p.category.parent.icon } : null },
    images: p.images, searchText: p.searchText,
    categorySlugs: [p.category.slug, p.category.parent?.slug].filter(Boolean),
    modelSlugs: p.compat.map((c) => c.model.slug),
    manufacturerSlugs: [...new Set(p.compat.map((c) => c.model.family.manufacturer.slug))],
    componentSlug: p.componentType?.slug ?? null, conditionSlug: p.condition?.slug ?? null,
    wholesalePrice: p.wholesalePrice, wholesaleMinQty: p.wholesaleMinQty, createdAt: p.createdAt.toISOString(),
  })),
  models: models.map((m) => ({ slug: m.slug, name: m.name, manufacturer: m.family.manufacturer.name })),
  categories,
};
mkdirSync(path.join(OUT, "demo-data"), { recursive: true });
writeFileSync(path.join(OUT, "demo-data/catalog.json"), JSON.stringify(catalog));

// 6) GitHub Pages: تعطيل Jekyll (وإلا يتجاهل مجلد _next)
writeFileSync(path.join(OUT, ".nojekyll"), "");
writeFileSync(path.join(OUT, "README.md"), "# HAMMOUDI EXPERT — نسخة عرض ثابتة\n\nهذا الفرع مولّد تلقائياً بواسطة `scripts/build-static-demo.mjs` من الفرع main. لا تعدّله يدوياً.\n");

// 7) فحص: لا روابط بدون المسار الأساسي ولا مراجع لواجهات الخادم
const bad = [];
for (const f of execFileSync("find", [OUT, "-name", "*.html"]).toString().trim().split("\n")) {
  const html = (await import("node:fs")).readFileSync(f, "utf8");
  if (html.includes("/api/images/")) bad.push(`${f}: /api/images`);
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!m[1].startsWith(BASE + "/") && m[1] !== BASE) bad.push(`${path.relative(OUT, f)}: ${m[1]}`);
}
if (bad.length) console.log("⚠ روابط بدون المسار الأساسي:\n  " + [...new Set(bad)].slice(0, 20).join("\n  "));
console.log(`✓ نسخة العرض جاهزة في ${OUT} (${uploads.length} صورة)`);
await prisma.$disconnect();
process.exit(0);
