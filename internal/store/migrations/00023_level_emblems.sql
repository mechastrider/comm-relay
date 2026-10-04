-- +goose Up
ALTER TABLE progression_levels ADD COLUMN emblem TEXT NOT NULL DEFAULT 'shield'
    CHECK (emblem IN ('shield', 'chevron_1', 'chevron_2', 'chevron_3', 'star', 'laurel'));
UPDATE progression_levels SET emblem = CASE id
    WHEN 'recruit' THEN 'chevron_1'
    WHEN 'regular' THEN 'chevron_2'
    WHEN 'veteran' THEN 'chevron_3'
    WHEN 'elite' THEN 'star'
    WHEN 'legend' THEN 'laurel'
    ELSE 'shield' END;

-- +goose Down
ALTER TABLE progression_levels DROP COLUMN emblem;
