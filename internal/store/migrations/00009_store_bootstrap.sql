-- +goose Up
CREATE TABLE IF NOT EXISTS store_bootstrap (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS store_bootstrap;
