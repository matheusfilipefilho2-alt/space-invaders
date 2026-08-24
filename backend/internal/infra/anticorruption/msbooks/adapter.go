package msbooks

import (
	"context"

	"github.com/braiphub/go-core/queue"
	"github.com/braiphub/go-scaffold/internal/domain/entity"
	"github.com/pkg/errors"
)

type BookServiceInterface interface {
	Create(ctx context.Context, book *entity.Book) error
}

type Adapter struct {
	queue       queue.QueueI
	bookService BookServiceInterface
}

func NewMsBooksAdapter(
	queue queue.QueueI,
	bookService BookServiceInterface,
) *Adapter {
	return &Adapter{
		queue:       queue,
		bookService: bookService,
	}
}

func (a *Adapter) StartConsumers(ctx context.Context) {
	go a.queue.Consume(ctx, "ms-scaffold.books.created", a.HandleBooksCreatedEvent)
}

func (a *Adapter) HandleBooksCreatedEvent(ctx context.Context, msg queue.Message) error {
	dto, err := TranslateBooksCreatedMessageToDTO(msg)
	if err != nil {
		return errors.Wrap(err, "translate buf")
	}

	if err := ValidateBooksCreatedDTO(*dto); err != nil {
		return errors.Wrap(err, "validate")
	}

	book := TranslateBooksCreatedDTOToNewBookEntity(*dto)

	if err := a.bookService.Create(ctx, &book); err != nil {
		return errors.Wrap(err, "create")
	}

	return nil
}

func (a *Adapter) NotifyChapterCreated(chapter entity.Chapter) error {
	ctx := context.Background()

	dto := TranslateChapterCreatedEventToDTO(chapter)

	if err := a.queue.Produce(ctx, "chapter-created", dto); err != nil {
		return errors.Wrap(err, "produce")
	}

	return nil
}
