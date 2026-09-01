package auth

import "time"

// User is the authenticated identity attached to a Gin context. Password and
// session data are intentionally never exposed through this type.
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

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

const ContextUserKey = "mossline.auth.user"

func permissionsForRole(role string) []string {
	switch role {
	case "admin":
		return []string{"*"}
	case "editor":
		return []string{"content:read", "content:write", "attachment:write"}
	default:
		return []string{"content:read"}
	}
}

func decorateUser(user *User) {
	user.Roles = []string{user.Role}
	user.Permissions = permissionsForRole(user.Role)
}
