import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { listings } from "@/db/schema";
import { currentUser, error, json, toOwnerListing } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const db = getDb();
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.ownerUserId, user.userId))
    .orderBy(desc(listings.updatedAt))
    .limit(100);

  return json({ listings: rows.map(toOwnerListing) });
}
