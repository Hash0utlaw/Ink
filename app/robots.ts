import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site-config"
import { isLaunchGateOn } from "@/lib/launch-gate"

export default function robots(): MetadataRoute.Robots {
  // Before launch, keep the whole site out of search engines.
  if (isLaunchGateOn()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/artist-dashboard/",
          "/login",
          "/signup",
          "/forgot-password",
          "/book/",
          "/review/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
