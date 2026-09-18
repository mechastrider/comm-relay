-- +goose Up
ALTER TABLE commands ADD COLUMN points INTEGER NULL CHECK (points IS NULL OR (points BETWEEN 1 AND 1000));
ALTER TABLE commands ADD COLUMN award_id TEXT NULL;

ALTER TABLE progression_levels ADD COLUMN like_quota INTEGER NOT NULL DEFAULT 1 CHECK (like_quota BETWEEN 0 AND 100);
ALTER TABLE progression_levels ADD COLUMN buff_quota INTEGER NOT NULL DEFAULT 1 CHECK (buff_quota BETWEEN 0 AND 100);

UPDATE progression_levels SET like_quota = 1, buff_quota = 1 WHERE id = 'recruit';
UPDATE progression_levels SET like_quota = 2, buff_quota = 2 WHERE id = 'regular';
UPDATE progression_levels SET like_quota = 3, buff_quota = 3 WHERE id = 'veteran';
UPDATE progression_levels SET like_quota = 4, buff_quota = 4 WHERE id = 'elite';
UPDATE progression_levels SET like_quota = 5, buff_quota = 5 WHERE id = 'legend';

-- +goose StatementBegin
CREATE TABLE interaction_events_new (
    id TEXT NOT NULL PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('command', 'award', 'activity', 'buff')),
    contract_id TEXT NULL REFERENCES viewer_contracts(id),
    viewer_id TEXT NULL REFERENCES viewers(id),
    session_id TEXT NULL REFERENCES stream_sessions(id),
    command_id TEXT NULL,
    command_trigger TEXT NULL,
    award_id TEXT NULL,
    reward_name TEXT NULL,
    points INTEGER NOT NULL,
    message_platform TEXT NULL,
    message_id TEXT NULL,
    recipient_viewer_id TEXT NULL REFERENCES viewers(id),
    parent_event_id TEXT NULL,
    created_at TEXT NOT NULL,
    CHECK (
        kind != 'buff'
        OR (
            recipient_viewer_id IS NOT NULL
            AND length(trim(recipient_viewer_id)) > 0
            AND parent_event_id IS NOT NULL
            AND length(trim(parent_event_id)) > 0
        )
    )
);

INSERT INTO interaction_events_new (
    id, kind, contract_id, viewer_id, session_id, command_id, command_trigger, award_id,
    reward_name, points, message_platform, message_id, recipient_viewer_id, parent_event_id, created_at
)
SELECT
    id, kind, contract_id, viewer_id, session_id, command_id, command_trigger, award_id,
    reward_name, points, message_platform, message_id, NULL, NULL, created_at
FROM interaction_events;

DROP TABLE interaction_events;

ALTER TABLE interaction_events_new RENAME TO interaction_events;
-- +goose StatementEnd

CREATE INDEX idx_interaction_events_viewer_created ON interaction_events(viewer_id, created_at);
CREATE INDEX idx_interaction_events_contract_id ON interaction_events(contract_id);
CREATE INDEX idx_interaction_events_viewer_award_progression ON interaction_events(viewer_id, kind, award_id);
CREATE INDEX idx_interaction_events_viewer_command_progression ON interaction_events(viewer_id, kind, command_id);
CREATE INDEX idx_interaction_events_reward_history ON interaction_events(kind, created_at DESC, id DESC);
CREATE INDEX idx_interaction_events_viewer_reward_history ON interaction_events(viewer_id, kind, created_at DESC, id DESC);
CREATE INDEX idx_interaction_events_session_created ON interaction_events(session_id, created_at, id);
CREATE INDEX idx_interaction_events_parent_viewer ON interaction_events(parent_event_id, viewer_id);
CREATE INDEX idx_interaction_events_session_viewer_kind ON interaction_events(session_id, viewer_id, kind);

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

-- +goose Down
DROP TRIGGER IF EXISTS trg_interaction_events_reward_history_compat;
DROP INDEX IF EXISTS idx_interaction_events_session_viewer_kind;
DROP INDEX IF EXISTS idx_interaction_events_parent_viewer;
DROP INDEX IF EXISTS idx_interaction_events_session_created;
DROP INDEX IF EXISTS idx_interaction_events_viewer_reward_history;
DROP INDEX IF EXISTS idx_interaction_events_reward_history;
DROP INDEX IF EXISTS idx_interaction_events_viewer_command_progression;
DROP INDEX IF EXISTS idx_interaction_events_viewer_award_progression;
DROP INDEX IF EXISTS idx_interaction_events_contract_id;
DROP INDEX IF EXISTS idx_interaction_events_viewer_created;

-- +goose StatementBegin
CREATE TABLE interaction_events_old (
    id TEXT NOT NULL PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('command', 'award', 'activity')),
    contract_id TEXT NULL REFERENCES viewer_contracts(id),
    viewer_id TEXT NULL REFERENCES viewers(id),
    session_id TEXT NULL REFERENCES stream_sessions(id),
    command_id TEXT NULL,
    command_trigger TEXT NULL,
    award_id TEXT NULL,
    reward_name TEXT NULL,
    points INTEGER NOT NULL,
    message_platform TEXT NULL,
    message_id TEXT NULL,
    created_at TEXT NOT NULL
);

INSERT INTO interaction_events_old (
    id, kind, contract_id, viewer_id, session_id, command_id, command_trigger, award_id,
    reward_name, points, message_platform, message_id, created_at
)
SELECT
    id, kind, contract_id, viewer_id, session_id, command_id, command_trigger, award_id,
    reward_name, points, message_platform, message_id, created_at
FROM interaction_events
WHERE kind IN ('command', 'award', 'activity');

DROP TABLE interaction_events;

ALTER TABLE interaction_events_old RENAME TO interaction_events;
-- +goose StatementEnd

CREATE INDEX idx_interaction_events_viewer_created ON interaction_events(viewer_id, created_at);
CREATE INDEX idx_interaction_events_contract_id ON interaction_events(contract_id);
CREATE INDEX idx_interaction_events_viewer_award_progression ON interaction_events(viewer_id, kind, award_id);
CREATE INDEX idx_interaction_events_viewer_command_progression ON interaction_events(viewer_id, kind, command_id);
CREATE INDEX idx_interaction_events_reward_history ON interaction_events(kind, created_at DESC, id DESC);
CREATE INDEX idx_interaction_events_viewer_reward_history ON interaction_events(viewer_id, kind, created_at DESC, id DESC);
CREATE INDEX idx_interaction_events_session_created ON interaction_events(session_id, created_at, id);

ALTER TABLE progression_levels DROP COLUMN buff_quota;
ALTER TABLE progression_levels DROP COLUMN like_quota;
ALTER TABLE commands DROP COLUMN award_id;
ALTER TABLE commands DROP COLUMN points;
