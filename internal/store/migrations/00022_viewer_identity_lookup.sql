-- +goose Up
CREATE INDEX IF NOT EXISTS idx_viewer_identities_viewer_last_seen
    ON viewer_identities (viewer_id, last_seen_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_viewer_identities_viewer_last_seen;
