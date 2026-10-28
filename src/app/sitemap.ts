import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getSettings, siteUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const s = await getSettings();
  const [products, cats, mans] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE", isDemo: false }, select: { slug: true, updatedAt: true }, take: 45000 }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.manufacturer.findMany({ where: { isActive: true }, select: { slug: true } }),
  ]);
  const policies = Object.entries(s.policies).filter(([, v]) => v.trim()).map(([k]) => ({ url: `${base}/policies/${k}` }));
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/devices`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/technicians`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/contact`, priority: 0.4 },
    ...cats.map((c) => ({ url: `${base}/category/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ...mans.map((m) => ({ url: `${base}/devices/${m.slug}`, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
    ...policies,
  ];
}
