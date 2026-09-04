-- +goose Up
ALTER TABLE commands ADD COLUMN image_fit TEXT NOT NULL DEFAULT 'contain';
ALTER TABLE award_types ADD COLUMN image_fit TEXT NOT NULL DEFAULT 'contain';

-- +goose Down
ALTER TABLE award_types DROP COLUMN image_fit;
ALTER TABLE commands DROP COLUMN image_fit;
