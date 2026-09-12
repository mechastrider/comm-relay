-- +goose Up
ALTER TABLE interaction_events ADD COLUMN command_id TEXT NULL;

-- A legacy trigger is only safe to adopt when it still resolves to the one
-- current command with that trigger. Deleted and renamed commands intentionally
-- remain NULL: their journal history stays intact but cannot be attributed to
-- a stable catalog id retroactively.
UPDATE interaction_events
SET command_id = (
    SELECT commands.id
    FROM commands
    WHERE commands.trigger = interaction_events.command_trigger
)
WHERE kind = 'command'
  AND command_id IS NULL
  AND command_trigger IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM commands
      WHERE commands.trigger = interaction_events.command_trigger
  );

DROP INDEX IF EXISTS idx_interaction_events_viewer_command_progression;
CREATE INDEX idx_interaction_events_viewer_command_progression
ON interaction_events(viewer_id, kind, command_id);

-- +goose Down
DROP INDEX IF EXISTS idx_interaction_events_viewer_command_progression;
CREATE INDEX idx_interaction_events_viewer_command_progression
ON interaction_events(viewer_id, kind, command_trigger);
ALTER TABLE interaction_events DROP COLUMN command_id;
