function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function safeImageURL(value) {
  const candidate = text(value);
  return candidate.startsWith("http://") || candidate.startsWith("https://") ? candidate : "";
}

export function alertRenderModel(alert) {
  const name = text(alert && alert.name) || "Viewer";
  const points = Number(alert && alert.points);
  if (alert && alert.source === "award") {
    return {
      kind: "award",
      awardName: text(alert.award_name) || "Award",
      name,
      points: Number.isFinite(points) && points > 0 ? "+" + String(points) : "",
      quote: text(alert.message_text),
      avatarURL: safeImageURL(alert.avatar_url),
    };
  }
  return {
    kind: "command",
    name,
    text: typeof (alert && alert.text) === "string" ? alert.text : "",
    avatarURL: safeImageURL(alert && alert.avatar_url),
  };
}

export function renderAvatar(documentRef, name, avatarURL) {
  if (avatarURL) {
    const avatar = documentRef.createElement("img");
    avatar.className = "alert-avatar";
    avatar.src = avatarURL;
    avatar.alt = "";
    avatar.loading = "eager";
    avatar.referrerPolicy = "no-referrer";
    avatar.addEventListener(
      "error",
      function () {
        avatar.replaceWith(renderAvatar(documentRef, name, ""));
      },
      { once: true }
    );
    return avatar;
  }

  const placeholder = documentRef.createElement("div");
  placeholder.className = "alert-avatar alert-avatar--placeholder";
  placeholder.textContent = name.charAt(0).toUpperCase();
  return placeholder;
}

function appendTextElement(documentRef, parent, tagName, className, value) {
  const element = documentRef.createElement(tagName);
  element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

/** Builds all untrusted alert copy through textContent, never HTML parsing. */
export function createAlertSplash(documentRef, alert, options = {}) {
  const model = alertRenderModel(alert);
  const splash = documentRef.createElement("article");
  splash.className = "alert-splash alert-splash--" + model.kind;
  if (options.reducedMotion) {
    splash.classList.add("alert-splash--reduced");
  }
  if (typeof options.userAccent === "function") {
    splash.style.setProperty("--message-accent", options.userAccent(model.name));
  }

  splash.append(renderAvatar(documentRef, model.name, model.avatarURL));
  const accent = documentRef.createElement("span");
  accent.className = "alert-accent";
  accent.setAttribute("aria-hidden", "true");
  splash.append(accent);

  const content = documentRef.createElement("div");
  content.className = "alert-content";
  if (model.kind === "award") {
    appendTextElement(documentRef, content, "p", "alert-award-name", model.awardName);
    const viewer = appendTextElement(documentRef, content, "p", "alert-award-viewer", model.name);
    if (model.points) {
      appendTextElement(documentRef, viewer, "span", "alert-points", model.points);
    }
    if (model.quote) {
      appendTextElement(documentRef, content, "blockquote", "alert-quote", model.quote);
    }
  } else {
    appendTextElement(documentRef, content, "p", "alert-text", model.text);
  }
  splash.append(content);
  return splash;
}
