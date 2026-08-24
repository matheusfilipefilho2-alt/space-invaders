package dig

import (
	"github.com/braiphub/go-core/cache"
	"github.com/braiphub/go-core/eventbus"
	"github.com/braiphub/go-core/hashid"
	"github.com/braiphub/go-core/log"
	"github.com/braiphub/go-core/queue"
	"github.com/braiphub/go-scaffold/internal/api/http/controller"
	"github.com/braiphub/go-scaffold/internal/domain/repository"
	"github.com/braiphub/go-scaffold/internal/domain/service"
	handlers "github.com/braiphub/go-scaffold/internal/events/handler"
	"github.com/braiphub/go-scaffold/internal/infra/anticorruption/msbooks"
	"gorm.io/gorm"
)

type IoCContainer struct {
	logger              *log.ZapLoggerAdapter
	readDB              *gorm.DB
	writeDB             *gorm.DB
	rabbitMQ            *queue.RabbitMQConnection
	cache               cache.Cacherer
	hasher              hashid.Hasher
	bookService         *service.BookService
	chapterService      *service.ChapterService
	bookWriteRepository *repository.WriteBookRepository
	bookReadRepository  *repository.ReadBookReadRepository
	msBooksAdapter      *msbooks.Adapter
	eventBus            *eventbus.Bus
}

func NewIoCContainer(
	logger *log.ZapLoggerAdapter,
	readDB *gorm.DB,
	writeDB *gorm.DB,
	rabbitMQ *queue.RabbitMQConnection,
	cache cache.Cacherer,
	hasher hashid.Hasher,
	eventBus *eventbus.Bus,
) *IoCContainer {
	// Repositories
	bookWriteRepository := repository.NewWriteBookRepository(writeDB)
	bookReadRepository := repository.NewBookReadRepository(readDB)
	chapterWriteRepository := repository.NewWriteChapterRepository(writeDB, hasher)
	chapterReadRepository := repository.NewChapterReadRepository(readDB)

	// Services
	bookService := service.NewBookService(bookWriteRepository, bookReadRepository, logger, eventBus)
	chapterService := service.NewChapterService(chapterWriteRepository, chapterReadRepository, logger, eventBus)

	// Adapters
	msBooksAdapter := msbooks.NewMsBooksAdapter(rabbitMQ, bookService)

	return &IoCContainer{
		logger:              logger,
		readDB:              readDB,
		writeDB:             writeDB,
		rabbitMQ:            rabbitMQ,
		cache:               cache,
		hasher:              hasher,
		bookService:         bookService,
		chapterService:      chapterService,
		bookWriteRepository: bookWriteRepository,
		bookReadRepository:  bookReadRepository,
		msBooksAdapter:      msBooksAdapter,
		eventBus:            eventBus,
	}
}

func (c *IoCContainer) BookController() *controller.BookController {
	return controller.NewBookController(c.bookService)
}

func (c *IoCContainer) ChapterController() *controller.ChapterController {
	return controller.NewChapterController(c.chapterService)
}

func (c *IoCContainer) MsBooksAdapter() *msbooks.Adapter {
	return c.msBooksAdapter
}

func (c *IoCContainer) EventHandler() *handlers.EventHandler {
	return handlers.NewEventHandler(c.logger, c.msBooksAdapter, c.chapterService, c.eventBus)
}

func (c *IoCContainer) Logger() *log.ZapLoggerAdapter {
	return c.logger
}
