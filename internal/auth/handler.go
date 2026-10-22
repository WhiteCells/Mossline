package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"mossline/internal/httpx"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

// Login 校验登录字段并将认证结果转换为统一响应，不区分账号不存在和密码错误
func (h *Handler) Login(c *gin.Context) {
	var input LoginRequest
	if !httpx.BindJSON(c, &input) {
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
		httpx.Failure(c, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "请检查登录信息", fields)
		return
	}
	result, err := h.service.Login(c.Request.Context(), input.Username, input.Password)
	if errors.Is(err, ErrInvalidCredentials) {
		httpx.Failure(c, http.StatusUnauthorized, "INVALID_CREDENTIALS", "用户名或密码错误", nil)
		return
	}
	if errors.Is(err, ErrAccountDisabled) {
		httpx.Failure(c, http.StatusForbidden, "ACCOUNT_DISABLED", "账号已被禁用", nil)
		return
	}
	if err != nil {
		httpx.Failure(c, http.StatusInternalServerError, "INTERNAL_ERROR", "登录失败，请稍后重试", nil)
		return
	}
	httpx.Success(c, result)
}

// Logout 优先使用请求头令牌，缺失时兼容请求体中的令牌
func (h *Handler) Logout(c *gin.Context) {
	token := BearerToken(c)
	if token == "" {
		var input LogoutRequest
		_ = c.ShouldBindJSON(&input)
		token = input.Token
	}
	if err := h.service.Logout(c.Request.Context(), token); err != nil {
		httpx.Failure(c, 500, "INTERNAL_ERROR", "退出登录失败", nil)
		return
	}
	httpx.Success(c, gin.H{})
}

func (h *Handler) Me(c *gin.Context) {
	user, ok := CurrentUser(c)
	if !ok {
		httpx.Failure(c, http.StatusUnauthorized, "UNAUTHORIZED", "请先登录", nil)
		return
	}
	httpx.Success(c, user)
}
