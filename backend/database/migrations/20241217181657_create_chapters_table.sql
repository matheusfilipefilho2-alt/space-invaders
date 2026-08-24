-- +goose Up
-- +goose StatementBegin
CREATE TABLE chapters
(
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ               NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    book_id    INT                       NOT NULL,
    hash       TEXT                      NULL,
    name       TEXT                      NOT NULL
);

CREATE INDEX idx_chapters_deleted_at
    ON chapters (deleted_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE chapters;
-- +goose StatementEnd