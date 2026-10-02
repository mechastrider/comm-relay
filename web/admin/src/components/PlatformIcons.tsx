import { useLocale } from "../app/locale";
function Glyph({ name }: { name: string }) {
  return (
    <svg
      className="platform-icon__glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {name === "youtube" ? (
        <>
          <rect x="3" y="6" width="18" height="12" rx="3" fill="currentColor" />
          <path d="M10 9.2v5.6L15 12z" fill="currentColor" />
        </>
      ) : name === "twitch" ? (
        <>
          <path d="M5 4h16v11.5L16.5 20H12l-3 3v-3H5z" fill="currentColor" />
          <rect x="10" y="8" width="2" height="5" rx=".5" fill="currentColor" />
          <rect x="15" y="8" width="2" height="5" rx=".5" fill="currentColor" />
        </>
      ) : name === "vk" ? (
        <>
          <path
            d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
            fill="currentColor"
          />
          <text
            x="12"
            y="15"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="currentColor"
          >
            VK
          </text>
        </>
      ) : (
        <>
          <path
            d="M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
            fill="currentColor"
          />
          <path d="M8 11h8v2H8z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
export function PlatformIcons({ platforms }: { platforms: string[] }) {
  const { t } = useLocale();
  return (
    <div className="audience-viewers-table__platform-icons">
      {platforms.length ? (
        platforms.map((platform) => {
          const name = platform.trim().toLowerCase(),
            key = "platform." + platform,
            label = t(key) === key ? platform : t(key);
          return (
            <span
              key={platform}
              className="platform-icon-wrap platform-icon has-tooltip"
              data-platform={name}
              role="img"
              aria-label={label}
            >
              <Glyph name={name} />
              <span
                className="ui-tooltip platform-icon__tooltip"
                role="tooltip"
              >
                {label}
              </span>
            </span>
          );
        })
      ) : (
        <span className="audience-viewers-table__platforms-empty">
          {t("audience.platformsEmpty")}
        </span>
      )}
    </div>
  );
}
