import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { listingModerationEvents, listings } from "@/db/schema";
import {
  currentUser,
  error,
  json,
  listingInputSchema,
  mutationRequestError,
  readJson,
  resolvePublisher,
  toOwnerListing,
} from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

/** An owner edit returns a public listing to review before it can be shown again. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestError = mutationRequestError(request, { jsonBody: true });
  if (requestError) return error(requestError, 403);
  const user = await currentUser();
  if (!user) return error("Потребна е најава.", 401);

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return error("Невалиден оглас.", 422);
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error("Невалидни податоци за огласот.", 400);
  }
  const parsed = listingInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Провери ги задолжителните податоци за огласот." }, 422);
  const input = parsed.data;
  if ((input.latitudeE6 == null) !== (input.longitudeE6 == null)) return error("Координатите мора да се внесат како пар.", 422);

  const db = getDb();
  const found = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  const listing = found[0];
  if (!listing) return error("Огласот не постои.", 404);
  if (listing.ownerUserId !== user.userId) return error("Немаш право да го уредуваш овој оглас.", 403);
  if (listing.status === "archived") return error("Архивиран оглас не може да се уредува.", 409);

  let publisher;
  try {
    publisher = await resolvePublisher(user.userId, input.publisherType, input.organizationId);
  } catch (reason) {
    if (reason instanceof Error && reason.message === "ONBOARDING_REQUIRED") {
      return error("Прво заврши го создавањето на профилот.", 409);
    }
    if (reason instanceof Error && reason.message === "PUBLISHER_TYPE_MISMATCH") {
      return error("Типот на огласувач мора да одговара на типот на вашиот профил.", 422);
    }
    return error("Немаш право да објавуваш во име на оваа организација.", 403);
  }
  const timestamp = new Date().toISOString();
  const nextStatus = "pending" as const;
  await db.batch([
    db.update(listings).set({
      contactUserId: publisher.contactUserId,
      organizationId: publisher.organizationId,
      publisherType: publisher.publisherType,
      status: nextStatus,
      intent: input.intent,
      propertyType: input.propertyType,
      title: input.title,
      description: input.description,
      priceAmountCents: input.priceAmountCents,
      currency: input.currency,
      pricePeriod: input.pricePeriod,
      city: input.city,
      municipality: input.municipality ?? null,
      neighborhood: input.neighborhood ?? null,
      addressLine: input.addressLine,
      exactLocationPublic: input.exactLocationPublic,
      latitudeE6: input.latitudeE6 ?? null,
      longitudeE6: input.longitudeE6 ?? null,
      areaM2: input.areaM2,
      rooms: input.rooms ?? null,
      floorNumber: input.floorNumber ?? null,
      floorTotal: input.floorTotal ?? null,
      elevator: input.elevator ?? null,
      parking: input.parking ?? null,
      heating: input.heating ?? null,
      cooling: input.cooling ?? null,
      constructionState: input.constructionState,
      builtYear: input.builtYear ?? null,
      completionDate: input.completionDate ?? null,
      featuresJson: JSON.stringify({ features: input.features, photoUrls: input.photoUrls }),
      submittedAt: timestamp,
      moderationNote: null,
      updatedAt: timestamp,
    }).where(and(eq(listings.id, id), eq(listings.ownerUserId, user.userId))),
    db.insert(listingModerationEvents).values({
      id: crypto.randomUUID(), listingId: id, actorUserId: user.userId,
      previousStatus: listing.status, nextStatus,
      note: "Огласот е уреден и повторно е испратен на проверка.", createdAt: timestamp,
    }),
  ]);
  const updated = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return json({ listing: toOwnerListing(updated[0]) });
}
