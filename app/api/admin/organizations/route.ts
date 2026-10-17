import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { currentUser, error, isModerator, json, mutationRequestError, readJson } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const filterSchema = z.enum(["pending", "verified", "suspended"]);
const updateSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(["verified", "suspended"]),
}).strict();

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);
  if (!(await isModerator(user.userId))) return error("Немаш администраторска дозвола.", 403);
  const status = filterSchema.safeParse(new URL(request.url).searchParams.get("status") ?? "pending");
  if (!status.success) return error("Невалиден статус.", 422);
  const db = getDb();
  const rows = await db.select().from(organizations)
    .where(eq(organizations.status, status.data))
    .orderBy(desc(organizations.updatedAt), desc(organizations.createdAt)).limit(100);
  return json({ organizations: rows.map((row) => ({
    id: row.id, kind: row.kind, displayName: row.displayName, legalName: row.legalName,
    status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt,
  })) });
}

export async function PATCH(request: Request) {
  const requestError = mutationRequestError(request, { jsonBody: true });
  if (requestError) return error(requestError, 403);
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);
  if (!(await isModerator(user.userId))) return error("Немаш администраторска дозвола.", 403);
  let body: unknown;
  try { body = await readJson(request); } catch { return error("Невалидни податоци.", 400); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return error("Невалидна одлука за организацијата.", 422);
  const db = getDb();
  const found = await db.select({ id: organizations.id }).from(organizations)
    .where(eq(organizations.id, parsed.data.organizationId)).limit(1);
  if (!found[0]) return error("Организацијата не постои.", 404);
  const updatedAt = new Date().toISOString();
  await db.update(organizations).set({ status: parsed.data.status, updatedAt })
    .where(eq(organizations.id, parsed.data.organizationId));
  return json({ id: parsed.data.organizationId, status: parsed.data.status, updatedAt });
}
