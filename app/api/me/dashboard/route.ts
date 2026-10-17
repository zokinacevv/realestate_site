import { and, count, desc, eq, gte } from "drizzle-orm";

import { getDb } from "@/db";
import { listingFavorites, listingViewEvents, listings, offers } from "@/db/schema";
import { currentUser, error, json } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 10);
  const [
    myListingRows,
    favoriteRows,
    incomingRows,
    outgoingRows,
    viewRows,
    recentViewRows,
    listingViewRows,
    incomingByListingRows,
  ] = await Promise.all([
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
    db
      .select({ total: count() })
      .from(listingViewEvents)
      .innerJoin(listings, eq(listingViewEvents.listingId, listings.id))
      .where(and(eq(listings.ownerUserId, user.userId), eq(listings.status, "approved"))),
    db
      .select({ total: count() })
      .from(listingViewEvents)
      .innerJoin(listings, eq(listingViewEvents.listingId, listings.id))
      .where(and(
        eq(listings.ownerUserId, user.userId),
        eq(listings.status, "approved"),
        gte(listingViewEvents.viewedOn, thirtyDaysAgo),
      )),
    db
      .select({
        listingId: listings.id,
        title: listings.title,
        totalViews: count(listingViewEvents.id),
      })
      .from(listings)
      .leftJoin(listingViewEvents, eq(listingViewEvents.listingId, listings.id))
      .where(and(eq(listings.ownerUserId, user.userId), eq(listings.status, "approved")))
      .groupBy(listings.id, listings.title)
      .orderBy(desc(count(listingViewEvents.id)), desc(listings.updatedAt))
      .limit(6),
    db
      .select({ listingId: offers.listingId, total: count() })
      .from(offers)
      .where(eq(offers.recipientUserId, user.userId))
      .groupBy(offers.listingId),
  ]);

  const listingsByStatus = Object.fromEntries(
    myListingRows.map((row) => [row.status, row.total]),
  );
  const incomingByListing = new Map(
    incomingByListingRows.map((row) => [row.listingId, row.total]),
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
    views: {
      total: viewRows[0]?.total ?? 0,
      last30Days: recentViewRows[0]?.total ?? 0,
    },
    activity: listingViewRows.map((row) => ({
      listingId: row.listingId,
      title: row.title,
      views: row.totalViews,
      incomingOffers: incomingByListing.get(row.listingId) ?? 0,
    })),
  });
}
