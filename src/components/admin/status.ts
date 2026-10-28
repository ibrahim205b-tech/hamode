import type { OrderStatus } from "@prisma/client";

export const STATUS_TONE: Record<OrderStatus, "gray" | "blue" | "green" | "amber" | "red" | "cyan"> = {
  NEW: "blue", AWAITING_CONFIRMATION: "amber", CONFIRMED: "cyan", PREPARING: "amber", SHIPPED: "blue", DELIVERED: "green", CANCELLED: "red",
};
