package service

import (
	"context"
	"github.com/braiphub/go-core/eventbus"

	"github.com/braiphub/go-core/log"
	"github.com/braiphub/go-scaffold/internal/domain/entity"
	"github.com/braiphub/go-scaffold/internal/events/event"
	"github.com/pkg/errors"
)

type ChapterRepositoryWrite interface {
	Create(ctx context.Context, chapter *entity.Chapter) error
}

type ChapterRepositoryRead interface{}

type ChapterService struct {
	writeRepository ChapterRepositoryWrite
	readRepository  ChapterRepositoryRead
	bus             eventbus.Publisher
	logger          log.LoggerI
}

func NewChapterService(
	writeRepository ChapterRepositoryWrite,
	readRepository ChapterRepositoryRead,
	logger log.LoggerI,
	bus eventbus.Publisher,
) *ChapterService {
	return &ChapterService{
		writeRepository: writeRepository,
		readRepository:  readRepository,
		logger:          logger.WithFields(log.Any("module", "chapter_service")),
		bus:             bus,
	}
}

func (s *ChapterService) InitFirstChapterAfterBookCreated(bookID uint) error {
	ctx := context.Background()

	chapter := entity.NewChapter(bookID, "first chapter example")

	if err := s.Create(ctx, &chapter); err != nil {
		return err
	}

	return nil
}

func (s *ChapterService) Create(ctx context.Context, chapter *entity.Chapter) error {
	if err := s.writeRepository.Create(ctx, chapter); err != nil {
		return errors.Wrap(err, "create chapter")
	}

	s.bus.Publish(
		event.ChapterCreated,
		event.ChapterCreatedEvent{
			Chapter: *chapter,
		},
	)

	s.logger.Info("chapter created (sample message from service layer)", log.Any("chapter", chapter))

	return nil
}
