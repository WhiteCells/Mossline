package content

import (
	"mossline/internal/httpx"
)

type ListOptions struct {
	Page     int    `query:"page" default:"1" minimum:"1"`
	Size     int    `query:"size" default:"20" minimum:"1" maximum:"200"`
	Search   string `query:"search"`
	Sort     string `query:"sort"`
	Order    string `query:"order" enum:"asc,desc"`
	Status   string `query:"status"`
	Category string `query:"category"`
	Tag      string `query:"tag"`
	DateFrom string `query:"date_from" format:"date"`
	DateTo   string `query:"date_to" format:"date"`
	Admin    bool   `json:"-"`
}

type ResourceInput struct {
	Name        *string `json:"name" required:"false"`
	Slug        *string `json:"slug" required:"false"`
	Description *string `json:"description" required:"false"`
	ParentID    any     `json:"parent_id" required:"false"`
	Sort        *int    `json:"sort" required:"false"`
	Activate    *bool   `json:"activate" required:"false"`
	URI         *string `json:"uri" required:"false"`
	Logo        *string `json:"logo" required:"false"`
	Desc        *string `json:"desc" required:"false"`
	Group       *string `json:"group" required:"false"`
}

type ActivateRequest struct {
	Activate bool `json:"activate"`
}

type StatusRequest struct {
	Status string `json:"status"`
}

type BatchIDsRequest struct {
	IDs []any `json:"ids"`
}

type PostStatusRequest struct {
	IDs    []any  `json:"ids"`
	Status string `json:"status"`
}

type PostInput struct {
	Title                 *string `json:"title" required:"false"`
	Slug                  *string `json:"slug" required:"false"`
	Desc                  *string `json:"desc" required:"false"`
	Cover                 *string `json:"cover" required:"false"`
	CategoryID            any     `json:"category_id" required:"false"`
	TagIDs                []any   `json:"tag_ids" required:"false"`
	Content               *string `json:"content" required:"false"`
	ContentType           *string `json:"content_type" required:"false"`
	Status                *string `json:"status" required:"false"`
	IsTop                 *bool   `json:"is_top" required:"false"`
	PublishedAt           *string `json:"published_at" required:"false"`
	SEOTitle              *string `json:"seo_title" required:"false"`
	SEODescription        *string `json:"seo_description" required:"false"`
	AttachmentRelationKey string  `json:"attachment_relation_key" required:"false"`
}

type MomentInput struct {
	Content               *string `json:"content" required:"false"`
	Status                *string `json:"status" required:"false"`
	Visibility            *string `json:"visibility" required:"false"`
	PublishedAt           *string `json:"published_at" required:"false"`
	AttachmentRelationKey string  `json:"attachment_relation_key" required:"false"`
}

type AboutInput struct {
	Content               string `json:"content"`
	Status                string `json:"status" required:"false"`
	AttachmentRelationKey string `json:"attachment_relation_key" required:"false"`
}

type CategoryPage struct {
	Items      []Category       `json:"items"`
	Pagination httpx.Pagination `json:"pagination"`
}

type TagPage struct {
	Items      []Tag            `json:"items"`
	Pagination httpx.Pagination `json:"pagination"`
}

type FriendPage struct {
	Items      []Friend         `json:"items"`
	Pagination httpx.Pagination `json:"pagination"`
}

type PostPage struct {
	Items      []Post           `json:"items"`
	Pagination httpx.Pagination `json:"pagination"`
}

type MomentPage struct {
	Items      []Moment         `json:"items"`
	Pagination httpx.Pagination `json:"pagination"`
}
