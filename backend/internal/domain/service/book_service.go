package service

import (
	"context"
	"github.com/braiphub/go-core/eventbus"

	"github.com/braiphub/go-core/log"
	"github.com/braiphub/go-scaffold/internal/domain/entity"
	"github.com/braiphub/go-scaffold/internal/domain/model"
	"github.com/braiphub/go-scaffold/internal/events/event"
	"github.com/pkg/errors"
)

type BookRepositoryWrite interface {
	Create(ctx context.Context, book *entity.Book) error
}

type BookRepositoryRead interface {
	Search(ctx context.Context, filters model.SearchBookFilters) (*model.SearchBookResponse, error)
}

type BookService struct {
	writeRepository BookRepositoryWrite
	readRepository  BookRepositoryRead
	bus             eventbus.Publisher
	logger          log.LoggerI
}

func NewBookService(
	writeRepository BookRepositoryWrite,
	readRepository BookRepositoryRead,
	logger log.LoggerI,
	bus eventbus.Publisher,
) *BookService {
	return &BookService{
		writeRepository: writeRepository,
		readRepository:  readRepository,
		logger:          logger.WithFields(log.Any("module", "book_service")),
		bus:             bus,
	}
}

func (s *BookService) Create(ctx context.Context, book *entity.Book) error {
	if err := s.writeRepository.Create(ctx, book); err != nil {
		return errors.Wrap(err, "create book")
	}

	s.bus.Publish(
		event.BookCreated,
		event.BookCreatedEvent{
			ID:   book.ID,
			Name: book.Name,
		},
	)

	s.logger.Info("book created (sample message from service layer)", log.Any("book", book))

	return nil
}

func (s *BookService) Search(ctx context.Context, filters model.SearchBookFilters) (*model.SearchBookResponse, error) {
	response, err := s.readRepository.Search(ctx, filters)
	if err != nil {
		return nil, errors.Wrap(err, "repository search")
	}

	return response, nil
}
