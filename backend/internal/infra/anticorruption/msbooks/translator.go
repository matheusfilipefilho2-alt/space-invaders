package msbooks

import (
	"encoding/json"

	"github.com/braiphub/go-core/queue"
	"github.com/pkg/errors"
	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/enum"
)

func TranslateBooksCreatedMessageToDTO(msg queue.Message) (*BookCreatedDTO, error) {
	var dto BookCreatedDTO

	if err := json.Unmarshal(msg.Body, &dto); err != nil {
		return nil, errors.Wrap(err, "unmarshal")
	}

	return &dto, nil
}

func TranslateBooksCreatedDTOToNewBookEntity(dto BookCreatedDTO) entity.Book {
	book := entity.NewBook(dto.Hash, dto.Name, enum.BookTypeEbook)

	return book
}

func TranslateChapterCreatedEventToDTO(chapter entity.Chapter) ChapterCreatedDTO {
	return ChapterCreatedDTO{
		EventTimestamp: chapter.CreatedAt,
		Hash:           chapter.Hash,
		Name:           chapter.Name,
	}
}
