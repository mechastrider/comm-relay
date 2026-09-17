-- +goose Up
CREATE TABLE command_aliases (
    command_id TEXT NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    PRIMARY KEY (command_id, alias)
);

CREATE UNIQUE INDEX idx_command_aliases_alias ON command_aliases(alias);

-- +goose Down
DROP TABLE command_aliases;
