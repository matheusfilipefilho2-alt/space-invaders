package enum

type BookType string

const (
	BookTypeEbook BookType = "EBOOK"
)

func (m BookType) String() string {
	return string(m)
}
