import type { MetadataRoute } from "next";
import { BASE_URL } from "./_lib/consts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/private/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
