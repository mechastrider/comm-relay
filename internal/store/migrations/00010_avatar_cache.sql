-- +goose Up
ALTER TABLE viewer_identities ADD COLUMN avatar_cache TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE viewer_identities DROP COLUMN avatar_cache;
