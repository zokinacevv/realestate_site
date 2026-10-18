import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import {
  organizationMembers,
  organizations,
  profiles,
  type OrganizationKind,
} from "@/db/schema";
import {
  currentUser,
  error,
  json,
  mutationRequestError,
  readJson,
} from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^[0-9+().\-\s]+$/, "Внесете валиден телефонски број.");

const onboardingSchema = z.discriminatedUnion("accountType", [
  z.object({
    accountType: z.literal("individual"),
    phone: phoneSchema,
  }).strict(),
  z.object({
    accountType: z.enum(["agency", "company"]),
    phone: phoneSchema,
    displayName: z.string().trim().min(2).max(120),
    legalName: z.string().trim().max(180).optional(),
    registrationNumber: z.string().trim().min(5).max(40),
  }).strict(),
]);

/**
 * Completes the locally stored profile after ChatGPT has authenticated the
 * visitor. Identity fields are intentionally never accepted from the browser.
 */
export async function POST(request: Request) {
  const requestError = mutationRequestError(request, { jsonBody: true });
  if (requestError) return error(requestError, 403);

  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error("Невалидни податоци за профилот.", 400);
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: "Провери ги задолжителните податоци за профилот.",
        fields: parsed.error.flatten().fieldErrors,
      },
      422,
    );
  }

  const input = parsed.data;
  const db = getDb();
  const timestamp = new Date().toISOString();
  if (input.accountType === "individual") {
    try {
      await db.transaction(async (tx) => {
        const existingProfile = await tx
          .select({ accountType: profiles.accountType })
          .from(profiles)
          .where(eq(profiles.id, user.userId))
          .limit(1);
        if (existingProfile[0]?.accountType) {
          throw new Error("PROFILE_ALREADY_SET");
        }

        await tx
          .update(profiles)
          .set({
            accountType: input.accountType,
            phone: input.phone,
            onboardingCompletedAt: timestamp,
            updatedAt: timestamp,
          })
          .where(eq(profiles.id, user.userId));
      }, { behavior: "immediate" });
    } catch (reason) {
      if (reason instanceof Error && reason.message === "PROFILE_ALREADY_SET") {
        return error("Профилот е веќе поставен.", 409);
      }
      throw reason;
    }

    return json({
      profile: {
        id: user.userId,
        email: user.email,
        displayName: user.displayName,
        fullName: user.fullName,
        phone: input.phone,
        accountType: input.accountType,
        onboardingCompletedAt: timestamp,
      },
      organizations: [],
    }, 201);
  }

  const organizationKind: OrganizationKind =
    input.accountType === "agency" ? "agency" : "developer";
  const organizationId = crypto.randomUUID();
  const legalName = input.legalName?.trim() || null;
  try {
    await db.transaction(async (tx) => {
      const existingProfile = await tx
        .select({ accountType: profiles.accountType })
        .from(profiles)
        .where(eq(profiles.id, user.userId))
        .limit(1);
      if (existingProfile[0]?.accountType) {
        throw new Error("PROFILE_ALREADY_SET");
      }

      const duplicateRegistration = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.registrationNumber, input.registrationNumber))
        .limit(1);
      if (duplicateRegistration[0]) {
        throw new Error("REGISTRATION_NUMBER_EXISTS");
      }

      await tx
        .update(profiles)
        .set({
          accountType: input.accountType,
          phone: input.phone,
          onboardingCompletedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(profiles.id, user.userId));
      await tx.insert(organizations).values({
        id: organizationId,
        kind: organizationKind,
        displayName: input.displayName,
        legalName,
        registrationNumber: input.registrationNumber,
        status: "pending",
        createdByUserId: user.userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await tx.insert(organizationMembers).values({
        organizationId,
        userId: user.userId,
        role: "owner",
        createdAt: timestamp,
      });
    }, { behavior: "immediate" });
  } catch (reason) {
    if (reason instanceof Error && reason.message === "PROFILE_ALREADY_SET") {
      return error("Профилот е веќе поставен.", 409);
    }
    if (
      reason instanceof Error && (
        reason.message === "REGISTRATION_NUMBER_EXISTS" ||
        /organizations_registration_number_unique|registration_number/i.test(reason.message)
      )
    ) {
      return error("Организација со овој ЕМБС веќе постои.", 409);
    }
    throw reason;
  }

  return json({
    profile: {
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
      fullName: user.fullName,
      phone: input.phone,
      accountType: input.accountType,
      onboardingCompletedAt: timestamp,
    },
    organizations: [{
      id: organizationId,
      kind: organizationKind,
      displayName: input.displayName,
      legalName,
      registrationNumber: input.registrationNumber,
      status: "pending",
      role: "owner",
    }],
  }, 201);
}
