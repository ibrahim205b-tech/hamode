import type { OrderStatus, PaymentStatus, CompatStatus, MovementType, PurchaseStatus, Role } from "@prisma/client";

export const IRAQ_GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", "السليمانية", "دهوك", "كركوك", "الأنبار",
  "بابل", "ديالى", "ذي قار", "صلاح الدين", "القادسية", "ميسان", "واسط", "المثنى", "حلبجة",
] as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "طلب جديد",
  AWAITING_CONFIRMATION: "بانتظار التأكيد",
  CONFIRMED: "مؤكد",
  PREPARING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "NEW", "AWAITING_CONFIRMATION", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED",
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "غير مدفوع",
  PARTIAL: "مدفوع جزئياً",
  PAID: "مدفوع",
  REFUNDED: "مسترجع",
};

export const COMPAT_LABELS: Record<CompatStatus, string> = {
  VERIFIED: "توافق مؤكد",
  UNVERIFIED: "توافق غير مؤكد",
  UNKNOWN: "توافق غير معروف",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  STOCK_IN: "إدخال مخزون",
  STOCK_OUT: "إخراج مخزون",
  ADJUSTMENT: "تسوية جرد",
  SALE: "بيع",
  SALE_RETURN: "إرجاع (إلغاء طلب)",
  PURCHASE_RECEIPT: "استلام مشتريات",
  IMPORT: "استيراد",
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: "مسودة",
  ORDERED: "مطلوب من المورد",
  RECEIVED: "مُستلم",
  CANCELLED: "ملغي",
};

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "المالك",
  ADMIN: "مدير",
  STAFF: "موظف",
  CUSTOMER: "زبون",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: "الدفع عند الاستلام",
};
