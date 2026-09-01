package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) Login(c *gin.Context) {
	var input LoginRequest
	if !BindJSON(c, &input) {
		return
	}
	fields := map[string][]string{}
	if strings.TrimSpace(input.Username) == "" {
		fields["username"] = []string{"请输入用户名或邮箱"}
	}
	if input.Password == "" {
		fields["password"] = []string{"请输入密码"}
	}
	if len(fields) > 0 {
		Failure(c, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "请检查登录信息", fields)
		return
	}
	result, err := h.service.Login(c.Request.Context(), input.Username, input.Password)
	if errors.Is(err, ErrInvalidCredentials) {
		Failure(c, http.StatusUnauthorized, "INVALID_CREDENTIALS", "用户名或密码错误", nil)
		return
	}
	if errors.Is(err, ErrAccountDisabled) {
		Failure(c, http.StatusForbidden, "ACCOUNT_DISABLED", "账号已被禁用", nil)
		return
	}
	if err != nil {
		Failure(c, http.StatusInternalServerError, "INTERNAL_ERROR", "登录失败，请稍后重试", nil)
		return
	}
	Success(c, result)
}

func (h *Handler) Logout(c *gin.Context) {
	token := BearerToken(c)
	if token == "" {
		var input struct {
			Token string `json:"token"`
		}
		_ = c.ShouldBindJSON(&input)
		token = input.Token
	}
	if err := h.service.Logout(c.Request.Context(), token); err != nil {
		Failure(c, 500, "INTERNAL_ERROR", "退出登录失败", nil)
		return
	}
	Success(c, gin.H{})
}

func (h *Handler) Me(c *gin.Context) {
	user, ok := CurrentUser(c)
	if !ok {
		Failure(c, http.StatusUnauthorized, "UNAUTHORIZED", "请先登录", nil)
		return
	}
	Success(c, user)
}
