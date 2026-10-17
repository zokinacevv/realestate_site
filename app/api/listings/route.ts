import { and, count, desc, eq } from "drizzle-orm";

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
  toPublicListing,
} from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 80;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = Math.min(
    Math.max(Number.parseInt(params.get("limit") ?? "24", 10) || 24, 1),
    MAX_RESULTS,
  );
  const filters = [eq(listings.status, "approved")];

  const city = cleanQuery(params.get("city"));
  const municipality = cleanQuery(params.get("municipality"));
  const neighborhood = cleanQuery(params.get("neighborhood"));
  const intent = params.get("intent");
  const propertyType = cleanQuery(params.get("propertyType"));

  if (city) filters.push(eq(listings.city, city));
  if (municipality) filters.push(eq(listings.municipality, municipality));
  if (neighborhood) filters.push(eq(listings.neighborhood, neighborhood));
  if (intent === "sale" || intent === "rent") {
    filters.push(eq(listings.intent, intent));
  }
  if (propertyType) filters.push(eq(listings.propertyType, propertyType));

  const db = getDb();
  const rows = await db
    .select()
    .from(listings)
    .where(and(...filters))
    .orderBy(desc(listings.publishedAt), desc(listings.createdAt))
    .limit(limit);

  return json({ listings: rows.map(toPublicListing) });
}

export async function POST(request: Request) {
  const requestError = mutationRequestError(request, { jsonBody: true });
  if (requestError) return error(requestError, 403);

  const user = await currentUser();
  if (!user) return error("Потребна е најава за објавување оглас.", 401);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error("Невалидни податоци за огласот.", 400);
  }

  const parsed = listingInputSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: "Провери ги задолжителните податоци за огласот.",
        fields: parsed.error.flatten().fieldErrors,
      },
      422,
    );
  }

  const input = parsed.data;
  if ((input.latitudeE6 == null) !== (input.longitudeE6 == null)) {
    return error("Координатите мора да се внесат како пар.", 422);
  }

  let publisher;
  try {
    publisher = await resolvePublisher(
      user.userId,
      input.publisherType,
      input.organizationId,
    );
  } catch (reason) {
    if (reason instanceof Error && reason.message === "ORGANIZATION_REQUIRED") {
      return error("Избери одобрена организација за овој тип објавувач.", 422);
    }
    return error("Немаш право да објавуваш во име на оваа организација.", 403);
  }

  const db = getDb();
  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const pendingListings = await db
    .select({ total: count() })
    .from(listings)
    .where(
      and(
        eq(listings.ownerUserId, user.userId),
        eq(listings.status, "pending"),
      ),
    );
  if ((pendingListings[0]?.total ?? 0) >= 20) {
    return error(
      "Имате премногу огласи што чекаат проверка. Почекајте модерација.",
      429,
    );
  }

  await db.batch([
    db.insert(listings).values({
      id,
      ownerUserId: user.userId,
      contactUserId: publisher.contactUserId,
      organizationId: publisher.organizationId,
      publisherType: publisher.publisherType,
      status: "pending",
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
      featuresJson: JSON.stringify(input.features),
      submittedAt,
      createdAt: submittedAt,
      updatedAt: submittedAt,
    }),
    db.insert(listingModerationEvents).values({
      id: crypto.randomUUID(),
      listingId: id,
      actorUserId: user.userId,
      previousStatus: null,
      nextStatus: "pending",
      note: "Огласот е поднесен за проверка.",
      createdAt: submittedAt,
    }),
  ]);

  const created = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  return json({ listing: toOwnerListing(created[0]) }, 201);
}

function cleanQuery(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : null;
}
