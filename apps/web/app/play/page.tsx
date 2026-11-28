import type { Metadata } from "next";
import GameTable from "../../components/game-table";

export const metadata: Metadata = { title: "Play PILEHEADS free online", alternates: { canonical: "/play" } };

export default function PlayPage() {
  return <GameTable />;
}
