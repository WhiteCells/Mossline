package attachment

import (
	"time"
)

type Reference struct {
	ID    uint64 `json:"id"`
	Type  string `json:"type"`
	Title string `json:"title"`
	URL   string `json:"url,omitempty"`
}

type Attachment struct {
	ID           uint64      `json:"id"`
	Name         string      `json:"name"`
	URL          string      `json:"url"`
	MIMEType     string      `json:"mime_type"`
	Size         uint64      `json:"size"`
	Uploader     string      `json:"uploader,omitempty"`
	References   []Reference `json:"references"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	StorageKey   string      `json:"-"`
	OriginalName string      `json:"-"`
	FileName     string      `json:"-"`
}
