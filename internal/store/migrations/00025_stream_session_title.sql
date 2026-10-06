-- +goose Up
ALTER TABLE stream_sessions ADD COLUMN title TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE stream_sessions DROP COLUMN title;
