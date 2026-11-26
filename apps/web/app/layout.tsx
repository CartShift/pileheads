import type { Metadata } from "next";
import "./globals.css";
import "./tabletop-layout.css";
import "./tabletop-skin.css";
import FunnelProvider from "../components/funnel-provider";

export const metadata: Metadata = {
  title: "PILEHEADS | The Card Game",
  description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots.",
  applicationName: "Pileheads",
  metadataBase: new URL("https://pileheads.com"),
  icons: { icon: "/pileheads-icon.png", apple: "/pileheads-icon.png" },
  openGraph: { siteName: "Pileheads", title: "PILEHEADS | The Card Game", description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots.", images: [{ url: "/stack-media/stack-home-gameplay-desktop-rc3.webp", width: 731, height: 491, alt: "Actual PILEHEADS illustrated card game in the browser" }] },
  twitter: { card: "summary_large_image", title: "PILEHEADS | The Card Game", description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots.", images: ["/stack-media/stack-home-gameplay-desktop-rc3.webp"] }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/stack-media/stack-design-system.css" /></head>
      <body><FunnelProvider>{children}</FunnelProvider></body>
    </html>
  );
}
