-- +goose Up
ALTER TABLE viewers ADD COLUMN channel_owner INTEGER NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE viewers DROP COLUMN channel_owner;
