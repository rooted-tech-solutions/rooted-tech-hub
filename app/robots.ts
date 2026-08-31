import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The internal tool and, more importantly, client contract signing links
      // must never be indexed.
      disallow: ["/dashboard", "/dashboard/", "/sign/", "/login"],
    },
    sitemap: `${SITE.domain}/sitemap.xml`,
  };
}
