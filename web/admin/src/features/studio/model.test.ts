import { describe, expect, it } from "vitest";
import {
  changeField,
  fieldsFor,
  normalizePreset,
  previewURL,
  resetGroup,
  validationTarget,
  resetFields,
} from "./model";
describe("Studio persisted overrides", () => {
  it("shows inherited values without persisting untouched surface defaults", () => {
    const preset = normalizePreset({
      font_size_px: 24,
      theme: "cockpit_panel",
    });
    expect(fieldsFor(preset, "recap")["overlay-panel-opacity"]).not.toBe("");
    const edited = changeField(preset, "recap", "overlay-line-height", "1.5");
    expect(edited.surfaces).toEqual({});
    expect(
      new URL(
        previewURL(edited, "recap", "sample", "scene", "en-GB", "session"),
      ).searchParams.has("panel_opacity"),
    ).toBe(false);
  });
  it("isolates opacity by surface and keeps it when resetting leaderboard presentation", () => {
    let preset = normalizePreset({});
    preset = changeField(preset, "chat", "overlay-panel-opacity", "0.2");
    preset = changeField(preset, "leaderboard", "overlay-panel-opacity", "0.7");
    preset = changeField(
      preset,
      "leaderboard",
      "overlay-leaderboard-title-mode",
      "custom",
    );
    preset = changeField(
      preset,
      "leaderboard",
      "overlay-leaderboard-title",
      "Winners",
    );
    expect(preset.surfaces.leaderboard.title).toBe("Winners");
    const reset = resetGroup(preset, "leaderboard", "leaderboard");
    expect(reset.surfaces).toEqual({
      chat: { panel_opacity: 0.2 },
      leaderboard: { panel_opacity: 0.7 },
    });
  });
  it("changes only edited presentation fields and serializes correct alert sizing", () => {
    const preset = normalizePreset({ font_size_px: 24 });
    const next = changeField(
      preset,
      "alerts",
      "overlay-alerts-font-size",
      "32",
    );
    expect(next.surfaces.alerts).toEqual({
      font_size_px: 32,
      sizing_mode: "auto",
    });
    const url = new URL(
      previewURL(next, "alerts", "sample", "scene", "en-GB", "session"),
    );
    expect(url.searchParams.get("sizing_mode")).toBe("auto");
    expect(url.searchParams.get("base_font_size_px")).toBe("32");
    expect(preset.surfaces).toEqual({});
  });
});

it("maps errors from another preset and surface to the visible control", () => {
  const presets = [normalizePreset({ id: "a" }), normalizePreset({ id: "b" })];
  expect(
    validationTarget(
      "overlay_preset_1_surfaces_leaderboard_font_size_px",
      presets,
      "chat",
    ),
  ).toEqual({
    preset: "b",
    surface: "leaderboard",
    field: "overlay-leaderboard-font-size",
  });
  expect(
    validationTarget(
      "overlay_preset_0_surfaces_recap_panel_opacity",
      presets,
      "chat",
    ),
  ).toEqual({ preset: "a", surface: "recap", field: "overlay-panel-opacity" });
  expect(resetFields("text")).not.toContain("overlay-panel-opacity");
});
