import type { Metadata } from "next";
import "./globals.css";
import MotionProvider from "../components/motion-provider";

export const metadata: Metadata = {
  title: "PILEHEADS | The Card Game",
  description: "One pile. One loser. Play PILEHEADS with friends online or challenge the bots."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}
