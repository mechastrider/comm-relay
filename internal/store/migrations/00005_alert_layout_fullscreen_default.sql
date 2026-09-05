-- +goose Up
-- Interactive media introduced layout with default 'card', which shrank alerts that
-- previously filled the Browser Source rectangle. Restore prior behavior.
UPDATE commands SET layout = 'fullscreen' WHERE layout = 'card';
UPDATE award_types SET layout = 'fullscreen' WHERE layout = 'card';

-- +goose Down
UPDATE commands SET layout = 'card' WHERE layout = 'fullscreen';
UPDATE award_types SET layout = 'card' WHERE layout = 'fullscreen';
