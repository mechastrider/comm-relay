-- +goose Up
ALTER TABLE interaction_events ADD COLUMN reward_name TEXT NULL;

-- Existing application timestamps are UTC RFC3339 values. Canonicalize their
-- spelling before using SQLite text ordering for keyset pagination.
UPDATE interaction_events
SET created_at = CASE
    WHEN substr(created_at, 20, 1) = 'Z'
        THEN substr(created_at, 1, 19) || '.000000000Z'
    ELSE substr(created_at, 1, 20) ||
        substr(substr(created_at, 21, length(created_at) - 21) || '000000000', 1, 9) ||
        'Z'
END
WHERE substr(created_at, -1, 1) = 'Z'
  AND substr(created_at, 20, 1) IN ('Z', '.');

UPDATE interaction_events
SET reward_name = COALESCE(
    NULLIF(trim((SELECT name FROM award_types WHERE award_types.id = interaction_events.award_id)), ''),
    award_id
)
WHERE kind = 'award';

-- Keep databases readable when an older binary is run after this additive
-- migration. That binary names its INSERT columns, so it neither supplies the
-- new snapshot column nor uses the canonical fixed-width event timestamp.
-- +goose StatementBegin
CREATE TRIGGER trg_interaction_events_reward_history_compat
AFTER INSERT ON interaction_events
FOR EACH ROW
BEGIN
    UPDATE interaction_events
    SET created_at = CASE
            WHEN substr(NEW.created_at, 20, 1) = 'Z'
                THEN substr(NEW.created_at, 1, 19) || '.000000000Z'
            WHEN substr(NEW.created_at, -1, 1) = 'Z'
                AND substr(NEW.created_at, 20, 1) = '.'
                THEN substr(NEW.created_at, 1, 20) ||
                    substr(substr(NEW.created_at, 21, length(NEW.created_at) - 21) || '000000000', 1, 9) ||
                    'Z'
            ELSE NEW.created_at
        END,
        reward_name = CASE
            WHEN NEW.kind = 'award' AND NULLIF(trim(NEW.reward_name), '') IS NULL
                THEN COALESCE(
                    NULLIF(trim((SELECT name FROM award_types WHERE award_types.id = NEW.award_id)), ''),
                    NULLIF(trim(NEW.award_id), '')
                )
            ELSE NEW.reward_name
        END
    WHERE id = NEW.id;
END;
-- +goose StatementEnd

CREATE INDEX idx_interaction_events_reward_history
ON interaction_events(kind, created_at DESC, id DESC);

CREATE INDEX idx_interaction_events_viewer_reward_history
ON interaction_events(viewer_id, kind, created_at DESC, id DESC);

-- +goose Down
DROP TRIGGER IF EXISTS trg_interaction_events_reward_history_compat;
DROP INDEX IF EXISTS idx_interaction_events_viewer_reward_history;
DROP INDEX IF EXISTS idx_interaction_events_reward_history;
ALTER TABLE interaction_events DROP COLUMN reward_name;
