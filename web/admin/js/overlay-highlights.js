import { t } from "./i18n-ui.js";
import { apiURL } from "./api.js";

let words = [];
let highlightsEnabled = false;
let people = [];
let bound = false;

function newID(prefix) {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return (
    prefix +
    "_" +
    Array.from(bytes)
      .map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      })
      .join("")
  );
}

function requestPreviewRefresh() {
  document.dispatchEvent(new Event("overlay-preview-refresh"));
}

function identityUsername(person, platform) {
  const identities = Array.isArray(person.identities) ? person.identities : [];
  const found = identities.find(function (identity) {
    return identity.platform === platform;
  });
  return found ? found.username : "";
}

function setIdentity(person, platform, username) {
  const trimmed = String(username || "").trim();
  const identities = Array.isArray(person.identities) ? person.identities.slice() : [];
  const index = identities.findIndex(function (identity) {
    return identity.platform === platform;
  });
  if (trimmed === "") {
    person.identities = identities.filter(function (identity) {
      return identity.platform !== platform;
    });
    return;
  }
  if (index === -1) {
    identities.push({ platform: platform, username: trimmed });
  } else {
    identities[index] = { platform: platform, username: trimmed };
  }
  person.identities = identities;
}

function renderWords() {
  const list = document.getElementById("overlay-highlight-words");
  if (!list) {
    return;
  }
  list.innerHTML = "";
  words.forEach(function (word, index) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = word;
    chip.setAttribute("aria-label", t("obs.removeWord", { word: word }));
    chip.addEventListener("click", function () {
      words.splice(index, 1);
      renderWords();
      requestPreviewRefresh();
    });
    list.appendChild(chip);
  });
}

function renderPeople() {
  const list = document.getElementById("overlay-people-list");
  if (!list) {
    return;
  }
  list.innerHTML = "";
  people.forEach(function (person, index) {
    const row = document.createElement("div");
    row.className = "people-row";

    const icon = document.createElement("img");
    icon.className = "people-row__icon";
    icon.alt = "";
    icon.width = 24;
    icon.height = 24;
    icon.referrerPolicy = "no-referrer";
    if (person.icon) {
      icon.src = "/overlay/assets/" + encodeURIComponent(person.icon);
    }

    const iconInput = document.createElement("input");
    iconInput.type = "file";
    iconInput.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
    iconInput.className = "people-row__file";
    iconInput.setAttribute("aria-label", t("obs.personIcon"));
    iconInput.addEventListener("change", function () {
      if (iconInput.files && iconInput.files[0]) {
        uploadPersonIcon(index, iconInput.files[0]).catch(function () {
          /* keep previous icon */
        });
      }
    });

    const label = document.createElement("input");
    label.type = "text";
    label.value = person.label || "";
    label.placeholder = t("obs.personLabel");
    label.setAttribute("aria-label", t("obs.personLabel"));
    label.addEventListener("input", function () {
      people[index].label = label.value;
    });

    const twitch = document.createElement("input");
    twitch.type = "text";
    twitch.value = identityUsername(person, "twitch");
    twitch.placeholder = "Twitch";
    twitch.setAttribute("aria-label", "Twitch");
    twitch.addEventListener("input", function () {
      setIdentity(people[index], "twitch", twitch.value);
    });

    const youtube = document.createElement("input");
    youtube.type = "text";
    youtube.value = identityUsername(person, "youtube");
    youtube.placeholder = "YouTube";
    youtube.setAttribute("aria-label", "YouTube");
    youtube.addEventListener("input", function () {
      setIdentity(people[index], "youtube", youtube.value);
    });

    const vk = document.createElement("input");
    vk.type = "text";
    vk.value = identityUsername(person, "vk");
    vk.placeholder = "VK";
    vk.setAttribute("aria-label", "VK");
    vk.addEventListener("input", function () {
      setIdentity(people[index], "vk", vk.value);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn-physical btn-small";
    remove.textContent = t("obs.removePerson");
    remove.addEventListener("click", function () {
      people.splice(index, 1);
      renderPeople();
      requestPreviewRefresh();
    });

    row.appendChild(icon);
    row.appendChild(iconInput);
    row.appendChild(label);
    row.appendChild(twitch);
    row.appendChild(youtube);
    row.appendChild(vk);
    row.appendChild(remove);
    list.appendChild(row);
  });
}

async function uploadPersonIcon(index, file) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(apiURL("/api/overlay/assets/upload"), {
    method: "POST",
    body: body,
  });
  const payload = await response.json().catch(function () {
    return null;
  });
  if (!response.ok || !payload || !payload.filename) {
    throw new Error("upload failed");
  }
  people[index].icon = payload.filename;
  renderPeople();
  requestPreviewRefresh();
}

function addWord() {
  const input = document.getElementById("overlay-highlight-word-input");
  if (!input) {
    return;
  }
  const word = input.value.trim();
  if (
    word === "" ||
    words.some(function (item) {
      return item.toLowerCase() === word.toLowerCase();
    }) ||
    words.length >= 64
  ) {
    input.value = "";
    return;
  }
  words.push(word);
  input.value = "";
  renderWords();
  requestPreviewRefresh();
}

function addPerson() {
  if (people.length >= 64) {
    return;
  }
  people.push({
    id: newID("person"),
    label: "",
    icon: "",
    identities: [],
  });
  renderPeople();
}

export function applyOverlayHighlights(overlay) {
  const incoming = overlay && typeof overlay === "object" ? overlay : {};
  const highlights = incoming.highlights || {};
  highlightsEnabled = highlights.enabled === true;
  words = Array.isArray(highlights.words)
    ? highlights.words
        .map(function (word) {
          return String(word || "").trim();
        })
        .filter(Boolean)
    : [];
  people = Array.isArray(incoming.people)
    ? incoming.people.map(function (person) {
        return {
          id: person.id || newID("person"),
          label: person.label || "",
          icon: person.icon || "",
          identities: Array.isArray(person.identities) ? person.identities.slice() : [],
        };
      })
    : [];
  const enabled = document.getElementById("overlay-highlights-enabled");
  if (enabled) {
    enabled.checked = highlightsEnabled;
  }
  renderWords();
  renderPeople();
}

export function collectOverlayHighlights() {
  const enabled = document.getElementById("overlay-highlights-enabled");
  highlightsEnabled = Boolean(enabled && enabled.checked);
  return {
    highlights: {
      enabled: highlightsEnabled,
      words: words.slice(),
    },
    people: people
      .map(function (person) {
        return {
          id: person.id,
          label: String(person.label || "").trim(),
          icon: person.icon || "",
          identities: (person.identities || []).filter(function (identity) {
            return identity.platform && String(identity.username || "").trim() !== "";
          }),
        };
      })
      .filter(function (person) {
        return person.identities.length > 0;
      }),
  };
}

export function initOverlayHighlights() {
  if (bound) {
    return;
  }
  bound = true;
  const addWordButton = document.getElementById("overlay-highlight-word-add");
  const wordInput = document.getElementById("overlay-highlight-word-input");
  if (addWordButton) {
    addWordButton.addEventListener("click", addWord);
  }
  if (wordInput) {
    wordInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        addWord();
      }
    });
  }
  const enabled = document.getElementById("overlay-highlights-enabled");
  if (enabled) {
    enabled.addEventListener("change", requestPreviewRefresh);
  }
  const addPersonButton = document.getElementById("overlay-people-add");
  if (addPersonButton) {
    addPersonButton.addEventListener("click", addPerson);
  }
}
