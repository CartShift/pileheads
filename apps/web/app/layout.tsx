import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STACK | The Card Game",
  description: "One pile. One loser. Play STACK with friends online or challenge the bots."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/stack-media/stack-design-system.css" /></head>
      <body>{children}</body>
    </html>
  );
}
