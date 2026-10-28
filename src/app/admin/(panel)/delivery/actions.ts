"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { IRAQ_GOVERNORATES } from "@/lib/constants";
import { run, fBool, fInt, fOpt, fStr, type ActionResult } from "@/lib/admin-action";

export async function saveDeliveryMethod(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run("settings", async (user) => {
    const id = fOpt(fd, "id");
    const nameAr = fStr(fd, "nameAr");
    if (!nameAr) throw new Error("الاسم مطلوب");
    const data = {
      nameAr, description: fOpt(fd, "description"), kind: fStr(fd, "kind") === "PICKUP" ? ("PICKUP" as const) : ("DELIVERY" as const),
      baseFee: fInt(fd, "baseFee") ?? 0, freeOver: fInt(fd, "freeOver"), isActive: fBool(fd, "isActive"), sortOrder: fInt(fd, "sortOrder", { min: -1000 }) ?? 0,
    };
    const rates = IRAQ_GOVERNORATES.map((g, i) => ({ governorate: g, fee: fInt(fd, `rate_${i}`) })).filter((r): r is { governorate: (typeof IRAQ_GOVERNORATES)[number]; fee: number } => r.fee != null);
    await prisma.$transaction(async (tx) => {
      const m = id ? await tx.deliveryMethod.update({ where: { id }, data }) : await tx.deliveryMethod.create({ data });
      await tx.governorateRate.deleteMany({ where: { methodId: m.id } });
      if (rates.length) await tx.governorateRate.createMany({ data: rates.map((r) => ({ ...r, methodId: m.id })) });
      await audit(user.id, id ? "delivery.update" : "delivery.create", "DeliveryMethod", m.id, { ...data, rates } as never);
    });
    revalidatePath("/admin/delivery");
  });
}
