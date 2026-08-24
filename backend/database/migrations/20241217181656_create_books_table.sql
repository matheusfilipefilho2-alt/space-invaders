-- +goose Up
-- +goose StatementBegin
CREATE TABLE books
(
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ               NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    hash       TEXT                      NOT NULL,
    name       TEXT                      NOT NULL,
    book_type  TEXT                      NOT NULL
);

CREATE INDEX idx_books_deleted_at
    ON books (deleted_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE books;
-- +goose StatementEnd