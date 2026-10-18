import type { CSSProperties } from "react";
import type { CardThemeId } from "@/data/cardThemes";

const designs: Record<CardThemeId, { background: string; ink: string; accent: string; mark: string }> = {
  eid: { background: "#e9f1e8", ink: "#234631", accent: "#bf9b43", mark: "☾" },
  graduation: { background: "#e8edf5", ink: "#253b64", accent: "#c5a456", mark: "✦" },
  birthday: { background: "#fbebdf", ink: "#744337", accent: "#d87964", mark: "✧" },
  newborn: { background: "#e9f2f4", ink: "#355765", accent: "#89b7c0", mark: "◌" },
  wedding: { background: "#f4e8e8", ink: "#704e55", accent: "#bc8b88", mark: "◇" },
  general: { background: "#f2eddf", ink: "#625537", accent: "#c9a227", mark: "✦" },
};

export function CardThemePreview({
  theme,
  className = "",
}: {
  theme: CardThemeId;
  className?: string;
}) {
  const design = designs[theme];
  const style = {
    backgroundColor: design.background,
    color: design.ink,
    "--theme-accent": design.accent,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`relative flex aspect-[1.55/1] w-full flex-col justify-between overflow-hidden rounded-lg border border-black/5 p-2.5 ${className}`}
      style={style}
    >
      <span
        className="absolute -right-3 -top-4 text-5xl leading-none opacity-15"
        style={{ color: design.accent }}
      >
        {design.mark}
      </span>
      <span className="relative text-lg leading-none" style={{ color: design.accent }}>
        {design.mark}
      </span>
      <span className="relative flex flex-col gap-1.5">
        <span className="h-1 w-3/4 rounded-full bg-current opacity-75" />
        <span className="h-1 w-1/2 rounded-full bg-[var(--theme-accent)] opacity-90" />
      </span>
    </div>
  );
}
