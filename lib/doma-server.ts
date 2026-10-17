import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import {
  listings,
  organizationMembers,
  organizations,
  profiles,
  userRoles,
  type ListingLifecycle,
  type PublisherType,
} from "@/db/schema";

export type ListingRow = typeof listings.$inferSelect;

export const listingInputSchema = z
  .object({
    title: z.string().trim().min(6).max(140),
    description: z.string().trim().max(4_000).default(""),
    intent: z.enum(["sale", "rent"]),
    propertyType: z.string().trim().min(2).max(64),
    publisherType: z.enum(["owner", "agency", "developer"]).default("owner"),
    organizationId: z.string().uuid().nullable().optional(),
    priceAmountCents: z.number().int().positive().max(1_000_000_000_00),
    currency: z.literal("EUR").default("EUR"),
    pricePeriod: z.enum(["total", "monthly"]).default("total"),
    city: z.string().trim().min(2).max(80),
    municipality: z.string().trim().min(2).max(80).nullable().optional(),
    neighborhood: z.string().trim().min(2).max(100).nullable().optional(),
    addressLine: z.string().trim().min(5).max(220),
    exactLocationPublic: z.boolean().default(false),
    latitudeE6: z.number().int().min(-90_000_000).max(90_000_000).nullable().optional(),
    longitudeE6: z.number().int().min(-180_000_000).max(180_000_000).nullable().optional(),
    areaM2: z.number().int().positive().max(20_000),
    rooms: z.number().int().positive().max(50).nullable().optional(),
    floorNumber: z.number().int().min(-10).max(300).nullable().optional(),
    floorTotal: z.number().int().positive().max(300).nullable().optional(),
    elevator: z.boolean().nullable().optional(),
    parking: z.string().trim().max(120).nullable().optional(),
    heating: z.string().trim().max(120).nullable().optional(),
    cooling: z.string().trim().max(120).nullable().optional(),
    constructionState: z.enum(["built", "in_progress"]).default("built"),
    builtYear: z.number().int().min(1800).max(2100).nullable().optional(),
    completionDate: z.string().date().nullable().optional(),
    features: z.array(z.string().trim().min(1).max(64)).max(30).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.publisherType === "owner" && value.organizationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationId"],
        message: "Приватен оглас не смее да има организација.",
      });
    }
    if (value.publisherType !== "owner" && !value.organizationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationId"],
        message: "За агенција или инвеститор е потребна одобрена организација.",
      });
    }
    if (value.constructionState === "in_progress" && value.builtYear) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["builtYear"],
        message: "Оглас во тек на градба не треба да има година на изградба.",
      });
    }
  });

export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

/**
 * The hosted identity travels with the browser session, so state-changing
 * requests must be same-origin. JSON alone is not a CSRF control.
 */
export function mutationRequestError(
  request: Request,
  options: { jsonBody?: boolean } = {},
): string | null {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return "Барањето мора да доаѓа од DOMA.";
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return "Невалидно потекло на барањето.";
  }

  if (options.jsonBody) {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      return "Потребен е JSON формат за ова барање.";
    }
  }

  return null;
}

export async function readJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 64_000) {
    throw new Error("BODY_TOO_LARGE");
  }
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}

/** Creates/refreshes the local profile only from trusted host identity headers. */
export async function currentUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;

  const db = getDb();
  const timestamp = new Date().toISOString();
  await db
    .insert(profiles)
    .values({
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
      fullName: user.fullName,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: user.email,
        displayName: user.displayName,
        fullName: user.fullName,
        updatedAt: timestamp,
      },
    });

  return user;
}

export async function isModerator(userId: string): Promise<boolean> {
  const db = getDb();
  const role = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        sql`${userRoles.role} in ('admin', 'moderator')`,
      ),
    )
    .limit(1);
  return role.length > 0;
}

export async function resolvePublisher(
  userId: string,
  publisherType: PublisherType,
  organizationId: string | null | undefined,
): Promise<{
  publisherType: PublisherType;
  organizationId: string | null;
  contactUserId: string;
}> {
  if (publisherType === "owner") {
    return { publisherType, organizationId: null, contactUserId: userId };
  }

  if (!organizationId) {
    throw new Error("ORGANIZATION_REQUIRED");
  }

  const db = getDb();
  const result = await db
    .select({
      kind: organizations.kind,
      status: organizations.status,
      memberRole: organizationMembers.role,
    })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(
      and(
        eq(organizations.id, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);

  const membership = result[0];
  if (
    !membership ||
    membership.status !== "verified" ||
    membership.kind !== publisherType ||
    membership.memberRole === "viewer"
  ) {
    throw new Error("ORGANIZATION_ACCESS_DENIED");
  }

  return { publisherType, organizationId, contactUserId: userId };
}

export function toPublicListing(row: ListingRow) {
  const shareExactLocation = row.exactLocationPublic;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    intent: row.intent,
    propertyType: row.propertyType,
    publisherType: row.publisherType,
    priceAmountCents: row.priceAmountCents,
    currency: row.currency,
    pricePeriod: row.pricePeriod,
    city: row.city,
    municipality: row.municipality,
    neighborhood: row.neighborhood,
    addressLine: shareExactLocation ? row.addressLine : null,
    locationPrecision: row.locationPrecision,
    latitudeE6: shareExactLocation ? row.latitudeE6 : null,
    longitudeE6: shareExactLocation ? row.longitudeE6 : null,
    areaM2: row.areaM2,
    rooms: row.rooms,
    floorNumber: row.floorNumber,
    floorTotal: row.floorTotal,
    elevator: row.elevator,
    parking: row.parking,
    heating: row.heating,
    cooling: row.cooling,
    constructionState: row.constructionState,
    builtYear: row.builtYear,
    completionDate: row.completionDate,
    features: parseFeatures(row.featuresJson),
    publishedAt: row.publishedAt,
  };
}

export function toOwnerListing(row: ListingRow) {
  return {
    ...toPublicListing(row),
    addressLine: row.addressLine,
    exactLocationPublic: row.exactLocationPublic,
    status: row.status,
    moderationNote: row.moderationNote,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
  };
}

export function canTransition(
  current: ListingLifecycle,
  next: ListingLifecycle,
): boolean {
  if (next === "archived") return current !== "archived";
  return (
    (current === "pending" && (next === "approved" || next === "rejected")) ||
    (current === "approved" && next === "rejected") ||
    (current === "rejected" && next === "pending")
  );
}

function parseFeatures(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
