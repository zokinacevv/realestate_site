import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { listingFavorites, listings } from "@/db/schema";
import {
  currentUser,
  error,
  json,
  mutationRequestError,
  readJson,
  toPublicListing,
} from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const favoriteSchema = z.object({ listingId: z.string().uuid() }).strict();

export async function GET() {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const db = getDb();
  const rows = await db
    .select({ listing: listings })
    .from(listingFavorites)
    .innerJoin(listings, eq(listingFavorites.listingId, listings.id))
    .where(
      and(
        eq(listingFavorites.userId, user.userId),
        eq(listings.status, "approved"),
      ),
    )
    .orderBy(desc(listingFavorites.createdAt))
    .limit(100);

  return json({ listings: rows.map((row) => toPublicListing(row.listing)) });
}

export async function POST(request: Request) {
  const requestError = mutationRequestError(request, { jsonBody: true });
  if (requestError) return error(requestError, 403);

  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error("Невалидни податоци.", 400);
  }
  const parsed = favoriteSchema.safeParse(body);
  if (!parsed.success) return error("Невалиден оглас.", 422);

  const db = getDb();
  const listing = await db
    .select({ id: listings.id })
    .from(listings)
    .where(
      and(
        eq(listings.id, parsed.data.listingId),
        eq(listings.status, "approved"),
      ),
    )
    .limit(1);
  if (!listing[0]) return error("Огласот не е достапен.", 404);

  await db
    .insert(listingFavorites)
    .values({
      userId: user.userId,
      listingId: parsed.data.listingId,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
  return json({ saved: true }, 201);
}

export async function DELETE(request: Request) {
  const requestError = mutationRequestError(request);
  if (requestError) return error(requestError, 403);

  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const listingId = new URL(request.url).searchParams.get("listingId");
  const parsed = favoriteSchema.safeParse({ listingId });
  if (!parsed.success) return error("Невалиден оглас.", 422);

  const db = getDb();
  await db
    .delete(listingFavorites)
    .where(
      and(
        eq(listingFavorites.userId, user.userId),
        eq(listingFavorites.listingId, parsed.data.listingId),
      ),
    );
  return json({ saved: false });
}
