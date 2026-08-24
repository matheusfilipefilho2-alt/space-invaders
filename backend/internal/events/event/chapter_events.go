package event

import "github.com/braiphub/go-scaffold/internal/domain/entity"

const (
	ChapterCreated = "chapter:created"
)

type ChapterCreatedEvent struct {
	Chapter entity.Chapter
}
