import type { Metadata } from "next";
import "./globals.css";
import "./tabletop-layout.css";
import "./tabletop-skin.css";

export const metadata: Metadata = {
  title: "PILEHEADS | The Card Game",
  description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots.",
  applicationName: "Pileheads",
  icons: { icon: "/pileheads-icon.png", apple: "/pileheads-icon.png" },
  openGraph: { siteName: "Pileheads", title: "PILEHEADS | The Card Game", description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots." }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/stack-media/stack-design-system.css" /></head>
      <body>{children}</body>
    </html>
  );
}
