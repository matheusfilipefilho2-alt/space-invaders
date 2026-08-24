package handlers

import (
	"github.com/braiphub/go-core/eventbus"
	"github.com/braiphub/go-core/log"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/events/event"
	"github.com/yourusername/space-invaders/internal/infra/anticorruption/msbooks"
)

type EventHandler struct {
	logger         log.LoggerI
	bus            *eventbus.Bus
	msBooksAdapter *msbooks.Adapter
	chapterService *service.ChapterService
}

func NewEventHandler(
	logger log.LoggerI,
	msBooksAdapter *msbooks.Adapter,
	chapterService *service.ChapterService,
	bus *eventbus.Bus,
) *EventHandler {
	return &EventHandler{
		logger:         logger,
		bus:            bus,
		msBooksAdapter: msBooksAdapter,
		chapterService: chapterService,
	}
}

func (handler *EventHandler) StartListeners() {
	handler.bus.SubscribeAsync(event.BookCreated, handler.LogBookCreated, false)
	handler.bus.SubscribeAsync(event.BookCreated, handler.InitFirstChapter, false)

	handler.bus.SubscribeAsync(event.ChapterCreated, handler.LogChapterCreated, false)
	handler.bus.SubscribeAsync(event.ChapterCreated, handler.NotifyChapterCreatedToMsBooks, false)
}
