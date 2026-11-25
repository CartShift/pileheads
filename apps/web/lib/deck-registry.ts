/** Public catalog. Deck art is independent of game rules and room authority.
 * All shipped themes remain free. This is presentation metadata, not authorization.
 */
export const DECKS = [
  { id: "refined", name: "Illustrated V2", description: "The latest official STACK illustrations and card artwork.", artwork: "/pilehead/assets/stack-characters-v2.webp", rulesetId: "classic", version: 2, access: "free", status: "published" },
  { id: "characters", name: "Characters (classic)", description: "Expressive illustrated characters and colorful action cards.", artwork: "/pilehead/assets/stack-characters.webp", rulesetId: "classic", version: 1, access: "free", status: "published" },
  { id: "original", name: "Original", description: "The original STACK artwork, with the same familiar rules.", artwork: "/pilehead/assets/stack-sheet.webp", rulesetId: "classic", version: 1, access: "free", status: "published" },
] as const;

export type DeckTheme = typeof DECKS[number]["id"];
export const DEFAULT_DECK: DeckTheme = "refined";
export function isDeckTheme(value: unknown): value is DeckTheme {
  return typeof value === "string" && DECKS.some(deck => deck.id === value && deck.status === "published" && deck.access === "free");
}
export function resolveDeckTheme(requested: unknown, saved: unknown): DeckTheme {
  return isDeckTheme(requested) ? requested : isDeckTheme(saved) ? saved : DEFAULT_DECK;
}
export function deckPlayHref(id: DeckTheme): string {
  return "/play?deck=" + encodeURIComponent(id);
}
