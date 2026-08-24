package handlers

import (
	"github.com/braiphub/go-core/log"
	"github.com/braiphub/go-scaffold/internal/events/event"
)

func (handler *EventHandler) LogBookCreated(ev event.BookCreatedEvent) {
	handler.logger.Info("book created (sample message from event layer)", log.Any("book_name", ev.Name))
}

func (handler *EventHandler) LogChapterCreated(ev event.ChapterCreatedEvent) {
	handler.logger.Info("chapter created (sample message from event layer)", log.Any("chapter_name", ev.Chapter.Name))
}
