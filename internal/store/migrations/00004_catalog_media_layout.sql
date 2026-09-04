-- +goose Up
ALTER TABLE commands ADD COLUMN sound_volume INTEGER NOT NULL DEFAULT 70;
ALTER TABLE commands ADD COLUMN layout TEXT NOT NULL DEFAULT 'card';
ALTER TABLE award_types ADD COLUMN sound_volume INTEGER NOT NULL DEFAULT 70;
ALTER TABLE award_types ADD COLUMN layout TEXT NOT NULL DEFAULT 'card';

-- +goose Down
ALTER TABLE award_types DROP COLUMN layout;
ALTER TABLE award_types DROP COLUMN sound_volume;
ALTER TABLE commands DROP COLUMN layout;
ALTER TABLE commands DROP COLUMN sound_volume;
