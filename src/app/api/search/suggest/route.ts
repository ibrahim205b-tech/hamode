import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeArabic } from "@/lib/arabic";
import { publicBaseWhere, searchWhere } from "@/lib/search";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 100).trim();
  if (q.length < 2) return NextResponse.json({ products: [], models: [], categories: [] });
  if (!(await rateLimit(`suggest:${await clientIp()}`, 120, 60))) return NextResponse.json({ error: "rate" }, { status: 429 });

  const sw = await searchWhere(q);
  const norm = normalizeArabic(q);
  const [products, models, categories] = await Promise.all([
    prisma.product.findMany({
      where: { AND: [await publicBaseWhere(), ...(sw ? [sw] : [])] },
      orderBy: [{ isFeatured: "desc" }, { stockQty: "desc" }],
      take: 6,
      select: { slug: true, nameAr: true, sku: true, price: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { uploadId: true } } },
    }),
    prisma.deviceModel.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { modelNumbers: { contains: q, mode: "insensitive" } },
          { aliases: { contains: norm, mode: "insensitive" } },
        ],
      },
      take: 4,
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, family: { select: { manufacturer: { select: { name: true } } } } },
    }),
    prisma.category.findMany({
      where: { isActive: true, OR: [{ nameAr: { contains: q, mode: "insensitive" } }, { nameEn: { contains: q, mode: "insensitive" } }] },
      take: 3,
      select: { slug: true, nameAr: true },
    }),
  ]);
  return NextResponse.json(
    {
      products: products.map((p) => ({ slug: p.slug, nameAr: p.nameAr, sku: p.sku, price: p.price, imageId: p.images[0]?.uploadId ?? null })),
      models: models.map((m) => ({ slug: m.slug, name: m.name, manufacturer: m.family.manufacturer.name })),
      categories,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
