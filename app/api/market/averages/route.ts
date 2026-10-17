import { and, asc, eq, isNotNull, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { listings } from "@/db/schema";
import { error, json } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const city = params.get("city")?.trim();
  const requestedIntent = params.get("intent");
  const intent =
    requestedIntent === "sale" || requestedIntent === "rent"
      ? requestedIntent
      : null;
  if (!city || city.length > 80) {
    return error("Избери важечки град.", 422);
  }
  if (requestedIntent && !intent) {
    return error("Невалиден тип на оглас.", 422);
  }

  const filters: SQL[] = [
    eq(listings.status, "approved"),
    eq(listings.city, city),
    isNotNull(listings.municipality),
  ];
  if (intent) filters.push(eq(listings.intent, intent));

  const db = getDb();
  const averages = {
    sampleCount: sql<number>`count(*)`,
    averagePriceCents: sql<number>`round(avg(${listings.priceAmountCents}))`,
    averagePricePerM2Cents: sql<number>`round(avg(cast(${listings.priceAmountCents} as real) / nullif(${listings.areaM2}, 0)))`,
  };

  const byMunicipality = await db
    .select({ municipality: listings.municipality, ...averages })
    .from(listings)
    .where(and(...filters))
    .groupBy(listings.municipality)
    .orderBy(asc(listings.municipality));

  const byNeighborhood = await db
    .select({
      municipality: listings.municipality,
      neighborhood: listings.neighborhood,
      ...averages,
    })
    .from(listings)
    .where(and(...filters, isNotNull(listings.neighborhood)))
    .groupBy(listings.municipality, listings.neighborhood)
    .orderBy(asc(listings.municipality), asc(listings.neighborhood));

  return json({
    city,
    intent: intent ?? null,
    byMunicipality: byMunicipality.map(normalizeAverage),
    byNeighborhood: byNeighborhood.map(normalizeAverage),
    note:
      "Просеците се пресметани само од одобрени огласи во базата; празен резултат значи дека сè уште нема доволно податоци.",
  });
}

function normalizeAverage<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    sampleCount: Number(row.sampleCount ?? 0),
    averagePriceCents: Number(row.averagePriceCents ?? 0),
    averagePricePerM2Cents: Number(row.averagePricePerM2Cents ?? 0),
  };
}
