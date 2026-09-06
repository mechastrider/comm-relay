-- +goose Up
ALTER TABLE commands ADD COLUMN action TEXT NOT NULL DEFAULT 'alert';

-- +goose Down
ALTER TABLE commands DROP COLUMN action;
