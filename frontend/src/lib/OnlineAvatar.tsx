import type { ReactNode } from "react";
import { lastSeen, useOnlineMap } from "./presence";

/** A picture with a small green dot in its top-right corner while that member is really using the app (admin only). */
export default function OnlineAvatar({ id, children }: { id: string; children: ReactNode }) {
  const o = useOnlineMap()[id];
  return (
    <span className="onl-av">
      {children}
      {o?.online && <i className="onl-dot on onl-corner" role="img" aria-label="Online now" title="Online now" />}
      {o && !o.online && o.at && <i className="onl-dot onl-corner" role="img" aria-label={`Last seen ${lastSeen(o.at)}`} title={`Last seen ${lastSeen(o.at)}`} />}
    </span>
  );
}
