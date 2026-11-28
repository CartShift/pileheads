import type { Metadata } from "next";
import config from "./seo-routes.json";
export const SITE_ORIGIN = config.origin;
type Route = keyof typeof config.routes;
type Policy = { title: string; description?: string; index: boolean; follow?: boolean; canonical?: string };
const routes: Record<Route, Policy> = config.routes;
export function routeMetadata(route: Route): Metadata {
  const policy = routes[route];
  const canonical = new URL(policy.canonical ?? route, SITE_ORIGIN).href;
  if (!policy.index) return {
    title: policy.title, robots: { index: false, follow: policy.follow ?? false },
    alternates: policy.canonical ? { canonical } : undefined,
    openGraph: null, twitter: null,
  };
  if (!policy.description) throw Error("Missing public description: " + route);
  const image = new URL(config.socialImage, SITE_ORIGIN).href;
  return {
    title: policy.title, description: policy.description,
    alternates: { canonical }, robots: { index: true, follow: true },
    openGraph: {
      type: "website", siteName: "PILEHEADS", locale: "en_US",
      title: policy.title, description: policy.description, url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: "Illustrated PILEHEADS cards and official logo" }],
    },
    twitter: { card: "summary_large_image", title: policy.title, description: policy.description, images: [image] },
  };
}
export const websiteSchema = {
  "@context": "https://schema.org", "@type": "WebSite",
  "@id": SITE_ORIGIN + "/#website", url: SITE_ORIGIN + "/", name: "PILEHEADS", inLanguage: "en",
};
export const gameSchema = {
  "@context": "https://schema.org", "@type": "VideoGame",
  "@id": SITE_ORIGIN + "/play#game", name: "PILEHEADS", url: SITE_ORIGIN + "/play",
  description: routes["/play"].description, inLanguage: "en", gamePlatform: "Web browser",
  applicationCategory: "GameApplication", genre: "Card game",
  image: new URL(config.socialImage, SITE_ORIGIN).href,
  isAccessibleForFree: true, isPartOf: { "@id": SITE_ORIGIN + "/#website" },
};
