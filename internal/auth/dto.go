package auth

type LoginRequest struct {
	Username string `json:"username" required:"true"`
	Password string `json:"password" required:"true" format:"password"`
}

type LogoutRequest struct {
	Token string `json:"token"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
