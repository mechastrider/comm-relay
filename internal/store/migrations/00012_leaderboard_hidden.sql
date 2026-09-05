-- +goose Up
ALTER TABLE viewers ADD COLUMN leaderboard_hidden INTEGER NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE viewers DROP COLUMN leaderboard_hidden;
