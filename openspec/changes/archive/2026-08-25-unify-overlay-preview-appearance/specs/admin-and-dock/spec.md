## ADDED Requirements

### Requirement: Appearance preview offers a shared backdrop set
The OBS Appearance preview SHALL let the operator choose a backdrop from white, checkerboard, game footage, and black. Labels MUST describe contrast purpose (not an uploaded OBS scene). The preview iframe MUST pass the matching `preview_background` query value. Stored preference `busy` MUST map to game footage.

#### Scenario: Backdrop options
- **WHEN** the operator opens the overlay appearance preview background control
- **THEN** the options are white, checkerboard, game footage, and black, in that order

#### Scenario: Restored busy preference
- **WHEN** a previously stored preview background value is `busy`
- **THEN** the control shows game footage and the iframe uses `preview_background=scene`
