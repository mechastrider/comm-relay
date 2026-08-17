import { translatePlatformState } from "/shared/i18n.js?v=16";
import * as dom from "./dom.js";
import { t, rememberStreamsPayload } from "./i18n-ui.js";

const EM_DASH = "—";

const COLUMN_DEFS = [
  {
    capability: "viewers",
    render: (platform) => formatViewers(platform.viewers && platform.viewers.current),
    fallback: () => EM_DASH,
  },
  {
    capability: "stream_metadata",
    render: (platform) => translateStreamState(platform.state),
    fallback: (platform) => translateStreamState(platform.state),
  },
  {
    capability: "chat_health",
    render: (platform) => translatePlatformState(platform.chat && platform.chat.state),
    fallback: () => EM_DASH,
  },
];

function hasCapability(platform, capability) {
  const caps = platform.capabilities;
  if (!Array.isArray(caps)) {
    return false;
  }
  return caps.indexOf(capability) !== -1;
}

function columnValue(platform, column) {
  if (hasCapability(platform, column.capability)) {
    return column.render(platform);
  }
  return column.fallback(platform);
}

function formatViewers(value) {
  if (typeof value !== "number") {
    return EM_DASH;
  }
  return String(value);
}

function translateStreamState(state) {
  const key = "stream." + String(state || "unknown");
  const translated = t(key);
  return translated !== key ? translated : String(state || "unknown");
}

function platformLabel(platformId) {
  const key = "streams.platform." + platformId;
  const translated = t(key);
  return translated !== key ? translated : platformId;
}

function stateClass(state) {
  const normalized = String(state || "unknown").toLowerCase();
  if (normalized === "unknown" || normalized === "offline") {
    return "streams-strip__cell--muted";
  }
  return "";
}

export function renderStreamStatus(payload) {
  if (!dom.streamsStrip) {
    return;
  }
  rememberStreamsPayload(payload);

  dom.streamsStrip.replaceChildren();
  const platforms = payload && Array.isArray(payload.platforms) ? payload.platforms : [];

  platforms.forEach(function (platform) {
    const row = document.createElement("div");
    row.className = "streams-strip__row";

    const name = document.createElement("span");
    name.className = "streams-strip__name";
    name.textContent = platformLabel(platform.platform);
    row.appendChild(name);

    COLUMN_DEFS.forEach(function (column, index) {
      const cell = document.createElement("span");
      cell.className = "streams-strip__cell";
      if (index === 1) {
        const extra = stateClass(platform.state);
        if (extra) {
          cell.className += " " + extra;
        }
      }
      cell.textContent = columnValue(platform, column);
      row.appendChild(cell);
    });

    dom.streamsStrip.appendChild(row);
  });

  const totalRow = document.createElement("div");
  totalRow.className = "streams-strip__row streams-strip__row--total";

  const totalLabel = document.createElement("span");
  totalLabel.className = "streams-strip__name";
  totalLabel.textContent = t("streams.total");
  totalRow.appendChild(totalLabel);

  const totalViewers = document.createElement("span");
  totalViewers.className = "streams-strip__cell";
  const totalCurrent =
    payload && payload.viewers_total ? payload.viewers_total.current : null;
  totalViewers.textContent = formatViewers(totalCurrent);
  totalRow.appendChild(totalViewers);

  const totalStream = document.createElement("span");
  totalStream.className = "streams-strip__cell streams-strip__cell--muted";
  totalStream.textContent = EM_DASH;
  totalRow.appendChild(totalStream);

  const totalChat = document.createElement("span");
  totalChat.className = "streams-strip__cell streams-strip__cell--muted";
  totalChat.textContent = EM_DASH;
  totalRow.appendChild(totalChat);

  dom.streamsStrip.appendChild(totalRow);

  if (dom.streamsTotalCaption) {
    dom.streamsTotalCaption.textContent = t("streams.totalCaption");
  }
}
