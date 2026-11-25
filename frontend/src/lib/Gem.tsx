import GemArt from "./GemArt";

/** The gem currency icon: a brilliant-cut blue gem (sized by the surrounding text unless `size` is given). */
export default function Gem({ size, className = "" }: { size?: number; className?: string }) {
  const s = size ? { width: size, height: size * 0.9 } : undefined;
  return (
    <span className={`gem-ico ${className}`} style={s} role="img" aria-label="gems">
      <GemArt glint={!!size && size >= 28} />
    </span>
  );
}
