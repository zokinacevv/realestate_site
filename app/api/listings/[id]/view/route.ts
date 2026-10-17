import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { listingViewEvents, listings } from "@/db/schema";
import { error, json, mutationRequestError } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const viewerCookie = "doma_viewer";
const viewerCookieAgeSeconds = 60 * 60 * 24 * 365;

/**
 * Records at most one aggregate view per listing, browser, and UTC day.
 * The database receives only a SHA-256 digest of a random HTTP-only cookie.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestError = mutationRequestError(request);
  if (requestError) return error(requestError, 403);

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return error("Невалиден оглас.", 422);

  const db = getDb();
  const listing = await db
    .select({ id: listings.id, ownerUserId: listings.ownerUserId })
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.status, "approved")))
    .limit(1);
  if (!listing[0]) return error("Огласот не е достапен.", 404);
  if (request.headers.get("oai-authenticated-user-id") === listing[0].ownerUserId) {
    return json({ recorded: false });
  }

  const existingViewer = readCookie(request, viewerCookie);
  const viewerId = isUuid(existingViewer) ? existingViewer : crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db
    .insert(listingViewEvents)
    .values({
      id: crypto.randomUUID(),
      listingId: id,
      visitorKeyHash: await sha256(`${viewerId}:${id}`),
      viewedOn: timestamp.slice(0, 10),
      createdAt: timestamp,
    })
    .onConflictDoNothing();

  const response = json({ recorded: true });
  if (viewerId !== existingViewer) {
    response.headers.append(
      "Set-Cookie",
      `${viewerCookie}=${viewerId}; Max-Age=${viewerCookieAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    );
  }
  return response;
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const item of cookieHeader.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function isUuid(value: string | null): value is string {
  return value != null && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
