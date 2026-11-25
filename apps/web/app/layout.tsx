import type { Metadata } from "next";
import "./globals.css";
import MotionProvider from "../components/motion-provider";

export const metadata: Metadata = {
  title: "STACK | The Card Game",
  manifest: "/stack.webmanifest",
  icons: {icon: "/stack-icon.svg"},
  description: "One pile. One loser. Play STACK with friends online or challenge the bots."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/stack-media/stack-design-system.css" /></head>
      <body><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}
