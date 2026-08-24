package msbooks

import (
	"time"
)

type BookCreatedDTO struct {
	EventTimestamp time.Time `json:"event_timestamp"`
	Hash           string    `json:"hash"`
	Name           string    `json:"name"`
}

type ChapterCreatedDTO struct {
	EventTimestamp time.Time `json:"event_timestamp"`
	Hash           *string   `json:"hash"`
	Name           string    `json:"name"`
}
