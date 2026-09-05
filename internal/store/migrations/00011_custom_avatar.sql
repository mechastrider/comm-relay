-- +goose Up
ALTER TABLE viewers ADD COLUMN custom_avatar TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE viewers DROP COLUMN custom_avatar;
