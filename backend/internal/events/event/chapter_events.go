package event

import "github.com/yourusername/space-invaders/internal/domain/entity"

const (
	ChapterCreated = "chapter:created"
)

type ChapterCreatedEvent struct {
	Chapter entity.Chapter
}
