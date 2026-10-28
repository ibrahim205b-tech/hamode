/**
 * بذر قاعدة البيانات:
 *   npm run db:seed        → البيانات الأساسية فقط (الأقسام، الشركات والموديلات، أنواع القطع، الحالات)
 *   npm run db:seed:demo   → + منتجات تجريبية واضحة الوسم (isDemo) لعرض الموقع
 * آمن للتكرار: يستخدم upsert ولا يحذف بيانات موجودة.
 */
import { PrismaClient } from "@prisma/client";
import { reindexProduct } from "../src/lib/search";

const prisma = new PrismaClient();
const withDemo = process.argv.includes("--demo");

type Cat = { slug: string; ar: string; en: string; icon: string; subs: [string, string, string][] };

const CATEGORIES: Cat[] = [
  { slug: "screens", ar: "الشاشات", en: "Screens & Displays", icon: "screen", subs: [
    ["lcd-screens", "شاشات LCD", "LCD Screens"], ["oled-screens", "شاشات OLED", "OLED Screens"], ["amoled-screens", "شاشات AMOLED", "AMOLED Screens"],
    ["display-assemblies", "شاشات كاملة مع الإطار", "Complete Display Assemblies"], ["touch-panels", "لوحات اللمس", "Touch Panels"],
    ["screen-glass", "زجاج الشاشة", "Replacement Screen Glass"], ["screen-frames", "إطارات الشاشة", "Screen Frames"],
    ["display-flex", "فليكسات الشاشة", "Display Flex Cables"], ["screen-adhesives", "لواصق الشاشة", "Screen Adhesives"],
    ["screen-install-materials", "مستلزمات تركيب الشاشة", "Screen Installation Materials"],
  ] },
  { slug: "batteries-power", ar: "البطاريات والطاقة", en: "Batteries & Power", icon: "battery", subs: [
    ["batteries", "بطاريات بديلة", "Replacement Batteries"], ["battery-flex", "فليكسات البطارية", "Battery Flex Cables"],
    ["battery-connectors", "موصلات البطارية", "Battery Connectors"], ["power-buttons", "أزرار التشغيل", "Power Buttons"],
    ["power-ics", "آيسيات الباور", "Power ICs"], ["charging-ics", "آيسيات الشحن", "Charging ICs"],
    ["power-management", "مكونات إدارة الطاقة", "Power Management Components"], ["battery-testing", "ملحقات فحص البطارية", "Battery Testing Accessories"],
  ] },
  { slug: "charging", ar: "قطع الشحن", en: "Charging Components", icon: "charging", subs: [
    ["usb-c-ports", "منافذ شحن USB-C", "USB-C Charging Ports"], ["micro-usb-ports", "منافذ Micro-USB", "Micro-USB Ports"],
    ["lightning-ports", "منافذ Lightning", "Lightning Ports"], ["charging-flex", "فليكسات الشحن", "Charging Flex Cables"],
    ["charging-boards", "بوردات الشحن", "Charging Daughterboards"], ["usb-connectors", "موصلات USB", "USB Connectors"],
    ["wireless-charging-parts", "قطع الشحن اللاسلكي", "Wireless Charging Components"], ["charging-port-assemblies", "مجموعات منفذ الشحن", "Charging Port Assemblies"],
  ] },
  { slug: "cameras-sensors", ar: "الكاميرات والحساسات", en: "Cameras & Sensors", icon: "camera", subs: [
    ["front-cameras", "كاميرات أمامية", "Front Cameras"], ["rear-cameras", "كاميرات خلفية", "Rear Cameras"], ["camera-lenses", "عدسات الكاميرا", "Camera Lenses"],
    ["camera-flex", "فليكسات الكاميرا", "Camera Flex Cables"], ["proximity-sensors", "حساسات القرب", "Proximity Sensors"],
    ["light-sensors", "حساسات الإضاءة", "Ambient Light Sensors"], ["fingerprint-sensors", "حساسات البصمة", "Fingerprint Sensors"],
    ["sensor-flex", "فليكسات الحساسات", "Sensor Flex Cables"], ["camera-connectors", "موصلات الكاميرا والحساسات", "Related Connectors"],
  ] },
  { slug: "audio", ar: "قطع الصوت", en: "Audio Components", icon: "audio", subs: [
    ["earpiece-speakers", "سماعات المكالمة", "Earpiece Speakers"], ["loudspeakers", "السماعات الخارجية (البازر)", "Loudspeakers"],
    ["microphones", "المايكروفونات", "Microphones"], ["audio-flex", "فليكسات الصوت", "Audio Flex Cables"],
    ["audio-ics", "آيسيات الصوت", "Audio ICs"], ["headphone-jacks", "منافذ السماعة", "Headphone Connectors"],
  ] },
  { slug: "internal-parts", ar: "القطع الداخلية", en: "Internal Spare Parts", icon: "internal", subs: [
    ["volume-buttons", "أزرار الصوت", "Volume Buttons"], ["power-buttons-internal", "أزرار الباور", "Power Buttons"], ["sim-trays", "درج الشريحة", "SIM Trays"],
    ["sim-readers", "قارئات الشريحة", "SIM Readers"], ["antennas", "الهوائيات (الأنتينا)", "Antennas"], ["wifi-components", "قطع الواي فاي", "Wi-Fi Components"],
    ["nfc-components", "قطع NFC", "NFC Components"], ["vibration-motors", "هزازات", "Vibration Motors"], ["internal-flex", "فليكسات داخلية", "Internal Flex Cables"],
    ["connectors-brackets", "موصلات وحوامل", "Connectors & Brackets"], ["screws-fittings", "براغي وتثبيتات", "Screws & Internal Fittings"],
  ] },
  { slug: "board-components", ar: "قطع البورد", en: "Motherboard Repair Components", icon: "board", subs: [
    ["ics", "الآيسيات (IC)", "Integrated Circuits"], ["resistors", "المقاومات", "Resistors"], ["capacitors", "المكثفات", "Capacitors"],
    ["diodes", "الدايودات", "Diodes"], ["coils", "الكويلات والملفات", "Coils & Inductors"], ["board-connectors", "موصلات البورد (FPC)", "Board Connectors"],
    ["jumper-wires", "أسلاك الجمبر", "Jumper Wires"], ["soldering-supplies", "مستهلكات اللحام", "Soldering Consumables"],
    ["board-repair-parts", "قطع إصلاح البورد", "Board Repair Components"], ["donor-boards", "بوردات وقطع مستعملة للتفكيك", "Donor Boards & Used Components"],
  ] },
  { slug: "tools", ar: "أدوات وأجهزة الصيانة", en: "Repair Tools & Equipment", icon: "tools", subs: [
    ["soldering-stations", "محطات اللحام (كاوية)", "Soldering Stations"], ["hot-air-stations", "أجهزة الهواء الساخن (هيت غن)", "Hot-Air Rework Stations"],
    ["multimeters", "أجهزة الملتيميتر", "Digital Multimeters"], ["power-supplies", "باور سبلاي", "DC Power Supplies"], ["microscopes", "مايكروسكوبات", "Repair Microscopes"],
    ["screwdriver-sets", "طقم مفكات دقيقة", "Precision Screwdriver Sets"], ["tweezers", "ملاقط", "Tweezers"], ["opening-tools", "أدوات الفتح", "Phone Opening Tools"],
    ["screen-separators", "أجهزة فصل الشاشة", "Screen Separators"], ["heating-plates", "سخانات (بليت)", "Heating Plates"], ["board-holders", "حوامل البورد", "Board Holders"],
    ["stencils-fixtures", "ستنسلات وتثبيتات", "Stencils & Repair Fixtures"], ["testing-equipment", "أجهزة فحص البطارية والشاشة", "Battery & Screen Testers"],
  ] },
  { slug: "consumables", ar: "مستهلكات الصيانة", en: "Repair Consumables", icon: "consumables", subs: [
    ["b7000", "لاصق B7000", "B7000 Adhesive"], ["t7000", "لاصق T7000", "T7000 Adhesive"], ["uv-adhesive", "لاصق UV", "UV Adhesive"],
    ["screen-adhesive-consumable", "لاصق الشاشة", "Screen Adhesive"], ["battery-pull-tabs", "لاصق سحب البطارية", "Battery Pull Adhesive"],
    ["isopropyl-alcohol", "كحول أيزوبروبيل", "Isopropyl Alcohol"], ["board-cleaners", "منظفات البورد", "Board Cleaners"], ["cleaning-brushes", "فرش التنظيف", "Cleaning Brushes"],
    ["kapton-tape", "شريط كابتون", "Kapton Tape"], ["solder-wire", "قصدير لحام", "Solder Wire"], ["flux", "فلكس", "Flux"], ["solder-paste", "معجون قصدير", "Solder Paste"],
    ["desoldering-wick", "شريط سحب القصدير", "Desoldering Wick"], ["cleaning-wipes", "مناديل تنظيف", "Cleaning Wipes"],
  ] },
  { slug: "accessories", ar: "الإكسسوارات", en: "Accessories", icon: "accessories", subs: [
    ["phone-cases", "كفرات", "Phone Cases"], ["screen-protectors", "واقيات الشاشة", "Screen Protectors"], ["lens-protectors", "واقيات الكاميرا", "Camera Lens Protectors"],
    ["wall-chargers", "شواحن جدارية", "Wall Chargers"], ["usb-cables", "كيبلات USB", "USB Cables"], ["usb-c-cables", "كيبلات USB-C", "USB-C Cables"],
    ["lightning-cables", "كيبلات Lightning", "Lightning Cables"], ["wired-earphones", "سماعات سلكية", "Wired Earphones"], ["bluetooth-earphones", "سماعات بلوتوث", "Bluetooth Earphones"],
    ["power-banks", "باور بانك", "Power Banks"], ["car-chargers", "شواحن سيارة", "Car Chargers"], ["car-mounts", "حوامل سيارة", "Car Mounts"],
    ["phone-stands", "ستاندات", "Phone Stands"], ["otg-adapters", "محولات OTG", "OTG Adapters"], ["audio-adapters", "محولات صوت", "Audio Adapters"],
    ["wireless-chargers", "شواحن لاسلكية", "Wireless Chargers"], ["memory-cards", "كروت ذاكرة", "Memory Cards"], ["sim-ejectors", "دبابيس إخراج الشريحة", "SIM Ejector Tools"],
  ] },
  { slug: "tablets-devices", ar: "التابلت وأجهزة أخرى", en: "Tablets & Additional Devices", icon: "tablet", subs: [
    ["tablet-screens", "شاشات تابلت", "Tablet Screens"], ["ipad-screens", "شاشات iPad", "iPad Screens"], ["tablet-batteries", "بطاريات تابلت", "Tablet Batteries"],
    ["tablet-charging", "قطع شحن التابلت", "Tablet Charging Components"], ["smartwatch-parts", "قطع الساعات الذكية", "Smartwatch Components"],
    ["speaker-parts", "قطع سماعات البلوتوث", "Bluetooth Speaker Components"], ["router-accessories", "ملحقات الراوتر", "Router Accessories"],
  ] },
  { slug: "special-inventory", ar: "مخزون خاص", en: "Special Inventory", icon: "special", subs: [
    ["verified-used-original", "قطع أصلية مستعملة مفحوصة", "Verified Original Used Parts"], ["tested-donor-parts", "قطع تفكيك مفحوصة", "Tested Donor Parts"],
    ["refurbished", "قطع مجددة", "Refurbished Components"], ["discontinued", "قطع متوقفة عن الإنتاج", "Discontinued Components"],
    ["technician-only", "قطع للفنيين فقط", "Technician-Only Components"],
  ] },
];

// الشركة → السلاسل → الموديلات (أسماء تجارية حقيقية؛ أرقام الموديل يضيفها المالك عند التحقق منها)
const DEVICES: { slug: string; name: string; ar: string; families: { slug: string; name: string; models: string[] }[] }[] = [
  { slug: "apple", name: "Apple", ar: "آبل", families: [
    { slug: "iphone", name: "iPhone", models: [
      "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
      "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
      "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini", "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
      "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X", "iPhone SE (2022)", "iPhone SE (2020)", "iPhone 8 Plus", "iPhone 8",
    ] },
    { slug: "ipad", name: "iPad", models: ["iPad (10th generation)", "iPad (9th generation)", "iPad Air (5th generation)", "iPad mini (6th generation)"] },
  ] },
  { slug: "samsung", name: "Samsung", ar: "سامسونج", families: [
    { slug: "galaxy-s", name: "Galaxy S Series", models: ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S22 Ultra", "Galaxy S22", "Galaxy S21 Ultra", "Galaxy S21", "Galaxy S20 FE"] },
    { slug: "galaxy-a", name: "Galaxy A Series", models: ["Galaxy A55", "Galaxy A54", "Galaxy A53", "Galaxy A35", "Galaxy A34", "Galaxy A25", "Galaxy A24", "Galaxy A15", "Galaxy A14", "Galaxy A05s", "Galaxy A04s", "Galaxy A13", "Galaxy A12", "Galaxy A52", "Galaxy A51", "Galaxy A32"] },
    { slug: "galaxy-note", name: "Galaxy Note Series", models: ["Galaxy Note 20 Ultra", "Galaxy Note 20", "Galaxy Note 10+", "Galaxy Note 10"] },
    { slug: "galaxy-z", name: "Galaxy Z Series", models: ["Galaxy Z Flip5", "Galaxy Z Fold5", "Galaxy Z Flip4", "Galaxy Z Fold4"] },
    { slug: "galaxy-m", name: "Galaxy M Series", models: ["Galaxy M34", "Galaxy M14"] },
  ] },
  { slug: "xiaomi", name: "Xiaomi", ar: "شاومي", families: [
    { slug: "xiaomi", name: "Xiaomi", models: ["Xiaomi 14", "Xiaomi 13T Pro", "Xiaomi 13T", "Xiaomi 12T", "Xiaomi 11T"] },
  ] },
  { slug: "redmi", name: "Redmi", ar: "ريدمي", families: [
    { slug: "redmi-note", name: "Redmi Note", models: ["Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13", "Redmi Note 12 Pro", "Redmi Note 12", "Redmi Note 11 Pro", "Redmi Note 11", "Redmi Note 10 Pro", "Redmi Note 10", "Redmi Note 9"] },
    { slug: "redmi", name: "Redmi", models: ["Redmi 13C", "Redmi 12C", "Redmi 12", "Redmi 10C", "Redmi 10", "Redmi 9A", "Redmi 9C"] },
  ] },
  { slug: "poco", name: "POCO", ar: "بوكو", families: [{ slug: "poco", name: "POCO", models: ["POCO X6 Pro", "POCO X6", "POCO X5 Pro", "POCO X3 Pro", "POCO F5", "POCO M6 Pro", "POCO C65"] }] },
  { slug: "oppo", name: "OPPO", ar: "أوبو", families: [{ slug: "oppo-a", name: "OPPO A Series", models: ["OPPO A78", "OPPO A58", "OPPO A38", "OPPO A18", "OPPO A17", "OPPO A57"] }, { slug: "oppo-reno", name: "OPPO Reno", models: ["OPPO Reno11", "OPPO Reno10", "OPPO Reno8"] }] },
  { slug: "vivo", name: "vivo", ar: "فيفو", families: [{ slug: "vivo-y", name: "vivo Y Series", models: ["vivo Y36", "vivo Y27", "vivo Y17s", "vivo Y16", "vivo Y22"] }, { slug: "vivo-v", name: "vivo V Series", models: ["vivo V29", "vivo V27"] }] },
  { slug: "realme", name: "realme", ar: "ريلمي", families: [{ slug: "realme", name: "realme", models: ["realme 12 Pro", "realme 11", "realme C67", "realme C55", "realme C53", "realme C35"] }] },
  { slug: "tecno", name: "TECNO", ar: "تكنو", families: [{ slug: "tecno-spark", name: "TECNO Spark", models: ["TECNO Spark 20 Pro", "TECNO Spark 20", "TECNO Spark 10 Pro", "TECNO Spark 10"] }, { slug: "tecno-camon", name: "TECNO Camon", models: ["TECNO Camon 20 Pro", "TECNO Camon 20"] }, { slug: "tecno-pova", name: "TECNO Pova", models: ["TECNO Pova 5", "TECNO Pova 6 Pro"] }] },
  { slug: "infinix", name: "Infinix", ar: "إنفينكس", families: [{ slug: "infinix-hot", name: "Infinix Hot", models: ["Infinix Hot 40 Pro", "Infinix Hot 40", "Infinix Hot 30", "Infinix Hot 30i"] }, { slug: "infinix-note", name: "Infinix Note", models: ["Infinix Note 40 Pro", "Infinix Note 30"] }, { slug: "infinix-smart", name: "Infinix Smart", models: ["Infinix Smart 8", "Infinix Smart 7"] }] },
  { slug: "honor", name: "HONOR", ar: "هونر", families: [{ slug: "honor-x", name: "HONOR X Series", models: ["HONOR X9b", "HONOR X8b", "HONOR X7b", "HONOR X6a"] }, { slug: "honor-magic", name: "HONOR Magic", models: ["HONOR Magic6 Pro", "HONOR Magic5 Lite"] }] },
  { slug: "huawei", name: "Huawei", ar: "هواوي", families: [{ slug: "huawei-nova", name: "Huawei nova", models: ["Huawei nova 11i", "Huawei nova 10", "Huawei nova 9", "Huawei nova Y70"] }, { slug: "huawei-p", name: "Huawei P Series", models: ["Huawei P30 Pro", "Huawei P30", "Huawei P30 lite"] }, { slug: "huawei-y", name: "Huawei Y Series", models: ["Huawei Y9 Prime 2019", "Huawei Y7 Prime 2019"] }] },
  { slug: "nokia", name: "Nokia", ar: "نوكيا", families: [{ slug: "nokia", name: "Nokia", models: ["Nokia G21", "Nokia C21", "Nokia 105"] }] },
  { slug: "motorola", name: "Motorola", ar: "موتورولا", families: [{ slug: "moto-g", name: "moto g", models: ["moto g84", "moto g54", "moto g32"] }, { slug: "moto-edge", name: "motorola edge", models: ["motorola edge 40"] }] },
  { slug: "google", name: "Google Pixel", ar: "جوجل بكسل", families: [{ slug: "pixel", name: "Pixel", models: ["Pixel 8 Pro", "Pixel 8", "Pixel 7 Pro", "Pixel 7", "Pixel 7a", "Pixel 6 Pro", "Pixel 6"] }] },
  { slug: "oneplus", name: "OnePlus", ar: "ون بلس", families: [{ slug: "oneplus", name: "OnePlus", models: ["OnePlus 12", "OnePlus 11", "OnePlus Nord CE 3 Lite", "OnePlus Nord CE 3"] }] },
];

const COMPONENTS: [string, string, string][] = [
  ["screen", "شاشة", "Screen"], ["battery", "بطارية", "Battery"], ["charging-port", "منفذ شحن", "Charging Port"],
  ["charging-flex", "فليكس شحن", "Charging Flex"], ["front-camera", "كاميرا أمامية", "Front Camera"], ["rear-camera", "كاميرا خلفية", "Rear Camera"],
  ["camera-lens", "عدسة كاميرا", "Camera Lens"], ["earpiece", "سماعة مكالمة", "Earpiece"], ["loudspeaker", "سماعة خارجية", "Loudspeaker"],
  ["microphone", "مايكروفون", "Microphone"], ["back-glass", "ظهر/زجاج خلفي", "Back Glass"], ["frame", "إطار/هيكل", "Frame / Housing"],
  ["power-flex", "فليكس باور", "Power Flex"], ["volume-flex", "فليكس صوت", "Volume Flex"], ["sim-tray", "درج شريحة", "SIM Tray"],
  ["vibrator", "هزاز", "Vibration Motor"], ["fingerprint", "بصمة", "Fingerprint Sensor"], ["face-id", "فيس آيدي / حساسات أمامية", "Face ID / Front Sensors"],
  ["antenna", "أنتينا", "Antenna"], ["ic", "آيسي", "IC"], ["mainboard-flex", "فليكس بورد رئيسي", "Main Board Flex"],
];

const CONDITIONS: [string, string, string][] = [
  ["new", "جديد", "قطعة جديدة غير مستعملة"],
  ["used-original-verified", "أصلي مستعمل مفحوص", "قطعة أصلية مستعملة تم فحصها والتحقق منها من قبل المتجر"],
  ["refurbished", "مُجدد", "قطعة أُعيد تجديدها"],
  ["donor", "قطعة تفكيك", "قطعة من جهاز تفكيك، تُباع للفنيين"],
];

function modelSlug(name: string) {
  return name.toLowerCase().replace(/\+/g, "-plus").replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function seedBase() {
  for (const [i, c] of CATEGORIES.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, nameAr: c.ar, nameEn: c.en, icon: c.icon, sortOrder: i * 10, isFeatured: true },
      update: {},
    });
    for (const [j, [slug, ar, en]] of c.subs.entries()) {
      await prisma.category.upsert({ where: { slug }, create: { slug, nameAr: ar, nameEn: en, parentId: parent.id, sortOrder: j * 10 }, update: {} });
    }
  }
  for (const [i, m] of DEVICES.entries()) {
    const man = await prisma.manufacturer.upsert({ where: { slug: m.slug }, create: { slug: m.slug, name: m.name, nameAr: m.ar, sortOrder: i * 10 }, update: {} });
    for (const [j, f] of m.families.entries()) {
      const fam = await prisma.deviceFamily.upsert({
        where: { manufacturerId_slug: { manufacturerId: man.id, slug: f.slug } },
        create: { manufacturerId: man.id, slug: f.slug, name: f.name, sortOrder: j * 10 },
        update: {},
      });
      for (const [k, name] of f.models.entries()) {
        await prisma.deviceModel.upsert({ where: { slug: modelSlug(name) }, create: { familyId: fam.id, slug: modelSlug(name), name, sortOrder: k * 10 }, update: {} });
      }
    }
  }
  for (const [i, [slug, ar, en]] of COMPONENTS.entries()) {
    await prisma.componentType.upsert({ where: { slug }, create: { slug, nameAr: ar, nameEn: en, sortOrder: i * 10 }, update: {} });
  }
  for (const [i, [slug, ar, desc]] of CONDITIONS.entries()) {
    await prisma.productCondition.upsert({ where: { slug }, create: { slug, nameAr: ar, description: desc, sortOrder: i * 10 }, update: {} });
  }
  // طريقة توصيل افتراضية "معطلة" — يفعّلها المالك بعد إدخال الأجور الحقيقية
  if ((await prisma.deliveryMethod.count()) === 0) {
    await prisma.deliveryMethod.create({
      data: { nameAr: "توصيل إلى جميع المحافظات", description: "عدّل الأجور حسب المحافظة ثم فعّل الطريقة", kind: "DELIVERY", baseFee: 0, isActive: false, sortOrder: 0 },
    });
    await prisma.deliveryMethod.create({ data: { nameAr: "استلام من المحل", kind: "PICKUP", baseFee: 0, isActive: false, sortOrder: 10 } });
  }
  console.log("✓ البيانات الأساسية");
}

type Demo = {
  sku: string; ar: string; en: string; cat: string; comp?: string; cond: string; price: number; compareAt?: number; stock: number;
  models?: [string, "VERIFIED" | "UNVERIFIED" | "UNKNOWN"][]; grade?: string; featured?: boolean; tech?: boolean; wholesale?: [number, number];
  specs?: [string, string][]; note?: string; install?: string;
};

const DEMO: Demo[] = [
  { sku: "DEMO-SCR-IP13P", ar: "شاشة iPhone 13 Pro كاملة OLED", en: "iPhone 13 Pro OLED Display Assembly", cat: "oled-screens", comp: "screen", cond: "new", price: 185000, compareAt: 200000, stock: 6, featured: true, grade: "درجة عالية (عينة)",
    models: [["iphone-13-pro", "VERIFIED"]], specs: [["نوع اللوحة", "OLED"], ["الحجم", "6.1 إنش"], ["تشمل", "اللوحة + التاتش"]],
    note: "شاشة iPhone 13 Pro لا تركب على iPhone 13 العادي رغم تشابه الحجم.", install: "انقل حساس الإضاءة/الفليكس من الشاشة القديمة إن وُجد. افصل البطارية قبل التركيب." },
  { sku: "DEMO-SCR-IP11", ar: "شاشة iPhone 11 LCD", en: "iPhone 11 LCD Screen", cat: "lcd-screens", comp: "screen", cond: "new", price: 55000, stock: 12, featured: true,
    models: [["iphone-11", "VERIFIED"]], specs: [["نوع اللوحة", "LCD"], ["الحجم", "6.1 إنش"]] },
  { sku: "DEMO-SCR-A54", ar: "شاشة Samsung Galaxy A54 مع الإطار", en: "Galaxy A54 Display with Frame", cat: "display-assemblies", comp: "screen", cond: "new", price: 95000, stock: 4, featured: true,
    models: [["galaxy-a54", "VERIFIED"]], specs: [["تشمل", "الشاشة + الإطار"]] },
  { sku: "DEMO-SCR-RN12", ar: "شاشة Redmi Note 12", en: "Redmi Note 12 Screen", cat: "amoled-screens", comp: "screen", cond: "new", price: 60000, stock: 0,
    models: [["redmi-note-12", "UNVERIFIED"]], note: "توجد إصدارات 4G و5G بشاشات مختلفة — تأكد من موديل جهازك قبل الطلب." },
  { sku: "DEMO-BAT-IP12", ar: "بطارية iPhone 12 / 12 Pro", en: "iPhone 12 / 12 Pro Battery", cat: "batteries", comp: "battery", cond: "new", price: 30000, stock: 20, featured: true,
    models: [["iphone-12", "VERIFIED"], ["iphone-12-pro", "VERIFIED"]], specs: [["السعة", "حسب المواصفة (عينة)"]], wholesale: [26000, 10] },
  { sku: "DEMO-BAT-A14", ar: "بطارية Samsung Galaxy A14", en: "Galaxy A14 Battery", cat: "batteries", comp: "battery", cond: "new", price: 18000, stock: 15,
    models: [["galaxy-a14", "UNVERIFIED"]] },
  { sku: "DEMO-CHG-A54", ar: "بورد شحن Galaxy A54", en: "Galaxy A54 Charging Board", cat: "charging-boards", comp: "charging-port", cond: "new", price: 15000, stock: 9,
    models: [["galaxy-a54", "VERIFIED"]] },
  { sku: "DEMO-CHG-IP13", ar: "فليكس شحن iPhone 13 مع المايك", en: "iPhone 13 Charging Port Flex", cat: "charging-flex", comp: "charging-flex", cond: "new", price: 22000, stock: 7,
    models: [["iphone-13", "VERIFIED"], ["iphone-13-pro", "UNKNOWN"]] },
  { sku: "DEMO-CAM-IP14PM", ar: "كاميرا خلفية iPhone 14 Pro Max", en: "iPhone 14 Pro Max Rear Camera", cat: "rear-cameras", comp: "rear-camera", cond: "used-original-verified", price: 140000, stock: 2,
    models: [["iphone-14-pro-max", "VERIFIED"]], grade: "مستعمل — فحص كامل (عينة)" },
  { sku: "DEMO-SPK-IPX", ar: "سماعة مكالمة iPhone X", en: "iPhone X Earpiece Speaker", cat: "earpiece-speakers", comp: "earpiece", cond: "new", price: 8000, stock: 25,
    models: [["iphone-x", "UNVERIFIED"]] },
  { sku: "DEMO-TOOL-SCR", ar: "طقم مفكات دقيقة 25 قطعة", en: "Precision Screwdriver Set 25pcs", cat: "screwdriver-sets", cond: "new", price: 25000, stock: 10, featured: true, tech: true,
    specs: [["عدد القطع", "25"], ["الرؤوس", "Pentalobe, Phillips, Tri-point, Torx"]] },
  { sku: "DEMO-TOOL-HOT", ar: "جهاز هواء ساخن للصيانة", en: "Hot-Air Rework Station", cat: "hot-air-stations", cond: "new", price: 165000, stock: 3, tech: true,
    specs: [["الجهد", "220V"]] },
  { sku: "DEMO-TOOL-DMM", ar: "ملتيميتر رقمي", en: "Digital Multimeter", cat: "multimeters", cond: "new", price: 35000, stock: 8, tech: true },
  { sku: "DEMO-CON-B7000", ar: "لاصق B7000 حجم 50 مل", en: "B7000 Adhesive 50ml", cat: "b7000", cond: "new", price: 3000, stock: 60, wholesale: [2500, 12], featured: true },
  { sku: "DEMO-CON-FLUX", ar: "فلكس لحام", en: "Soldering Flux", cat: "flux", cond: "new", price: 7000, stock: 30, tech: true },
  { sku: "DEMO-ACC-CBL", ar: "كيبل USB-C إلى USB-C طول 1 متر", en: "USB-C to USB-C Cable 1m", cat: "usb-c-cables", cond: "new", price: 6000, compareAt: 8000, stock: 40 },
  { sku: "DEMO-ACC-CHG", ar: "شاحن جداري USB-C", en: "USB-C Wall Charger", cat: "wall-chargers", cond: "new", price: 15000, stock: 18 },
];

async function seedDemo() {
  const cats = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const comps = new Map((await prisma.componentType.findMany()).map((c) => [c.slug, c.id]));
  const conds = new Map((await prisma.productCondition.findMany()).map((c) => [c.slug, c.id]));
  const models = new Map((await prisma.deviceModel.findMany()).map((m) => [m.slug, m.id]));
  for (const d of DEMO) {
    const exists = await prisma.product.findUnique({ where: { sku: d.sku } });
    if (exists) continue;
    const p = await prisma.product.create({
      data: {
        sku: d.sku,
        slug: d.sku.toLowerCase(),
        nameAr: d.ar,
        nameEn: d.en,
        descriptionAr: "هذا منتج تجريبي لعرض إمكانيات المتجر فقط. السعر والمخزون للعرض وليسا بيانات حقيقية.",
        categoryId: cats.get(d.cat)!,
        componentTypeId: d.comp ? comps.get(d.comp) : null,
        conditionId: conds.get(d.cond)!,
        price: d.price,
        compareAtPrice: d.compareAt ?? null,
        wholesalePrice: d.wholesale?.[0] ?? null,
        wholesaleMinQty: d.wholesale?.[1] ?? null,
        stockQty: 0,
        status: "ACTIVE",
        isDemo: true,
        isFeatured: !!d.featured,
        technicianOnly: !!d.tech,
        qualityGrade: d.grade ?? null,
        specs: d.specs ? d.specs.map(([label, value]) => ({ label, value })) : undefined,
        compatibilityNote: d.note ?? null,
        installationNotes: d.install ?? null,
        compat: d.models ? { create: d.models.filter(([s]) => models.has(s)).map(([s, status]) => ({ modelId: models.get(s)!, status })) } : undefined,
      },
    });
    if (d.stock > 0) {
      await prisma.$transaction([
        prisma.product.update({ where: { id: p.id }, data: { stockQty: d.stock } }),
        prisma.inventoryMovement.create({ data: { productId: p.id, type: "STOCK_IN", quantity: d.stock, balanceAfter: d.stock, reason: "رصيد افتتاحي تجريبي" } }),
      ]);
    }
    await reindexProduct(p.id);
  }
  console.log(`✓ ${DEMO.length} منتجات تجريبية (موسومة isDemo)`);
}

async function main() {
  await seedBase();
  if (withDemo) await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
