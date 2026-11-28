import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./tabletop-layout.css";
import "./tabletop-skin.css";
import "./launch-experience.css";
import "./product-shell.css";
import "./pwa.css";
import FunnelProvider from "../components/funnel-provider";

const pwaEnabled = process.env.NEXT_PUBLIC_PILEHEADS_PWA === "1";
export const viewport: Viewport = pwaEnabled ? {themeColor:"#086879",viewportFit:"cover"} : {};

export const metadata: Metadata = {
  title: "PILEHEADS | The Card Game",
  description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots.",
  applicationName: "Pileheads",
  metadataBase: new URL("https://pileheads.com"),
  icons: { icon: "/pileheads-icon.png", apple: pwaEnabled ? "/pwa/apple-touch-icon.png" : "/pileheads-icon.png" },
  ...(pwaEnabled ? {manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"PILEHEADS",statusBarStyle:"default" as const}} : {}),
  openGraph: { siteName: "Pileheads", title: "PILEHEADS | The Card Game", description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots.", images: [{ url: "/stack-media/pileheads-social.png", width: 1200, height: 630, alt: "PILEHEADS: One pile. One loser. Illustrated cards and official logo." }] },
  twitter: { card: "summary_large_image", title: "PILEHEADS | The Card Game", description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots.", images: ["/stack-media/pileheads-social.png"] }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="preload" href="/stack-media/barlow-condensed-black-italic.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/><link rel="stylesheet" href="/stack-media/stack-design-system.css" /></head>
      <body><FunnelProvider>{children}</FunnelProvider></body>
    </html>
  );
}
