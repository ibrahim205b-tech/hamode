import "server-only";
import * as R from "./reports";
import { getSettings } from "./settings";

export async function loadReport(sp: { from?: string; to?: string; preset?: string; bucket?: string }) {
  const range = R.parseRange(sp);
  const bucket: R.Bucket = sp.bucket === "week" || sp.bucket === "month" ? sp.bucket : "day";
  const s = await getSettings();
  const [summary, periods, products, categories, manufacturers, models, valuation, movements, cancelled, suppliers, lowStock] = await Promise.all([
    R.salesSummary(range), R.salesByPeriod(range, bucket), R.salesByProduct(range), R.salesByCategory(range),
    R.salesByDevice(range, "manufacturer"), R.salesByDevice(range, "model"), R.inventoryValuation(), R.movementSummary(range),
    R.cancelledOrders(range), R.supplierPurchases(range), R.lowStockList(s.inventory.defaultLowStock),
  ]);
  return { range, bucket, data: { summary, periods, products, categories, manufacturers, models, valuation, movements, cancelled, suppliers, lowStock } };
}
