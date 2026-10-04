import { t } from "./i18n.js";

export const LEVEL_EMBLEMS = ["shield", "chevron_1", "chevron_2", "chevron_3", "star", "laurel"];
const shield = "M4 4 14 1l10 3v15c0 5-10 11-10 11S4 24 4 19Z";
const star = "m14 7 2.2 5 5.3.5-4 3.6 1.2 5.2-4.7-2.8-4.7 2.8 1.2-5.2-4-3.6 5.3-.5Z";
const emblems = {
  shield: [shield],
  chevron_1: [shield, "m8 17 6-5 6 5"],
  chevron_2: [shield, "m8 14 6-5 6 5m-12 6 6-5 6 5"],
  chevron_3: [shield, "m8 11 6-5 6 5m-12 6 6-5 6 5m-12 6 6-5 6 5"],
  star: [shield, star],
  laurel: [shield, star, "M5 27Q0 21 2 11m21 16q5-6 3-16M2 18l3 2m21-2-3 2M3 23l3 1m19-1-3 1"],
};
const paths = {
  like: ["M20.5 5.5a5 5 0 0 0-8.5 3 5 5 0 0 0-8.5-3C-1 10 6 16 12 21c6-5 13-11 8.5-15.5Z"],
  buff: ["m14 2-10 12h7l-1 8L21 9h-8Z"],
  magazine: ["M5 3h14v12l-3 6H7l-2-6Z M9 7v7 M12 7v7 M15 7v7 M7 18h10"],
};
function svg(lines, viewBox = "0 0 24 24") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.setAttribute("viewBox", viewBox);
  node.setAttribute("aria-hidden", "true");
  for (const d of lines) {
    const path = document.createElementNS(node.namespaceURI, "path");
    path.setAttribute("d", d);
    node.append(path);
  }
  return node;
}

export function createLevelBadge(level, translate = t) {
  if (!level || !level.title) return null;
  const emblem = LEVEL_EMBLEMS.includes(level.emblem) ? level.emblem : "shield";
  const badge = document.createElement("span");
  badge.className = "viewer-level-badge viewer-level-badge--" + emblem;
  const label = translate("viewerVisual.level", { title: String(level.title) });
  badge.setAttribute("role", "img");
  badge.setAttribute("aria-label", label);
  badge.title = label;
  badge.append(svg(emblems[emblem], "0 0 28 32"));
  return badge;
}

export function createAmmo(kind, value, exact = false, translate = t) {
  if (!paths[kind] || !value || !Number.isInteger(value.capacity) || !Number.isInteger(value.remaining)) return null;
  const capacity = Math.max(0, Math.min(100, value.capacity));
  const remaining = Math.max(0, Math.min(capacity, value.remaining));
  if (capacity === 0 && !exact) return null;
  const node = document.createElement("span");
  node.className = "viewer-ammo viewer-ammo--" + kind + (remaining === 0 ? " viewer-ammo--empty" : "");
  const label = translate(capacity === 0 ? "viewerVisual.unavailable" : "viewerVisual.remaining", { action: kind === "like" ? "Like" : "Buff", remaining, capacity });
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", label);
  node.title = label;
  node.append(svg(paths[kind]));
  if (capacity > 8) {
    node.append(svg(paths.magazine));
  } else {
    const rounds = document.createElement("span");
    rounds.className = "viewer-ammo__rounds";
    rounds.setAttribute("aria-hidden", "true");
    for (let i = 0; i < capacity; i++) {
      const round = document.createElement("span");
      round.className = "viewer-ammo__round" + (i < remaining ? " viewer-ammo__round--loaded" : "");
      rounds.append(round);
    }
    node.append(rounds);
  }
  if (exact || capacity > 8 || remaining === 0) {
    const count = document.createElement("span");
    count.className = "viewer-ammo__count";
    count.setAttribute("aria-hidden", "true");
    count.textContent = capacity === 0 ? translate("viewerVisual.disabled") : remaining + " / " + capacity;
    node.append(count);
  }
  return node;
}

export function createAmmoRow(status, exact = false, translate = t) {
  const row = document.createElement("span");
  row.className = "viewer-ammo-row";
  for (const kind of ["like", "buff"]) {
    const ammo = createAmmo(kind, status && status[kind], exact, translate);
    if (ammo) row.append(ammo);
  }
  return row.childElementCount ? row : null;
}

export function visualIdentityKey(identity) {
  return identity && identity.platform && identity.user_id
    ? JSON.stringify([identity.platform, identity.user_id]) : "";
}

// Synthetic data is used only on isolated preview/debug pages.
export function sampleVisualStatus(index = 0) {
  const samples = [
    { title: "Recruit", emblem: "chevron_1", capacity: 1, like: 1, buff: 1 },
    { title: "Veteran", emblem: "chevron_3", capacity: 3, like: 0, buff: 2 },
    { title: "Legend", emblem: "laurel", capacity: 100, like: 73, buff: 8 },
    { title: "Elite", emblem: "star", capacity: 5, like: 3, buff: 2 },
  ];
  const value = samples[index % samples.length];
  return { level: { title: value.title, emblem: value.emblem }, like: { remaining: value.like, capacity: value.capacity }, buff: { remaining: value.buff, capacity: value.capacity } };
}
