const SIZING_MODES = new Set(["auto", "fixed"]);

const ALL_ALERTS_PRESENTATION_TOUCHED = Object.freeze({
  sizing: true,
  font: true,
  imageSize: true,
});

export function allAlertsPresentationTouched() {
  return ALL_ALERTS_PRESENTATION_TOUCHED;
}

function cloneSurfaces(surfaces) {
  const current = surfaces && typeof surfaces === "object" ? surfaces : {};
  const next = {};
  Object.keys(current).forEach(function (key) {
    const value = current[key];
    next[key] = value && typeof value === "object" ? Object.assign({}, value) : value;
  });
  return next;
}

export function normalizeAlertsSurfaceOverride(value) {
  const raw = value && typeof value === "object" ? value : {};
  const next = {};
  if (raw.sizing_mode === "auto" || raw.sizing_mode === "fixed") {
    next.sizing_mode = raw.sizing_mode;
  }
  if (typeof raw.font_size_px === "number" && raw.font_size_px >= 12 && raw.font_size_px <= 48) {
    next.font_size_px = raw.font_size_px;
  }
  if (typeof raw.image_size_pct === "number" && raw.image_size_pct >= 25 && raw.image_size_pct <= 300 && raw.image_size_pct !== 100) {
    next.image_size_pct = raw.image_size_pct;
  }
  return next;
}

export function resolveAlertsFormValues(value, inheritedFontSizePx) {
  const raw = value && typeof value === "object" ? value : {};
  const sizingMode = SIZING_MODES.has(raw.sizing_mode)
    ? raw.sizing_mode
    : typeof raw.font_size_px === "number"
      ? "fixed"
      : "auto";
  return {
    sizing_mode: sizingMode,
    font_size_px:
      typeof raw.font_size_px === "number" && raw.font_size_px >= 12 && raw.font_size_px <= 48
        ? raw.font_size_px
        : inheritedFontSizePx,
    image_size_pct:
      typeof raw.image_size_pct === "number" && raw.image_size_pct >= 25 && raw.image_size_pct <= 300
        ? raw.image_size_pct
        : 100,
  };
}

export function withAlertsPresentation(surfaces, values, touched) {
  const next = cloneSurfaces(surfaces);
  const alerts = next.alerts && typeof next.alerts === "object" ? Object.assign({}, next.alerts) : {};
  const state = touched && typeof touched === "object" ? touched : {};
  const form = values && typeof values === "object" ? values : {};

  if (state.sizing || state.font) {
    if (form.sizing_mode === "fixed") {
      alerts.sizing_mode = "fixed";
      if (Number.isFinite(form.font_size_px)) {
        alerts.font_size_px = form.font_size_px;
      }
    } else {
      delete alerts.sizing_mode;
      if (
        Number.isFinite(form.font_size_px) &&
        Number.isFinite(form.inherited_font_size_px) &&
        form.font_size_px !== form.inherited_font_size_px
      ) {
        alerts.font_size_px = form.font_size_px;
      } else {
        delete alerts.font_size_px;
      }
    }
  }

  if (state.imageSize) {
    if (Number.isFinite(form.image_size_pct) && form.image_size_pct !== 100) {
      alerts.image_size_pct = form.image_size_pct;
    } else {
      delete alerts.image_size_pct;
    }
  }

  next.alerts = alerts;
  return next;
}

export function alertsPreviewQuery(values) {
  const form = values && typeof values === "object" ? values : {};
  const fixed = form.sizing_mode === "fixed";
  return {
    sizing_mode: fixed ? "fixed" : "auto",
    font_size_px: fixed ? String(form.font_size_px) : undefined,
    base_font_size_px: fixed ? undefined : String(form.font_size_px),
    image_size_pct: String(form.image_size_pct),
  };
}
