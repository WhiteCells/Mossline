package auth

import "time"

// User 表示注入 Gin 上下文的登录身份，不包含密码和会话数据
type User struct {
	ID          uint64    `json:"id"`
	Username    string    `json:"username"`
	Nickname    string    `json:"nickname"`
	Email       string    `json:"email,omitempty"`
	Avatar      string    `json:"avatar,omitempty"`
	Role        string    `json:"role"`
	Roles       []string  `json:"roles"`
	Permissions []string  `json:"permissions"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
