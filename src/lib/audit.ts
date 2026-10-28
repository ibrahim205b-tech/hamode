import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { clientIp } from "./request";

export async function audit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Prisma.InputJsonValue,
) {
  let ip: string | null = null;
  try {
    ip = await clientIp();
  } catch {}
  await prisma.auditLog.create({ data: { userId, action, entityType, entityId: entityId ?? null, details, ip } });
}
