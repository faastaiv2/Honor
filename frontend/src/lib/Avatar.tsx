/** A member's picture: the emoji they chose, or a plain person silhouette. Never initials. */
export default function Avatar({ avatar, color, size = 48 }: { avatar?: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: avatar ? `color-mix(in srgb, ${color} 18%, #fff)` : color, fontSize: size * 0.55 }} aria-hidden="true">
      {avatar || (
        <svg viewBox="0 0 40 40" width="78%" height="78%">
          <circle cx="20" cy="14" r="8" fill="#fff" />
          <path d="M5 40c0-9 6.7-15 15-15s15 6 15 15z" fill="#fff" />
        </svg>
      )}
    </span>
  );
}
