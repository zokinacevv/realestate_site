import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { offers } from "@/db/schema";
import { currentUser, error, json, mutationRequestError, readJson } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const statusInput = z
  .object({ status: z.enum(["accepted", "declined", "withdrawn"]) })
  .strict();

/** Only the recipient can accept or decline; the sender can withdraw. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestError = mutationRequestError(request, { jsonBody: true });
  if (requestError) return error(requestError, 403);

  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return error("Невалидна понуда.", 422);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error("Невалидни податоци.", 400);
  }
  const parsed = statusInput.safeParse(body);
  if (!parsed.success) return error("Невалиден статус на понуда.", 422);

  const db = getDb();
  const existing = await db
    .select({
      id: offers.id,
      senderUserId: offers.senderUserId,
      recipientUserId: offers.recipientUserId,
      status: offers.status,
    })
    .from(offers)
    .where(eq(offers.id, id))
    .limit(1);
  const offer = existing[0];
  if (!offer) return error("Понудата не постои.", 404);
  if (offer.status !== "sent") return error("На оваа понуда веќе е одговорено.", 409);

  const isRecipient = offer.recipientUserId === user.userId;
  const isSender = offer.senderUserId === user.userId;
  const permitted =
    (isRecipient && (parsed.data.status === "accepted" || parsed.data.status === "declined")) ||
    (isSender && parsed.data.status === "withdrawn");
  if (!permitted) return error("Немате дозвола за оваа промена.", 403);

  const timestamp = new Date().toISOString();
  await db
    .update(offers)
    .set({ status: parsed.data.status, updatedAt: timestamp })
    .where(and(eq(offers.id, id), eq(offers.status, "sent")));

  return json({ id, status: parsed.data.status, updatedAt: timestamp });
}
