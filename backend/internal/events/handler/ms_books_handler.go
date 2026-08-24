package handlers

import (
	"github.com/yourusername/space-invaders/internal/events/event"
)

func (handler *EventHandler) NotifyChapterCreatedToMsBooks(ev event.ChapterCreatedEvent) {
	if err := handler.msBooksAdapter.NotifyChapterCreated(ev.Chapter); err != nil {
		handler.logger.Error("failed to notify the books handler", err)
	}
}
