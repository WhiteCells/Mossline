package user

import "time"

type User struct {
	ID        uint64    `json:"id"`
	Username  string    `json:"username"`
	Nickname  string    `json:"nickname"`
	Email     string    `json:"email,omitempty"`
	Avatar    string    `json:"avatar,omitempty"`
	Bio       string    `json:"bio,omitempty"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateRequest struct {
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
	Bio      string `json:"bio"`
	Role     string `json:"role"`
	Status   string `json:"status"`
	Password string `json:"password"`
}

type UpdateRequest struct {
	Username *string `json:"username"`
	Nickname *string `json:"nickname"`
	Email    *string `json:"email"`
	Avatar   *string `json:"avatar"`
	Bio      *string `json:"bio"`
	Role     *string `json:"role"`
	Status   *string `json:"status"`
	Password *string `json:"password"`
}

type ListQuery struct {
	Page, Size int
	Search     string
	Role       string
	Status     string
	Sort       string
	Order      string
}
