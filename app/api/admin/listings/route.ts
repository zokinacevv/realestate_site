import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { listingModerationEvents, listings } from "@/db/schema";
import {
  canTransition,
  currentUser,
  error,
  isModerator,
  json,
  mutationRequestError,
  readJson,
  toOwnerListing,
} from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const filterStatus = z.enum(["pending", "approved", "rejected", "archived"]);
const moderationInput = z
  .object({
    listingId: z.string().uuid(),
    status: z.enum(["approved", "rejected", "archived"]),
    note: z.string().trim().max(1_000).nullable().optional(),
  })
  .strict();

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);
  if (!(await isModerator(user.userId, user.email))) {
    return error("Немаш администраторска дозвола.", 403);
  }

  const parsedStatus = filterStatus.safeParse(
    new URL(request.url).searchParams.get("status") ?? "pending",
  );
  if (!parsedStatus.success) return error("Невалиден статус.", 422);

  const db = getDb();
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.status, parsedStatus.data))
    .orderBy(desc(listings.submittedAt), desc(listings.createdAt))
    .limit(100);

  return json({ listings: rows.map(toOwnerListing) });
}

export async function POST(request: Request) {
  const requestError = mutationRequestError(request, { jsonBody: true });
  if (requestError) return error(requestError, 403);

  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);
  if (!(await isModerator(user.userId, user.email))) {
    return error("Немаш администраторска дозвола.", 403);
  }

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error("Невалидни податоци.", 400);
  }
  const parsed = moderationInput.safeParse(body);
  if (!parsed.success) return error("Невалидна одлука за оглас.", 422);

  const db = getDb();
  const found = await db
    .select()
    .from(listings)
    .where(eq(listings.id, parsed.data.listingId))
    .limit(1);
  const listing = found[0];
  if (!listing) return error("Огласот не постои.", 404);
  if (!canTransition(listing.status, parsed.data.status)) {
    return error("Оваа промена на статус не е дозволена.", 409);
  }

  const moderatedAt = new Date().toISOString();
  const moderationEventId = crypto.randomUUID();
  const batchResults = await db.batch([
    db
      .update(listings)
      .set({
        status: parsed.data.status,
        publishedAt:
          parsed.data.status === "approved" ? moderatedAt : listing.publishedAt,
        moderatedByUserId: user.userId,
        moderatedAt,
        moderationNote: parsed.data.note ?? null,
        updatedAt: moderatedAt,
      })
      .where(
          and(
            eq(listings.id, listing.id),
            eq(listings.status, listing.status),
          ),
      ),
    db.insert(listingModerationEvents).select(
      db
        .select({
          id: sql<string>`${moderationEventId}`,
          listingId: sql<string>`${listing.id}`,
          actorUserId: sql<string>`${user.userId}`,
          previousStatus: sql<string>`${listing.status}`,
          nextStatus: sql<string>`${parsed.data.status}`,
          note: sql<string | null>`${parsed.data.note ?? null}`,
          createdAt: sql<string>`${moderatedAt}`,
        })
        .from(listings)
        .where(
          and(eq(listings.id, listing.id), sql`changes() = 1`),
        ),
    ),
  ]);

  const updateResult = batchResults[0] as D1Response;
  if (updateResult.meta.changes !== 1) {
    return error("Огласот е променет од друг администратор. Освежете го прегледот.", 409);
  }

  const updated = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listing.id))
    .limit(1);
  return json({ listing: toOwnerListing(updated[0]) });
}
