/** A member's square picture: their chosen emoji, or their initials on a tinted tile. */
export default function Avatar({ avatar, code, color, size = 48 }: { avatar?: string; code: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 22%, #fff)`, fontSize: avatar ? size * 0.55 : size * 0.38 }} aria-hidden="true">
      {avatar || code}
    </span>
  );
}
