const illustrations = {
  "hero-game-night": [760, 435],
  "character-three-chef": [508, 520],
  "character-ten-victory": [360, 325],
  "state-defeat-keep-cool": [440, 234],
  "state-explorer-lost": [590, 405],
  "rule-play-higher": [520, 232],
} as const;

export type UniverseIllustrationName = keyof typeof illustrations;

/** Decorative companion artwork; all meaningful copy stays in the surrounding UI. */
export default function UniverseIllustration({name, className = ""}: {
  name: UniverseIllustrationName;
  className?: string;
}) {
  const [width, height] = illustrations[name];
  return <img className={"universe-illustration " + className} src={`/stack-media/universe/${name}.webp`} width={width} height={height} alt="" loading="lazy" decoding="async" draggable={false}/>;
}
