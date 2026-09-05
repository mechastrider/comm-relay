## MODIFIED Requirements

### Requirement: Catalog editors expose templates, media, and layout
Command and award editors SHALL show the available template variables `{viewer}`, `{streamer}`, `{points}`, and `{message}`, insert the chosen variable into the splash field on activation, and show a preview that substitutes sample viewer `Alice`, the current `streamer_display_name` or a localized sample streamer name when empty, sample points, and a short sample message. The image area SHALL preview the effective alert graphic: the source-appropriate built-in emblem when no file is selected and the custom image after upload. Its localized helper text MUST explain that clearing a custom image restores the built-in graphic. Image upload SHALL use `kind` `alert_image` and offer a clear action. Sound SHALL keep the built-in select plus an optional custom file using `kind` `alert_sound`, a Play/Stop preview, and a volume control 0–100. Layout SHALL be a choice of card, banner, or fullscreen. Image fit SHALL be a choice of cover, contain, fill, or tile. Image size SHALL be a slider from 25–300 percent that scales the built-in or custom primary graphic inside the alert frame. File inputs MUST remain keyboard reachable and labeled, MUST expose a visible focus indicator, and dynamic field errors MUST be associated with their controls. Newly uploaded files SHALL be treated as provisional until save; clear, replacement, catalog navigation, normal page unload, and item deletion SHALL request reference-safe cleanup through the overlay-asset delete action. On a stacked narrow layout, pointer selection of a catalog item SHALL reveal the editor while list keyboard navigation SHALL retain focus in the list.

#### Scenario: Insert viewer variable
- **WHEN** the operator activates `{viewer}` in the command editor
- **THEN** `{viewer}` is inserted into the splash template field

#### Scenario: Preview uses streamer name
- **WHEN** `streamer_display_name` is `Jake` and the template contains `{streamer}`
- **THEN** the editor preview contains `Jake`

#### Scenario: Command preview has no custom file
- **WHEN** the operator edits command `gg` without an uploaded image
- **THEN** the image area previews the stable `gg` built-in command signal

#### Scenario: Award preview has no custom file
- **WHEN** the operator edits award `spotter` without an uploaded image
- **THEN** the image area previews the stable Spotter medal

#### Scenario: Clear custom image
- **WHEN** the operator clears a saved or provisional custom image
- **THEN** the image area immediately returns to the effective built-in graphic

#### Scenario: Clear an unsaved upload
- **WHEN** the operator uploads an image and clears it before saving the catalog item
- **THEN** the editor requests deletion of the provisional filename and the server deletes it only when no other record references it

#### Scenario: Select an award on a narrow screen
- **WHEN** the operator uses a pointer to select an award while the catalog columns are stacked
- **THEN** the editor header and fields are brought into the viewport
