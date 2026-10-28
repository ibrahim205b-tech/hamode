/**
 * يولّد صوراً توضيحية أصلية (رسومات SVG → WebP) للمنتجات التجريبية فقط ويربطها بها.
 * هذه رسومات توضيحية وليست صوراً فوتوغرافية لمنتجات حقيقية.
 *   DATABASE_URL=... node scripts/demo-images.mjs
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const prisma = new PrismaClient();

const frame = (inner, accent = "#2F6BFF") => `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E7ECF3"/></radialGradient>
    <linearGradient id="ac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#22D3EE"/></linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9DEE6"/><stop offset=".5" stop-color="#F6F8FB"/><stop offset="1" stop-color="#B9C1CC"/></linearGradient>
    <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C2532"/><stop offset="1" stop-color="#05070B"/></linearGradient>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0A0E14" flood-opacity=".22"/></filter>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <ellipse cx="400" cy="690" rx="250" ry="26" fill="#0A0E14" opacity=".08"/>
  <g filter="url(#sh)">${inner}</g>
</svg>`;

const screen = (notch = true) => frame(`
  <rect x="250" y="90" width="300" height="600" rx="52" fill="url(#dark)"/>
  <rect x="262" y="102" width="276" height="576" rx="42" fill="#0B1220"/>
  <rect x="270" y="110" width="260" height="560" rx="36" fill="url(#ac)" opacity=".92"/>
  <circle cx="330" cy="250" r="140" fill="#fff" opacity=".10"/><circle cx="480" cy="520" r="170" fill="#05070B" opacity=".18"/>
  ${notch ? `<rect x="350" y="122" width="100" height="26" rx="13" fill="#05070B"/>` : `<circle cx="400" cy="134" r="9" fill="#05070B"/>`}
  <rect x="235" y="230" width="8" height="70" rx="4" fill="#3A475B"/><rect x="557" y="250" width="8" height="100" rx="4" fill="#3A475B"/>`);

const battery = () => frame(`
  <rect x="245" y="120" width="310" height="540" rx="30" fill="url(#dark)"/>
  <rect x="265" y="140" width="270" height="500" rx="20" fill="#141A24"/>
  <rect x="285" y="170" width="230" height="10" rx="5" fill="url(#ac)"/>
  <g fill="#283344"><rect x="285" y="420" width="230" height="8" rx="4"/><rect x="285" y="440" width="170" height="8" rx="4"/><rect x="285" y="460" width="200" height="8" rx="4"/></g>
  <path d="M400 230 l-40 90 h34 l-14 70 l60-100 h-36 l20-60z" fill="url(#ac)"/>
  <path d="M400 120 v-40 h120 v40" stroke="#C7A44B" stroke-width="14" fill="none" stroke-linejoin="round"/>
  <rect x="490" y="60" width="70" height="40" rx="8" fill="#1F55E0"/><rect x="500" y="70" width="50" height="20" rx="4" fill="#E3ECFF"/>`, "#22C55E");

const board = () => frame(`
  <rect x="190" y="230" width="420" height="300" rx="22" fill="#0F5132"/>
  <rect x="190" y="230" width="420" height="300" rx="22" fill="url(#ac)" opacity=".14"/>
  <g stroke="#C7A44B" stroke-width="5" fill="none" opacity=".85"><path d="M240 290 h120 v60 h80"/><path d="M240 460 h90 v-50 h150"/><path d="M560 300 v120 h-60"/></g>
  <rect x="300" y="190" width="200" height="80" rx="18" fill="url(#metal)" stroke="#8C96A4" stroke-width="4"/>
  <rect x="335" y="215" width="130" height="30" rx="15" fill="#1C2532"/>
  <rect x="440" y="380" width="70" height="70" rx="8" fill="#0A0E14"/><rect x="260" y="370" width="40" height="24" rx="4" fill="#283344"/>
  <circle cx="230" cy="500" r="14" fill="url(#metal)"/><circle cx="570" cy="500" r="14" fill="url(#metal)"/>
  <path d="M400 530 v80 h150" stroke="#E0A92E" stroke-width="34" fill="none" stroke-linecap="round" opacity=".9"/>`, "#22C55E");

const flex = () => frame(`
  <path d="M220 560 C 300 560, 300 300, 400 300 S 520 220, 560 220" stroke="#E0A92E" stroke-width="58" fill="none" stroke-linecap="round"/>
  <path d="M220 560 C 300 560, 300 300, 400 300 S 520 220, 560 220" stroke="#C78A1E" stroke-width="10" fill="none" stroke-dasharray="2 22" stroke-linecap="round"/>
  <rect x="140" y="510" width="150" height="110" rx="14" fill="url(#metal)" stroke="#8C96A4" stroke-width="4"/>
  <rect x="170" y="545" width="90" height="38" rx="19" fill="#1C2532"/>
  <rect x="520" y="170" width="140" height="90" rx="12" fill="#0A0E14"/><rect x="540" y="190" width="100" height="50" rx="6" fill="url(#ac)" opacity=".8"/>
  <circle cx="420" cy="420" r="26" fill="#1C2532"/><circle cx="420" cy="420" r="12" fill="#64748B"/>`);

const camera = () => frame(`
  <rect x="230" y="200" width="340" height="340" rx="70" fill="url(#dark)"/>
  ${[[330, 300], [470, 300], [330, 440]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="62" fill="url(#metal)"/><circle cx="${x}" cy="${y}" r="48" fill="#05070B"/><circle cx="${x}" cy="${y}" r="30" fill="url(#ac)" opacity=".85"/><circle cx="${x - 12}" cy="${y - 12}" r="9" fill="#fff" opacity=".7"/>`).join("")}
  <circle cx="470" cy="440" r="20" fill="#FFE8A3"/><circle cx="470" cy="485" r="9" fill="#1C2532"/>
  <path d="M400 540 v90 h120" stroke="#E0A92E" stroke-width="30" fill="none" stroke-linecap="round"/>`);

const speaker = () => frame(`
  <rect x="210" y="300" width="380" height="170" rx="40" fill="url(#dark)"/>
  <rect x="240" y="330" width="320" height="110" rx="28" fill="#1C2532"/>
  <g fill="#3A475B">${Array.from({ length: 5 }, (_, r) => Array.from({ length: 14 }, (_, c) => `<circle cx="${268 + c * 20}" cy="${348 + r * 18}" r="5"/>`).join("")).join("")}</g>
  <rect x="380" y="470" width="40" height="110" rx="8" fill="#E0A92E"/><rect x="360" y="570" width="80" height="40" rx="8" fill="url(#metal)"/>`);

const screwdrivers = () => frame(`
  <rect x="170" y="200" width="460" height="380" rx="32" fill="url(#dark)"/>
  <rect x="195" y="225" width="410" height="330" rx="20" fill="#141A24"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${222 + i * 48}" y="260" width="30" height="${170 + (i % 3) * 25}" rx="14" fill="url(#ac)" opacity="${0.75 + (i % 2) * 0.2}"/><rect x="${231 + i * 48}" y="${430 + (i % 3) * 25}" width="12" height="60" rx="4" fill="url(#metal)"/>`).join("")}`);

const hotAir = () => frame(`
  <rect x="150" y="300" width="330" height="270" rx="26" fill="url(#dark)"/>
  <rect x="180" y="335" width="160" height="80" rx="10" fill="#05070B"/>
  <text x="260" y="390" font-family="monospace" font-size="54" font-weight="700" fill="#22D3EE" text-anchor="middle">380</text>
  <circle cx="410" cy="375" r="36" fill="url(#metal)"/><circle cx="410" cy="480" r="36" fill="url(#metal)"/>
  <rect x="190" y="460" width="150" height="20" rx="10" fill="url(#ac)"/>
  <path d="M480 520 C 560 520, 560 360, 600 300" stroke="#1C2532" stroke-width="22" fill="none" stroke-linecap="round"/>
  <rect x="560" y="150" width="70" height="200" rx="30" fill="url(#dark)" transform="rotate(18 595 250)"/>
  <rect x="610" y="110" width="26" height="70" rx="8" fill="url(#metal)" transform="rotate(18 595 250)"/>`);

const multimeter = () => frame(`
  <rect x="250" y="110" width="300" height="560" rx="44" fill="#F5B300"/>
  <rect x="275" y="135" width="250" height="510" rx="30" fill="url(#dark)"/>
  <rect x="300" y="165" width="200" height="110" rx="12" fill="#A7C7B4"/>
  <text x="400" y="242" font-family="monospace" font-size="62" font-weight="700" fill="#0F2A1C" text-anchor="middle">3.70</text>
  <circle cx="400" cy="400" r="78" fill="url(#metal)"/><circle cx="400" cy="400" r="52" fill="#283344"/><rect x="394" y="330" width="12" height="70" rx="6" fill="#F5B300"/>
  <circle cx="330" cy="560" r="20" fill="#05070B" stroke="#EF4444" stroke-width="6"/><circle cx="400" cy="560" r="20" fill="#05070B" stroke="#94A3B8" stroke-width="6"/><circle cx="470" cy="560" r="20" fill="#05070B" stroke="#EF4444" stroke-width="6"/>`, "#F5B300");

const glueTube = () => frame(`
  <path d="M260 560 L300 240 H500 L540 560 Z" fill="url(#metal)"/>
  <path d="M300 240 H500 L540 560 H260 Z" fill="url(#ac)" opacity=".85"/>
  <rect x="300" y="330" width="200" height="120" rx="12" fill="#fff" opacity=".92"/>
  <rect x="325" y="360" width="150" height="16" rx="8" fill="#1F55E0"/><rect x="325" y="392" width="110" height="12" rx="6" fill="#94A3B8"/><rect x="325" y="414" width="130" height="12" rx="6" fill="#94A3B8"/>
  <rect x="250" y="560" width="300" height="40" rx="8" fill="url(#metal)"/>
  <path d="M370 240 L385 130 H415 L430 240 Z" fill="url(#metal)"/><path d="M393 130 L400 70 L407 130 Z" fill="#B9C1CC"/>`);

const flux = () => frame(`
  <rect x="280" y="300" width="240" height="300" rx="30" fill="url(#ac)" opacity=".9"/>
  <rect x="280" y="300" width="240" height="300" rx="30" fill="#fff" opacity=".12"/>
  <rect x="270" y="250" width="260" height="70" rx="18" fill="url(#dark)"/>
  <rect x="310" y="390" width="180" height="120" rx="12" fill="#fff" opacity=".92"/>
  <rect x="335" y="420" width="130" height="18" rx="9" fill="#05070B"/><rect x="335" y="452" width="90" height="12" rx="6" fill="#94A3B8"/>
  <rect x="300" y="540" width="200" height="34" rx="10" fill="#FFE8A3" opacity=".7"/>`, "#F59E0B");

const cable = () => frame(`
  <path d="M250 250 C 120 380, 300 560, 420 480 S 650 300, 560 560" stroke="url(#dark)" stroke-width="34" fill="none" stroke-linecap="round"/>
  <rect x="200" y="140" width="110" height="140" rx="24" fill="url(#metal)" stroke="#8C96A4" stroke-width="4" transform="rotate(-20 255 210)"/>
  <rect x="226" y="100" width="58" height="60" rx="20" fill="url(#metal)" stroke="#8C96A4" stroke-width="4" transform="rotate(-20 255 210)"/>
  <rect x="505" y="540" width="110" height="140" rx="24" fill="url(#metal)" stroke="#8C96A4" stroke-width="4" transform="rotate(15 560 610)"/>
  <rect x="531" y="660" width="58" height="50" rx="20" fill="url(#metal)" stroke="#8C96A4" stroke-width="4" transform="rotate(15 560 610)"/>
  <rect x="230" y="200" width="50" height="8" rx="4" fill="url(#ac)" transform="rotate(-20 255 210)"/>`);

const charger = () => frame(`
  <rect x="250" y="250" width="300" height="300" rx="56" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="6"/>
  <rect x="250" y="250" width="300" height="300" rx="56" fill="url(#metal)" opacity=".35"/>
  <rect x="345" y="420" width="110" height="34" rx="17" fill="#1C2532"/><rect x="365" y="430" width="70" height="14" rx="7" fill="#64748B"/>
  <path d="M385 330 l-22 52 h22 l-10 44 l40-62 h-24 l14-34z" fill="url(#ac)"/>
  <rect x="320" y="170" width="24" height="90" rx="10" fill="url(#metal)" stroke="#94A3B8" stroke-width="3"/>
  <rect x="456" y="170" width="24" height="90" rx="10" fill="url(#metal)" stroke="#94A3B8" stroke-width="3"/>`);

const MAP = [
  [/^DEMO-SCR-IP/, () => screen(true)], [/^DEMO-SCR-/, () => screen(false)], [/^DEMO-BAT-/, battery],
  [/^DEMO-CHG-A/, board], [/^DEMO-CHG-/, flex], [/^DEMO-CAM-/, camera], [/^DEMO-SPK-/, speaker],
  [/^DEMO-TOOL-SCR/, screwdrivers], [/^DEMO-TOOL-HOT/, hotAir], [/^DEMO-TOOL-DMM/, multimeter],
  [/^DEMO-CON-B7000/, glueTube], [/^DEMO-CON-FLUX/, flux], [/^DEMO-ACC-CBL/, cable], [/^DEMO-ACC-CHG/, charger],
];

const products = await prisma.product.findMany({ where: { isDemo: true }, include: { _count: { select: { images: true } } } });
let made = 0;
for (const p of products) {
  if (p._count.images) continue;
  const gen = MAP.find(([re]) => re.test(p.sku))?.[1];
  if (!gen) continue;
  const out = await sharp(Buffer.from(gen())).webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
  const up = await prisma.upload.create({ data: { mime: "image/webp", data: out.data, width: out.info.width, height: out.info.height, size: out.info.size } });
  await prisma.productImage.create({ data: { productId: p.id, uploadId: up.id, alt: `${p.nameAr} — صورة توضيحية`, sortOrder: 0 } });
  made++;
}
console.log(`✓ ${made} صورة توضيحية للمنتجات التجريبية`);
await prisma.$disconnect();
