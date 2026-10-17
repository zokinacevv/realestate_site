import { count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { listingFavorites, listings, offers } from "@/db/schema";
import { currentUser, error, json } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const db = getDb();
  const [myListingRows, favoriteRows, incomingRows, outgoingRows] = await Promise.all([
    db
      .select({ status: listings.status, total: count() })
      .from(listings)
      .where(eq(listings.ownerUserId, user.userId))
      .groupBy(listings.status),
    db
      .select({ total: count() })
      .from(listingFavorites)
      .where(eq(listingFavorites.userId, user.userId)),
    db
      .select({ total: count() })
      .from(offers)
      .where(eq(offers.recipientUserId, user.userId)),
    db
      .select({ total: count() })
      .from(offers)
      .where(eq(offers.senderUserId, user.userId)),
  ]);

  const listingsByStatus = Object.fromEntries(
    myListingRows.map((row) => [row.status, row.total]),
  );
  return json({
    listings: {
      total: myListingRows.reduce((sum, row) => sum + row.total, 0),
      pending: listingsByStatus.pending ?? 0,
      approved: listingsByStatus.approved ?? 0,
      rejected: listingsByStatus.rejected ?? 0,
      archived: listingsByStatus.archived ?? 0,
    },
    favorites: favoriteRows[0]?.total ?? 0,
    offers: {
      incoming: incomingRows[0]?.total ?? 0,
      outgoing: outgoingRows[0]?.total ?? 0,
    },
  });
}
