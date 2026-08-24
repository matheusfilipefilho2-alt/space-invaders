package handlers

import (
	"github.com/braiphub/go-scaffold/internal/events/event"
)

func (handler *EventHandler) InitFirstChapter(ev event.BookCreatedEvent) {
	if err := handler.chapterService.InitFirstChapterAfterBookCreated(ev.ID); err != nil {
		handler.logger.Error("failed to init first chapter after book created", err)
	}
}
