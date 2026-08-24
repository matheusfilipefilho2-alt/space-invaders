package event

const (
	BookCreated = "book:created"
)

type BookCreatedEvent struct {
	ID   uint
	Name string
}
