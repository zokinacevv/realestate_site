import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://doma-nedviznosti.easydune6.chatgpt.site";
  return ["", "/privacy", "/terms"].map((path) => ({ url: base + path, lastModified: new Date() }));
}
