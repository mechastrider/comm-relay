## ADDED Requirements

### Requirement: Automatic desktop message notification audio
The desktop application SHALL prepare enabled message notification audio without requiring an initial click or Test action. It SHALL preserve existing presets, volume and enabled settings, use one playback destination per admin document, and never replay historical or missed notifications after activation. Browser-only admin SHALL retain browser-policy-dependent playback and interaction recovery.

#### Scenario: Cold desktop start
- **WHEN** the desktop application has loaded the admin and audio is ready, and a new message arrives with message sound enabled
- **THEN** its configured notification plays without prior operator interaction

#### Scenario: Quiet settings and missed notifications
- **WHEN** message sound is disabled, volume is zero, or a notification arrives before audio is ready
- **THEN** no notification plays
- **AND** later activation does not replay that notification

#### Scenario: Desktop audio trust boundary
- **WHEN** another origin, a preview frame, or a malformed request asks the shell to play a tone
- **THEN** the shell rejects the request without playback or arbitrary script execution

#### Scenario: Browser and Test compatibility
- **WHEN** the operator tests a selected preset or opens admin in a standalone browser
- **THEN** Test preserves the selected tone and volume and browser audio retains user-interaction recovery
