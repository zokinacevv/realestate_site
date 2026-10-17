import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { currentUser, error, isModerator, json } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const db = getDb();
  const profile = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.userId))
    .limit(1);

  return json({
    profile: {
      id: user.userId,
      email: profile[0]?.email ?? user.email,
      displayName: profile[0]?.displayName ?? user.displayName,
      fullName: profile[0]?.fullName ?? user.fullName,
      createdAt: profile[0]?.createdAt ?? null,
    },
    permissions: {
      canModerateListings: await isModerator(user.userId),
    },
  });
}
