package user

import (
	"mossline/internal/httpx"
)

type CreateRequest struct {
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar" required:"false"`
	Bio      string `json:"bio" required:"false"`
	Role     string `json:"role" required:"false"`
	Status   string `json:"status" required:"false"`
	Password string `json:"password"`
}

type UpdateRequest struct {
	Username *string `json:"username" required:"false"`
	Nickname *string `json:"nickname" required:"false"`
	Email    *string `json:"email" required:"false"`
	Avatar   *string `json:"avatar" required:"false"`
	Bio      *string `json:"bio" required:"false"`
	Role     *string `json:"role" required:"false"`
	Status   *string `json:"status" required:"false"`
	Password *string `json:"password" required:"false"`
}

type StatusRequest struct {
	Status string `json:"status"`
}

type ListQuery struct {
	Page   int    `query:"page" default:"1" minimum:"1"`
	Size   int    `query:"size" default:"20" minimum:"1" maximum:"200"`
	Search string `query:"search"`
	Sort   string `query:"sort"`
	Order  string `query:"order" enum:"asc,desc"`
	Role   string `query:"role" enum:"admin,editor,viewer"`
	Status string `query:"status" enum:"active,disabled"`
}

type UserPage struct {
	Items      []User           `json:"items"`
	Pagination httpx.Pagination `json:"pagination"`
}
