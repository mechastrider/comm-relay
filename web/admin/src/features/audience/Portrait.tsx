import { useState } from "react";
import { initialsForName, safeImageURL } from "../../../../shared/chat-render";
export function Portrait({
  url,
  name,
  className,
}: {
  url?: string;
  name: string;
  className: string;
}) {
  const [failed, setFailed] = useState("");
  const safe = safeImageURL(url);
  return (
    <span className={className}>
      {safe && failed !== safe ? (
        <img
          className={className + "__img"}
          src={safe}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={() => setFailed(safe)}
        />
      ) : (
        <span className={className + "__initials"} aria-hidden="true">
          {initialsForName(name)}
        </span>
      )}
    </span>
  );
}
