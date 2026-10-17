import { and, count, desc, eq, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { listings, offers } from "@/db/schema";
import {
  currentUser,
  error,
  json,
  mutationRequestError,
  readJson,
} from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const offerInput = z
  .object({
    listingId: z.string().uuid(),
    kind: z.enum(["inquiry", "offer"]),
    amountCents: z.number().int().positive().nullable().optional(),
    message: z.string().trim().min(2).max(2_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === "offer" && !value.amountCents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountCents"],
        message: "За понуда е потребен износ.",
      });
    }
  });

export async function GET() {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const db = getDb();
  const rows = await db
    .select({ offer: offers, listingTitle: listings.title })
    .from(offers)
    .innerJoin(listings, eq(offers.listingId, listings.id))
    .where(or(eq(offers.senderUserId, user.userId), eq(offers.recipientUserId, user.userId)))
    .orderBy(desc(offers.createdAt))
    .limit(100);

  return json({
    offers: rows.map(({ offer, listingTitle }) => ({
      id: offer.id,
      listingId: offer.listingId,
      listingTitle,
      direction: offer.senderUserId === user.userId ? "outgoing" : "incoming",
      kind: offer.kind,
      amountCents: offer.amountCents,
      currency: offer.currency,
      message: offer.message,
      status: offer.status,
      createdAt: offer.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const requestError = mutationRequestError(request, { jsonBody: true });
  if (requestError) return error(requestError, 403);

  const user = await currentUser();
  if (!user) return error("Потребна е најава за испраќање понуда.", 401);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error("Невалидни податоци.", 400);
  }
  const parsed = offerInput.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Провери ја пораката и износот.", fields: parsed.error.flatten().fieldErrors },
      422,
    );
  }

  const db = getDb();
  const openOffers = await db
    .select({ total: count() })
    .from(offers)
    .where(
      and(eq(offers.senderUserId, user.userId), eq(offers.status, "sent")),
    );
  if ((openOffers[0]?.total ?? 0) >= 30) {
    return error("Имате премногу отворени понуди. Почекајте одговор.", 429);
  }

  const listing = await db
    .select({
      id: listings.id,
      contactUserId: listings.contactUserId,
      status: listings.status,
    })
    .from(listings)
    .where(eq(listings.id, parsed.data.listingId))
    .limit(1);
  const recipient = listing[0];
  if (!recipient) return error("Огласот не постои.", 404);
  if (recipient.status !== "approved") {
    return error("Огласот не е достапен.", 404);
  }
  if (recipient.contactUserId === user.userId) {
    return error("Не можеш да испратиш понуда за сопствен оглас.", 422);
  }
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.insert(offers).values({
    id,
    listingId: parsed.data.listingId,
    senderUserId: user.userId,
    recipientUserId: recipient.contactUserId,
    kind: parsed.data.kind,
    amountCents: parsed.data.amountCents ?? null,
    message: parsed.data.message,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return json({ id, status: "sent" }, 201);
}
