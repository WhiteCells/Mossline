package attachment

import (
	"mime/multipart"

	"mossline/internal/httpx"
)

type RenameRequest struct {
	Name string `json:"name"`
}

type AttachmentPage struct {
	Items      []Attachment     `json:"items"`
	Pagination httpx.Pagination `json:"pagination"`
}

type UploadRequest struct {
	File         *multipart.FileHeader `formData:"file" required:"true"`
	Filename     string                `formData:"filename"`
	RelationType string                `formData:"relation_type"`
	RelationID   string                `formData:"relation_id"`
	RelationKey  string                `formData:"relation_key"`
}

type ListOptions struct {
	Page       int    `query:"page" default:"1" minimum:"1"`
	Size       int    `query:"size" default:"20" minimum:"1" maximum:"200"`
	Search     string `query:"search"`
	Sort       string `query:"sort"`
	Order      string `query:"order" enum:"asc,desc"`
	Type       string `query:"type"`
	Referenced string `query:"referenced"`
	DateFrom   string `query:"date_from" format:"date"`
	DateTo     string `query:"date_to" format:"date"`
}
