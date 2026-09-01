package attachment

import (
	"database/sql"
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

type rowScanner interface{ Scan(...any) error }

func scan(scanner rowScanner) (Attachment, error) {
	var item Attachment
	var uploader sql.NullString
	err := scanner.Scan(&item.ID, &item.OriginalName, &item.FileName, &item.StorageKey, &item.MIMEType, &item.Size, &item.URL, &item.CreatedAt, &uploader)
	item.Name = item.OriginalName
	item.UpdatedAt = item.CreatedAt
	item.References = []Reference{}
	if uploader.Valid {
		item.Uploader = uploader.String
	}
	return item, err
}
