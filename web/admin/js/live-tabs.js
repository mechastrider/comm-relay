import * as dom from "./dom.js";
import { loadLiveLeaderboard, abortLiveLeaderboard } from "./live-leaderboard.js";
import { loadLiveStatistics, abortLiveStatistics } from "./live-statistics.js";

export const LIVE_TABS = ["messages", "leaderboard", "statistics"];

let currentTab = "messages";

function tabElements() {
  return [
    { id: "messages", tab: dom.liveMessagesTab, panel: dom.liveMessagesPanel },
    { id: "leaderboard", tab: dom.liveLeaderboardTab, panel: dom.liveLeaderboardPanel },
    { id: "statistics", tab: dom.liveStatisticsTab, panel: dom.liveStatisticsPanel },
  ];
}

function refreshActions(tab) {
  if (dom.refreshMessages) {
    dom.refreshMessages.hidden = tab !== "messages";
  }
  if (dom.refreshLeaderboard) {
    dom.refreshLeaderboard.hidden = tab !== "leaderboard";
  }
  if (dom.refreshStatistics) {
    dom.refreshStatistics.hidden = tab !== "statistics";
  }
}

function loadTabData(tab) {
  if (tab === "leaderboard") {
    loadLiveLeaderboard().catch(function () {
      /* region handles error */
    });
  } else if (tab === "statistics") {
    loadLiveStatistics().catch(function () {
      /* region handles error */
    });
  }
}

export function getLiveTab() {
  return currentTab;
}

export function setLiveTab(tab, options) {
  const next = LIVE_TABS.indexOf(tab) === -1 ? "messages" : tab;
  const previous = currentTab;
  currentTab = next;

  tabElements().forEach(function (item) {
    if (!item.tab || !item.panel) {
      return;
    }
    const selected = item.id === next;
    item.tab.setAttribute("aria-selected", selected ? "true" : "false");
    item.tab.tabIndex = selected ? 0 : -1;
    item.panel.hidden = !selected;
  });

  refreshActions(next);

  if (next === "leaderboard" && previous !== "leaderboard") {
    loadTabData("leaderboard");
  } else if (next === "statistics" && previous !== "statistics") {
    loadTabData("statistics");
  }

  if (previous !== next) {
    if (previous === "leaderboard") {
      abortLiveLeaderboard();
    } else if (previous === "statistics") {
      abortLiveStatistics();
    }
  }

  if (options && options.focusTab && tabElements().find(function (item) {
    return item.id === next;
  })?.tab) {
    const focused = tabElements().find(function (item) {
      return item.id === next;
    });
    if (focused && focused.tab) {
      focused.tab.focus();
    }
  }
}

export function initLiveTabs() {
  const tabs = tabElements().filter(function (item) {
    return item.tab;
  });
  if (tabs.length === 0) {
    return;
  }

  setLiveTab("messages", { focusTab: false });

  tabs.forEach(function (item) {
    item.tab.addEventListener("click", function () {
      setLiveTab(item.id, { focusTab: false });
    });
    item.tab.addEventListener("keydown", function (event) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) {
        return;
      }
      event.preventDefault();
      const ids = LIVE_TABS.slice();
      const currentIndex = Math.max(0, ids.indexOf(item.id));
      let nextIndex = currentIndex;
      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = ids.length - 1;
      } else if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % ids.length;
      } else {
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
      }
      setLiveTab(ids[nextIndex], { focusTab: true });
    });
  });

  window.addEventListener("admin-locale-applied", function () {
    if (currentTab === "leaderboard") {
      loadLiveLeaderboard().catch(function () {
        /* noop */
      });
    } else if (currentTab === "statistics") {
      loadLiveStatistics().catch(function () {
        /* noop */
      });
    }
  });
}
