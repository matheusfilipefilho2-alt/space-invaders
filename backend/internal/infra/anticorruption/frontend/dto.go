package frontend

type SearchBookRequestDTO struct {
	PerPage int     `query:"per_page"`
	Cursor  *string `query:"cursor"`
	Name    *string `query:"name"`
}

type SearchBookResponseDTO struct {
	Items        []SearchBookResponseDTOItem `json:"items"`
	NextPage     *string                     `json:"next_page"`
	PreviousPage *string                     `json:"previous_page"`
}

type SearchBookResponseDTOItem struct {
	Name     string `json:"name"`
	BookType string `json:"book_type"`
}

type CreateChapterRequestDTO struct {
	BookID      uint   `json:"book_id"      validate:"required"`
	ChapterName string `json:"chapter_name" validate:"required"`
}
