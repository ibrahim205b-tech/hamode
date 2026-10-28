/**
 * اختبار شامل من البداية للنهاية على تطبيق يعمل فعلياً (متصفح حقيقي + قاعدة بيانات حقيقية).
 *
 *   BASE_URL=http://localhost:3000 E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e
 *
 * يتطلب: قاعدة بيانات مبذورة بالبيانات التجريبية (npm run db:seed:demo) وحساب مالك.
 * ملاحظة: الاختبار يُنشئ طلبات ومنتجات اختبار — شغّله على قاعدة بيانات تطوير/اختبار وليس الإنتاج.
 */
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const WA = "9647700733822";

const STEP_TIMEOUT = Number(process.env.E2E_STEP_TIMEOUT_MS || 60_000);
const TOTAL_TIMEOUT = Number(process.env.E2E_TOTAL_TIMEOUT_MS || 10 * 60_000);

// حارس عام: يُنهي العملية بالقوة إذا تجاوز الاختبار الوقت الكلي (لا يعتمد على SIGTERM)
setTimeout(() => {
  console.log(`\n✗ تجاوز الوقت الكلي (${TOTAL_TIMEOUT / 1000}s) — إنهاء قسري`);
  process.exit(2);
}, TOTAL_TIMEOUT).unref();

let passed = 0;
const failures = [];
async function step(name, fn) {
  const t0 = Date.now();
  process.stdout.write(`  … ${name}\n`);
  let timer;
  try {
    await Promise.race([
      fn(),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`انتهت مهلة الخطوة (${STEP_TIMEOUT / 1000}s)`)), STEP_TIMEOUT); }),
    ]);
    passed++;
    console.log(`  ✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failures.push(name);
    console.log(`  ✗ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)\n      ${String(e?.message || e).split("\n")[0]}`);
  } finally {
    clearTimeout(timer);
  }
}
// الانتظار حتى تكتمل الصفحة وتصبح تفاعلية قبل الضغط على الأزرار
function settle(p) {
  const goto = p.goto.bind(p);
  p.goto = (url, opts) => goto(url, { waitUntil: "networkidle", ...opts });
  return p;
}
function limits(c) {
  c.setDefaultTimeout(15_000);
  c.setDefaultNavigationTimeout(20_000);
  return c;
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, "0")).join("");

const browser = await chromium.launch().catch(() => chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" }));
const ctx = limits(await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "ar-IQ" }));
const page = settle(await ctx.newPage());
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

const api = (path, body) =>
  page.evaluate(
    async ([p, b]) => {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 20_000);
      try {
        const r = await fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b), signal: ac.signal });
        return { status: r.status, json: await r.json().catch(() => null) };
      } catch (e) {
        return { status: 0, json: { ok: false, error: "fetch failed: " + e } };
      } finally {
        clearTimeout(t);
      }
    },
    [path, body],
  );

console.log(`\nE2E against ${BASE}\n— المتجر —`);

await step("الصفحة الرئيسية تعمل بالعربية RTL", async () => {
  const res = await page.goto(BASE + "/");
  assert(res.status() === 200, `status ${res.status()}`);
  assert((await page.getAttribute("html", "dir")) === "rtl", "dir != rtl");
  assert((await page.getAttribute("html", "lang")) === "ar", "lang != ar");
  assert(await page.locator("text=تسوّق حسب القسم").count(), "no categories section");
});

await step("زر واتساب العائم يستخدم الرقم الرسمي", async () => {
  const href = await page.locator("a.wa-float").getAttribute("href");
  assert(href.startsWith(`https://wa.me/${WA}`), href);
});

await step("الأقسام تعمل", async () => {
  const res = await page.goto(BASE + "/category/screens");
  assert(res.status() === 200, "category status");
  assert(await page.locator("article").count() > 0, "no products in screens");
});

await step("البحث العربي مع المرادفات (شاشة ايفون)", async () => {
  await page.goto(BASE + "/products?q=" + encodeURIComponent("شاشة ايفون"));
  const names = await page.locator("article h3").allTextContents();
  assert(names.some((n) => n.includes("iPhone")), `results: ${names.join(" | ")}`);
});

await step("البحث بـ SKU والاقتراح التلقائي", async () => {
  const r = await page.evaluate(async () => (await fetch("/api/search/suggest?q=DEMO-BAT")).json());
  assert(r.products.length > 0, "no suggestions");
});

await step("فلتر الشركة والموديل (iPhone 13 Pro)", async () => {
  await page.goto(BASE + "/products?model=iphone-13-pro");
  const names = await page.locator("article h3").allTextContents();
  assert(names.some((n) => n.includes("13 Pro")), names.join("|"));
  assert(!names.some((n) => n.includes("Galaxy")), "unrelated product leaked into model filter");
});

await step("صفحة المنتج + التوافق + زر الاستفسار عبر واتساب", async () => {
  await page.goto(BASE + "/product/demo-bat-ip12");
  assert(await page.locator("main h1").textContent().then((t) => t.includes("بطارية")), "h1");
  assert(await page.locator("text=الأجهزة المتوافقة").count(), "compat section");
  const href = await page.locator("a:has-text('استفسر عن هذا المنتج')").getAttribute("href");
  assert(href.startsWith(`https://wa.me/${WA}?text=`), href);
  const text = decodeURIComponent(href.split("text=")[1]);
  assert(text.includes("DEMO-BAT-IP12") && text.includes("/product/demo-bat-ip12"), text);
  const ld = await page.locator('script[type="application/ld+json"]').count();
  assert(ld === 0, "demo products must not emit structured data");
});

await step("إضافة للسلة وحساب المجموع على الخادم", async () => {
  await page.evaluate(() => localStorage.removeItem("he_cart_v1"));
  await page.goto(BASE + "/product/demo-bat-ip12");
  await page.fill('input[aria-label="الكمية"]', "2");
  await page.click("button:has-text('أضف للسلة')");
  await page.goto(BASE + "/product/demo-acc-cbl");
  await page.click("button:has-text('أضف للسلة')");
  await page.goto(BASE + "/cart");
  await page.waitForSelector("text=ملخص السلة");
  await page.waitForFunction(() => document.body.innerText.includes("66,000"), null, { timeout: 8000 });
});

await step("مشاركة السلة عبر واتساب برسالة عربية مُرمّزة", async () => {
  const href = await page.locator("a:has-text('مشاركة السلة')").getAttribute("href");
  assert(href.startsWith(`https://wa.me/${WA}?text=`), href);
  const text = decodeURIComponent(href.split("text=")[1]);
  assert(text.includes("2 × 30,000 د.ع = 60,000 د.ع") && text.includes("الإجمالي التقديري"), text);
});

let orderUrl, orderNumber;
await step("إتمام الطلب ينشئ طلباً برقم فريد", async () => {
  await page.goto(BASE + "/checkout");
  await page.fill("#c-name", "زبون اختبار");
  await page.fill("#c-phone", "07701234567");
  await page.selectOption("#c-gov", "بغداد");
  await page.fill("#c-area", "الكرادة");
  await page.fill("#c-addr", "شارع الاختبار قرب الساحة");
  await page.waitForFunction(() => !document.querySelector("button[type=submit]")?.disabled, null, { timeout: 10000 });
  await page.click("button:has-text('تأكيد الطلب')");
  await page.waitForURL(/\/order\/[A-Za-z0-9_-]+\?new=1/, { timeout: 15000 });
  orderUrl = page.url();
  orderNumber = (await page.locator("strong.font-mono").first().textContent()).trim();
  assert(/^HE\d{6}-[A-Z0-9]{5}$/.test(orderNumber), orderNumber);
  assert(await page.locator("text=تم تسجيل طلبك في المتجر بنجاح").count(), "confirmation text");
});

await step("صفحة التأكيد: مشاركة الطلب عبر واتساب + توضيح أن الإرسال خطوة منفصلة", async () => {
  const href = await page.locator("a:has-text('فتح واتساب برسالة الطلب')").getAttribute("href");
  const text = decodeURIComponent(href.split("text=")[1]);
  assert(href.startsWith(`https://wa.me/${WA}?text=`), href);
  assert(text.includes(orderNumber) && text.includes("الإجمالي: 66,000 د.ع"), text);
  assert(await page.locator("text=لن تصل الرسالة إلا بعد أن تضغط").count(), "explanation missing");
  const cart = await page.evaluate(() => localStorage.getItem("he_cart_v1"));
  assert(cart === "[]", "cart not cleared: " + cart);
});

await step("تتبع الطلب يتطلب رقم الطلب + الهاتف الصحيح", async () => {
  await page.goto(BASE + "/track");
  await page.fill("#t-num", orderNumber);
  await page.fill("#t-phone", "07709999999");
  await page.click("button:has-text('تتبع')");
  await page.waitForSelector("text=لم يتم العثور");
  await page.fill("#t-phone", "07701234567");
  await page.click("button:has-text('تتبع')");
  await page.waitForSelector(`text=${orderNumber}`);
});

await step("رابط الطلب غير قابل للتخمين (رمز خاطئ = 404)", async () => {
  const r = await page.goto(BASE + "/order/" + "A".repeat(43));
  assert(r.status() === 404, `status ${r.status()}`);
});

// الحصول على معرفات المنتجات من خلال نموذج إضافة السلة (localStorage) بعد الضغط
async function productId(slug) {
  await page.evaluate(() => localStorage.setItem("he_cart_v1", "[]"));
  await page.goto(BASE + "/product/" + slug);
  await page.click("button:has-text('أضف للسلة')");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("he_cart_v1") || "[]").length === 1);
  const items = await page.evaluate(() => JSON.parse(localStorage.getItem("he_cart_v1")));
  await page.evaluate(() => localStorage.setItem("he_cart_v1", "[]"));
  return { id: items[0].productId, price: items[0].seenPrice };
}

const orderBody = (items, key = rid()) => ({
  idempotencyKey: key, customerName: "اختبار API", phone: "07705555555", governorate: "البصرة", area: "العشار",
  address: "عنوان اختبار طويل", paymentMethod: "COD", items,
});

let b7000;
await step("منع الطلبات المكررة: إرسال متزامن بنفس المفتاح", async () => {
  b7000 = await productId("demo-con-b7000");
  const key = rid();
  const [a, b] = await Promise.all([
    api("/api/orders", orderBody([{ productId: b7000.id, quantity: 1, seenPrice: b7000.price }], key)),
    api("/api/orders", orderBody([{ productId: b7000.id, quantity: 1, seenPrice: b7000.price }], key)),
  ]);
  assert(a.json?.ok && b.json?.ok, JSON.stringify([a.json, b.json]));
  assert(a.json.number === b.json.number, `two different orders: ${a.json.number} ${b.json.number}`);
  const c = await api("/api/orders", orderBody([{ productId: b7000.id, quantity: 1, seenPrice: b7000.price }], key));
  assert(c.json.duplicate === true && c.json.number === a.json.number, "third retry not deduplicated");
});

await step("التحقق من المخزون على الخادم (كمية أكبر من المتوفر مرفوضة)", async () => {
  const r = await api("/api/orders", orderBody([{ productId: b7000.id, quantity: 99999, seenPrice: b7000.price }]));
  assert(!r.json.ok && r.json.issues?.some((i) => i.kind === "insufficient"), JSON.stringify(r.json));
});

await step("لا ثقة بسعر المتصفح (سعر معدّل مرفوض)", async () => {
  const r = await api("/api/orders", orderBody([{ productId: b7000.id, quantity: 1, seenPrice: 1 }]));
  assert(!r.json.ok && r.json.issues?.some((i) => i.kind === "price_changed"), JSON.stringify(r.json));
  const q = await api("/api/cart/quote", { items: [{ productId: b7000.id, quantity: 3 }] });
  assert(q.json.subtotal === b7000.price * 3, "server subtotal mismatch");
  assert(!("unitCost" in q.json.lines[0]), "cost leaked to browser");
});

await step("منتج نافد لا يمكن طلبه", async () => {
  await page.goto(BASE + "/product/demo-scr-rn12");
  assert(await page.locator("button:has-text('أضف للسلة')").isDisabled(), "add button enabled for out-of-stock");
});

await step("التنقل على الجوال", async () => {
  const m = settle(await ctx.newPage());
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(BASE + "/");
  await m.click('button[aria-label="القائمة"]');
  await m.waitForSelector('[role="dialog"] >> text=الشاشات');
  await m.click('[role="dialog"] >> text=الشاشات');
  await m.waitForURL(/\/category\/screens/);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!overflow, "horizontal overflow on mobile");
  await m.close();
});

console.log("— لوحة التحكم —");
await step("لوحة التحكم محمية (بدون دخول = تحويل لصفحة الدخول)", async () => {
  const anon = limits(await browser.newContext());
  const p = settle(await anon.newPage());
  await p.goto(BASE + "/admin/orders");
  assert(p.url().includes("/admin/login"), p.url());
  const r = await p.request.get(BASE + "/admin/export/products", { maxRedirects: 0 });
  assert([302, 303, 307, 403].includes(r.status()), `export status ${r.status()}`);
  await anon.close();
});

await step("حساب زبون لا يستطيع دخول لوحة التحكم", async () => {
  const c = limits(await browser.newContext());
  const p = settle(await c.newPage());
  await p.goto(BASE + "/account/register");
  const phone = "0771" + String(Date.now()).slice(-7);
  await p.fill("#r-name", "زبون مسجل");
  await p.fill("#r-phone", phone);
  await p.fill("#r-pw", "CustomerPass123");
  await p.fill("#r-pw2", "CustomerPass123");
  await p.click("button:has-text('إنشاء الحساب')");
  await p.waitForURL(/\/account$/);
  await p.goto(BASE + "/admin");
  assert(p.url().includes("/admin/login"), "customer reached admin: " + p.url());
  const r = await p.request.get(BASE + "/admin/export/orders", { maxRedirects: 0 });
  assert(r.status() === 403, `customer export status ${r.status()}`);
  await c.close();
});

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("  (تخطي اختبارات الإدارة: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD غير مضبوطة)");
} else {
  const admin = settle(await limits(await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage());
  admin.on("dialog", (d) => d.accept());
  const ok = async () => admin.waitForSelector('[role="status"]', { timeout: 15000 });

  await step("تسجيل دخول المدير (كلمة مرور خاطئة مرفوضة)", async () => {
    await admin.goto(BASE + "/admin/login");
    await admin.fill("#email", ADMIN_EMAIL);
    await admin.fill("#pw", "wrong-password-123");
    await admin.click("button:has-text('دخول')");
    await admin.waitForSelector("text=غير صحيحة");
    await admin.fill("#pw", ADMIN_PASSWORD);
    await admin.click("button:has-text('دخول')");
    await admin.waitForURL(BASE + "/admin");
    await admin.waitForSelector("text=كل الطلبات");
  });

  let newProductUrl;
  const sku = "E2E-" + Date.now().toString(36).toUpperCase();
  await step("إنشاء منتج جديد", async () => {
    await admin.goto(BASE + "/admin/products/new");
    await admin.fill("#f-nameAr", "منتج اختبار تلقائي");
    await admin.fill("#f-sku", sku);
    await admin.selectOption("#f-categoryId", { label: "بطاريات بديلة" });
    await admin.fill("#f-price", "12500");
    await admin.fill("#f-costPrice", "9000");
    await admin.fill("#f-initialStock", "5");
    await admin.click("button:has-text('حفظ المنتج')");
    await admin.waitForURL(/\/admin\/products\/[a-z0-9]+\?created=1/, { timeout: 15000 });
    newProductUrl = admin.url().split("?")[0];
  });

  await step("تعديل المنتج (السعر) وظهوره في المتجر", async () => {
    await admin.fill("#f-price", "13000");
    await admin.click("button:has-text('حفظ التعديلات')");
    await ok();
    const p = settle(await ctx.newPage());
    await p.goto(BASE + "/products?q=" + sku);
    await p.waitForSelector("text=13,000");
    await p.close();
  });

  await step("ربط توافق مع موديل", async () => {
    await admin.selectOption("#modelIds", { label: "iPhone 12" });
    await admin.click("button:has-text('إضافة التوافق')");
    await admin.waitForSelector("li:has-text('iPhone 12')");
  });

  await step("تعديل المخزون (إخراج أكثر من الرصيد مرفوض، الجرد يعمل)", async () => {
    await admin.selectOption("select[name=mode]", "out");
    await admin.fill('input[name="quantity"]', "50");
    await admin.fill('input[name="reason"]', "اختبار سالب");
    await admin.click("button:has-text('تنفيذ')");
    await admin.waitForSelector("text=لا يوجد مخزون كافٍ");
    await admin.selectOption("select[name=mode]", "count");
    await admin.fill('input[name="quantity"]', "8");
    await admin.fill('input[name="reason"]', "جرد اختبار");
    await admin.click("button:has-text('تنفيذ')");
    await admin.waitForSelector("text=الرصيد الجديد");
    assert(await admin.locator("text=جرد اختبار").count(), "movement not listed");
  });

  let orderId;
  await step("إدارة الطلب: البحث بالرقم وتغيير الحالة حتى التسليم", async () => {
    await admin.goto(BASE + "/admin/orders?q=" + orderNumber);
    await admin.click(`a:has-text('${orderNumber}')`);
    await admin.waitForURL(/\/admin\/orders\/[a-z0-9]+$/);
    orderId = admin.url().split("/").pop();
    // في الحالة النهائية يختفي نموذج تغيير الحالة، لذلك نتحقق من سجل الحالات بدلاً من رسالة النجاح
    for (const [st, label] of [["CONFIRMED", "مؤكد"], ["PREPARING", "قيد التجهيز"], ["DELIVERED", "تم التسليم"]]) {
      await admin.selectOption("#st", st);
      await admin.click("button:has-text('تحديث الحالة')");
      await admin.waitForFunction((l) => [...document.querySelectorAll("main ol li strong")].some((e) => e.textContent === l), label);
    }
    assert(await admin.locator("text=الطلب في حالة نهائية").count(), "not final");
  });

  await step("تسجيل دفعة نقدية", async () => {
    await admin.fill('input[name="amount"]', "66000");
    await admin.click("button:has-text('تسجيل دفعة')");
    await admin.waitForSelector("text=تم تسجيل الدفعة");
  });

  await step("طباعة الفاتورة A4 و 80مم", async () => {
    await admin.goto(BASE + `/admin/print/invoice/${orderId}`);
    await admin.waitForSelector(`text=${orderNumber}`);
    assert(await admin.locator("text=الإجمالي").count(), "invoice total");
    await admin.goto(BASE + `/admin/print/invoice/${orderId}?paper=80`);
    assert(await admin.locator(".receipt-80").count(), "receipt layout");
    await admin.emulateMedia({ media: "print" });
    assert(!(await admin.locator(".no-print").first().isVisible()), "print toolbar visible in print");
    await admin.emulateMedia({ media: "screen" });
  });

  let cancelledNumber;
  await step("إلغاء طلب يعيد المخزون ويُستبعد من المبيعات", async () => {
    const before = await api("/api/cart/quote", { items: [{ productId: b7000.id, quantity: 1 }] });
    const stockBefore = before.json.lines[0].stockQty;
    const r = await api("/api/orders", orderBody([{ productId: b7000.id, quantity: 4, seenPrice: b7000.price }]));
    assert(r.json.ok, JSON.stringify(r.json));
    cancelledNumber = r.json.number;
    const mid = await api("/api/cart/quote", { items: [{ productId: b7000.id, quantity: 1 }] });
    assert(mid.json.lines[0].stockQty === stockBefore - 4, "stock not reserved");
    await admin.goto(BASE + "/admin/orders?q=" + r.json.number);
    await admin.click(`a:has-text('${r.json.number}')`);
    await admin.selectOption("#st", "CANCELLED");
    await admin.click("button:has-text('تحديث الحالة')");
    await admin.waitForSelector("text=سبب الإلغاء مطلوب");
    await admin.fill('textarea[name="note"]', "الزبون ألغى الطلب");
    await admin.click("button:has-text('تحديث الحالة')");
    await admin.waitForFunction(() => [...document.querySelectorAll("main ol li strong")].some((e) => e.textContent === "ملغي"));
    const after = await api("/api/cart/quote", { items: [{ productId: b7000.id, quantity: 1 }] });
    assert(after.json.lines[0].stockQty === stockBefore, "stock not returned after cancel");
  });

  await step("التقارير تعتمد بيانات قاعدة البيانات (المبيعات المُسلّمة فقط)", async () => {
    // الطلب المُسلّم يظهر في مبيعات المنتج، والملغي يظهر في تقرير الملغاة فقط
    await admin.goto(BASE + "/admin/reports?preset=today&tab=summary");
    const txt = await admin.locator("main").innerText();
    assert(/عدد الطلبات المُسلّمة\s*\n?\s*[1-9]/.test(txt), "no delivered orders in summary");
    await admin.goto(BASE + "/admin/reports?preset=today&tab=cancelled");
    assert(await admin.locator(`text=${cancelledNumber}`).count(), "cancelled order missing from cancelled report");
    const del = await admin.request.get(BASE + "/admin/export/orders?status=DELIVERED");
    const delCsv = await del.text();
    assert(delCsv.includes(orderNumber) && !delCsv.includes(cancelledNumber), "delivered/cancelled separation wrong");
    await admin.goto(BASE + "/admin/reports?preset=today&tab=products");
    assert(await admin.locator("text=DEMO-BAT-IP12").count(), "product sales missing");
  });

  await step("تصدير CSV للمنتجات والطلبات", async () => {
    const r = await admin.request.get(BASE + "/admin/export/products");
    assert(r.status() === 200 && (r.headers()["content-type"] || "").includes("text/csv"), "products csv");
    const body = await r.text();
    assert(body.charCodeAt(0) === 0xfeff && body.includes(sku), "csv content");
    const o = await admin.request.get(BASE + "/admin/export/orders");
    assert((await o.text()).includes(orderNumber), "orders csv");
  });

  await step("استيراد CSV (فحص بدون حفظ + اكتشاف الأخطاء)", async () => {
    await admin.goto(BASE + "/admin/products/import");
    const good = `﻿sku,nameAr,category,price,stockQty\n${sku},منتج اختبار تلقائي,batteries,13000,8\n`;
    await admin.setInputFiles('input[name="file"]', { name: "p.csv", mimeType: "text/csv", buffer: Buffer.from(good) });
    await admin.click("button:has-text('رفع ومعالجة')");
    await admin.waitForSelector("text=الفحص ناجح");
    const bad = `sku,nameAr,category,price\nBAD SKU!,x,nope,abc\n`;
    await admin.setInputFiles('input[name="file"]', { name: "b.csv", mimeType: "text/csv", buffer: Buffer.from(bad) });
    await admin.click("button:has-text('رفع ومعالجة')");
    await admin.waitForSelector("text=لم يتم تطبيق أي تغيير");
  });

  await step("الإعدادات: رقم واتساب مركزي يُتحقق منه", async () => {
    await admin.goto(BASE + "/admin/settings");
    const v = await admin.inputValue("#f-whatsappNumber");
    assert(v === "07700733822", "whatsapp setting " + v);
    await admin.fill("#f-whatsappNumber", "12345");
    await admin.click("button:has-text('حفظ كل الإعدادات')");
    await admin.waitForSelector("text=رقم واتساب غير صالح");
  });

  await step("أرشفة منتج الاختبار", async () => {
    await admin.goto(newProductUrl);
    await admin.selectOption("#f-status", "ARCHIVED");
    await admin.click("button:has-text('حفظ التعديلات')");
    await ok();
  });
}

if (pageErrors.length) {
  console.log("\nأخطاء JavaScript في الصفحات:\n  " + [...new Set(pageErrors)].join("\n  "));
}
console.log(`\n${passed} نجح، ${failures.length} فشل`);
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
process.exit(failures.length || pageErrors.length ? 1 : 0);
