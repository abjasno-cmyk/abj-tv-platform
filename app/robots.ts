import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/studio/",
          "/auth/",
          "/muj-verox",
          "/conversations",
          "/nazory/sprava",
          "/nazory/napsat",
          "/nazory/nahled",
          "/nazory/profil",
          "/autori",
          "/videos",
        ],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-videos.xml`],
  };
}
