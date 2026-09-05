-- +goose Up
ALTER TABLE commands ADD COLUMN image_size_pct INTEGER NOT NULL DEFAULT 100;
ALTER TABLE award_types ADD COLUMN image_size_pct INTEGER NOT NULL DEFAULT 100;

-- +goose Down
ALTER TABLE award_types DROP COLUMN image_size_pct;
ALTER TABLE commands DROP COLUMN image_size_pct;
