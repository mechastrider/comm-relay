-- +goose Up
UPDATE commands
SET splash_template = REPLACE(splash_template, '{name}', '{viewer}')
WHERE splash_template LIKE '%{name}%';

UPDATE award_types
SET splash_template = REPLACE(splash_template, '{name}', '{viewer}')
WHERE splash_template LIKE '%{name}%';

-- +goose Down
-- Irreversible: original {name} vs {viewer} choice is not stored.
