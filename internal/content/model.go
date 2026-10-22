package content

import (
	"time"
)

type UserSummary struct {
	ID       uint64 `json:"id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
}

type Category struct {
	ID          uint64    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description,omitempty"`
	ParentID    *uint64   `json:"parent_id"`
	Sort        int       `json:"sort"`
	Activate    bool      `json:"activate"`
	PostCount   int64     `json:"post_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Tag struct {
	ID          uint64    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description,omitempty"`
	Activate    bool      `json:"activate"`
	PostCount   int64     `json:"post_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Post struct {
	ID             uint64      `json:"id"`
	Title          string      `json:"title"`
	Slug           string      `json:"slug"`
	Desc           string      `json:"desc"`
	Cover          string      `json:"cover,omitempty"`
	Content        string      `json:"content,omitempty"`
	ContentType    string      `json:"content_type,omitempty"`
	Status         string      `json:"status"`
	IsTop          bool        `json:"is_top"`
	ViewCount      uint64      `json:"view_count"`
	CommentsCount  uint64      `json:"comments_count"`
	Author         UserSummary `json:"author"`
	Category       *Category   `json:"category"`
	Tags           []Tag       `json:"tags"`
	SEOTitle       string      `json:"seo_title,omitempty"`
	SEODescription string      `json:"seo_description,omitempty"`
	PublishedAt    *time.Time  `json:"published_at"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type AttachmentView struct {
	ID       uint64 `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	MIMEType string `json:"mime_type"`
	Size     uint64 `json:"size"`
}

type Moment struct {
	ID          uint64           `json:"id"`
	Content     string           `json:"content"`
	Status      string           `json:"status"`
	Visibility  string           `json:"visibility"`
	Attachments []AttachmentView `json:"attachments"`
	PublishedAt *time.Time       `json:"published_at"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

type Friend struct {
	ID        uint64    `json:"id"`
	Name      string    `json:"name"`
	URI       string    `json:"uri"`
	Logo      string    `json:"logo,omitempty"`
	Desc      string    `json:"desc,omitempty"`
	Group     string    `json:"group,omitempty"`
	Sort      int       `json:"sort"`
	Activate  bool      `json:"activate"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type About struct {
	ID          uint8      `json:"id"`
	Content     string     `json:"content"`
	ContentType string     `json:"content_type"`
	Status      string     `json:"status"`
	PublishedAt *time.Time `json:"published_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
