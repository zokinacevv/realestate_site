import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { organizationMembers, organizations, profiles } from "@/db/schema";
import { currentUser, error, isModerator, json } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const db = getDb();
  const [profileRows, membershipRows] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.userId))
      .limit(1),
    db
      .select({
        id: organizations.id,
        kind: organizations.kind,
        displayName: organizations.displayName,
        legalName: organizations.legalName,
        registrationNumber: organizations.registrationNumber,
        status: organizations.status,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id),
      )
      .where(eq(organizationMembers.userId, user.userId)),
  ]);
  const profile = profileRows[0];
  const onboardingComplete = Boolean(
    profile?.accountType && profile?.onboardingCompletedAt,
  );

  return json({
    profile: {
      id: user.userId,
      email: profile?.email ?? user.email,
      displayName: profile?.displayName ?? user.displayName,
      fullName: profile?.fullName ?? user.fullName,
      phone: profile?.phone ?? null,
      accountType: profile?.accountType ?? null,
      onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
      createdAt: profile?.createdAt ?? null,
    },
    onboarding: {
      complete: onboardingComplete,
      accountType: profile?.accountType ?? null,
    },
    organizations: membershipRows,
    permissions: {
      canModerateListings: await isModerator(user.userId, user.email),
    },
  });
}
