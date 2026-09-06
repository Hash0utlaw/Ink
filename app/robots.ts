import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
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
    sitemap: "https://tattoo-maps.com/sitemap.xml",
  }
}
