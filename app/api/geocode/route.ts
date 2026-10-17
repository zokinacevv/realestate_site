import { z } from "zod";

import { error, json } from "@/lib/doma-server";

export const dynamic = "force-dynamic";

const querySchema = z.string().trim().min(3).max(200);

/** Proxies address suggestions so the browser never needs a geocoding key. */
export async function GET(request: Request) {
  const query = querySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!query.success) return error("Внесете најмалку 3 знаци од адресата.", 422);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.data + ", Македонија");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "mk");
  try {
    const response = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "DOMA-real-estate-search/1.0" }, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return error("Пребарувањето адреси моментално не е достапно.", 502);
    const data = await response.json() as Array<{ display_name?: unknown; lat?: unknown; lon?: unknown }>;
    return json({ results: data.flatMap((item) => {
      const latitude = Number(item.lat); const longitude = Number(item.lon);
      return typeof item.display_name === "string" && Number.isFinite(latitude) && Number.isFinite(longitude)
        ? [{ label: item.display_name, latitude, longitude }]
        : [];
    }) });
  } catch {
    return error("Пребарувањето адреси моментално не е достапно.", 502);
  }
}
