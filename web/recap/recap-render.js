import { createChatRender } from "/shared/chat-render.js?v=12";
import { t } from "/shared/i18n.js?v=18";
import { RECAP_WINDOW_ALL, recapContentLayout } from "./recap-model.js?v=2";

const renderer = createChatRender({ avatarFallback: "detailed" });

function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (value !== undefined) {
    element.textContent = String(value);
  }
  return element;
}

function portrait(identity, url, className) {
  const image = renderer.buildAvatarImage({ display_name: identity, avatar_url: url });
  image.className = className;
  return image;
}

function metric(label, value) {
  const item = node("div", "recap-total");
  item.append(node("strong", "recap-total__value", value), node("span", "recap-total__label", label));
  return item;
}

function ranking(snapshot) {
  const section = node("section", "recap-section recap-section--ranking");
  section.appendChild(node("h2", "recap-section__heading", t("recap.overlayTopViewers")));
  const list = node("ol", "recap-ranking");
  snapshot.ranking.forEach(function (entry) {
    const row = node("li", "recap-ranking__row");
    const identity = node("div", "recap-ranking__identity");
    const displayName = entry.display_name || t("recap.overlayAnonymousViewer");
    identity.append(
      node("span", "recap-ranking__rank", "#" + entry.rank),
      portrait(displayName, entry.portrait_url, "recap-portrait recap-portrait--ranking")
    );
    const name = node("div", "recap-ranking__name");
    name.appendChild(node("strong", "recap-ranking__display-name", displayName));
    if (entry.title) {
      name.appendChild(node("span", "recap-ranking__title", entry.title));
    }
    const stats = node("div", "recap-ranking__stats");
    stats.append(
      node("strong", "", entry.xp + " XP"),
      node("span", "", t("recap.overlayMessageCount", { count: entry.message_count }))
    );
    row.append(identity, name, stats);
    list.appendChild(row);
  });
  section.appendChild(list);
  return section;
}

function achievements(snapshot) {
  const section = node("section", "recap-section recap-section--achievements");
  section.appendChild(node("h2", "recap-section__heading", t("recap.overlayAchievements")));
  const list = node("div", "recap-achievements");
  snapshot.achievement_groups.forEach(function (group) {
    const card = node("article", "recap-achievement");
    const viewerName = group.viewer_display_name || t("recap.overlayAnonymousViewer");
    card.appendChild(portrait(viewerName, group.viewer_portrait_url, "recap-portrait recap-portrait--achievement"));
    const copy = node("div", "recap-achievement__copy");
    copy.appendChild(node("strong", "recap-achievement__name", group.name || t("recap.overlayUnnamedAchievement")));
    copy.appendChild(node("span", "recap-achievement__viewer", viewerName));
    if (group.description) {
      copy.appendChild(node("p", "recap-achievement__description", group.description));
    }
    card.appendChild(copy);
    if (group.count > 1) {
      card.appendChild(node("span", "recap-achievement__count", "×" + group.count));
    }
    list.appendChild(card);
  });
  section.appendChild(list);
  return section;
}

export function renderRecap(root, snapshot, window) {
  const recapWindow = window === RECAP_WINDOW_ALL ? RECAP_WINDOW_ALL : "session";
  const allTime = recapWindow === RECAP_WINDOW_ALL;
  root.textContent = "";
  const recap = node("main", "recap");
  const header = node("header", "recap-header");
  header.append(
    node("p", "recap-kicker", t(allTime ? "recap.overlayAllTimeKicker" : "recap.overlayKicker")),
    node("h1", "recap-title", t(allTime ? "recap.overlayAllTimeTitle" : "recap.overlayTitle"))
  );
  const totals = node("div", "recap-totals");
  totals.append(
    metric(t("recap.overlayViewers"), snapshot.totals.viewer_count),
    metric(t("recap.overlayMessages"), snapshot.totals.message_count),
    metric(t(allTime ? "recap.overlayAllTimeXP" : "recap.overlaySessionXP"), snapshot.totals.xp)
  );
  header.appendChild(totals);
  recap.appendChild(header);
  const content = node("div", "recap-content");
  const layout = recapContentLayout(snapshot, recapWindow);
  content.classList.add("recap-content--" + layout);
  if (snapshot.ranking.length > 0) {
    content.appendChild(ranking(snapshot));
  }
  if (!allTime && snapshot.achievement_groups.length > 0) {
    content.appendChild(achievements(snapshot));
  }
  if (layout !== "empty") {
    recap.appendChild(content);
  }
  root.appendChild(recap);
}
