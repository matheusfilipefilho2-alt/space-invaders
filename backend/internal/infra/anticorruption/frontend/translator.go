package frontend

import (
	"github.com/braiphub/go-scaffold/internal/domain/entity"
	"github.com/braiphub/go-scaffold/internal/domain/model"
)

func SearchBookRequestToFilter(dto SearchBookRequestDTO) model.SearchBookFilters {
	return model.SearchBookFilters{
		PerPage: dto.PerPage,
		Cursor:  dto.Cursor,
		Name:    dto.Name,
	}
}

func SearchBookResponseToDTO(
	res *model.SearchBookResponse,
) SearchBookResponseDTO {
	var items []SearchBookResponseDTOItem

	for _, book := range res.Items {
		items = append(items, SearchBookResponseDTOItem{
			Name:     book.Name,
			BookType: book.BookType.String(),
		})
	}

	return SearchBookResponseDTO{
		Items:        items,
		NextPage:     res.NextPage,
		PreviousPage: res.PreviousPage,
	}
}

func TranslateCreateChapterRequestDTOToNewChapterEntity(dto CreateChapterRequestDTO) entity.Chapter {
	return entity.NewChapter(dto.BookID, dto.ChapterName)
}
