package user

import (
	"errors"
	"net/http"
	"net/mail"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
	appdb "mossline/internal/database"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }
func idParam(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		auth.Failure(c, 400, "INVALID_ID", "用户 ID 不正确", nil)
		return 0, false
	}
	return id, true
}
func fail(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		auth.Failure(c, 404, "NOT_FOUND", "用户不存在", nil)
		return
	}
	if errors.Is(err, ErrProtected) {
		auth.Failure(c, 409, "PROTECTED_USER", "不能删除当前用户或最后一个管理员", nil)
		return
	}
	if strings.Contains(err.Error(), "Duplicate entry") {
		auth.Failure(c, 409, "CONFLICT", "用户名或邮箱已存在", nil)
		return
	}
	auth.Failure(c, 500, "INTERNAL_ERROR", "用户操作失败", nil)
}
func validateCreate(input CreateRequest, requirePassword bool) map[string][]string {
	fields := map[string][]string{}
	input.Username = strings.TrimSpace(input.Username)
	if len(input.Username) < 3 || len(input.Username) > 64 {
		fields["username"] = []string{"用户名长度应为 3 到 64 位"}
	}
	if strings.TrimSpace(input.Nickname) == "" {
		fields["nickname"] = []string{"请输入昵称"}
	}
	if _, err := mail.ParseAddress(input.Email); err != nil {
		fields["email"] = []string{"请输入有效邮箱"}
	}
	if !validRole(input.Role) {
		fields["role"] = []string{"角色不正确"}
	}
	if !validStatus(input.Status) {
		fields["status"] = []string{"状态不正确"}
	}
	if requirePassword {
		if err := appdb.ValidatePassword(input.Password); err != nil {
			fields["password"] = []string{"密码需为 8-72 位并同时包含字母和数字"}
		}
	}
	return fields
}
func validRole(value string) bool   { return value == "admin" || value == "editor" || value == "viewer" }
func validStatus(value string) bool { return value == "active" || value == "disabled" }
func (h *Handler) List(c *gin.Context) {
	page, size := auth.ParsePagination(c)
	items, total, err := h.service.List(c.Request.Context(), ListQuery{Page: page, Size: size, Search: strings.TrimSpace(c.Query("search")), Role: c.Query("role"), Status: c.Query("status"), Sort: c.Query("sort"), Order: c.Query("order")})
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{"items": items, "pagination": auth.NewPagination(page, size, total)})
}
func (h *Handler) Get(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	item, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) Create(c *gin.Context) {
	var input CreateRequest
	if !auth.BindJSON(c, &input) {
		return
	}
	if input.Role == "" {
		input.Role = "editor"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if fields := validateCreate(input, true); len(fields) > 0 {
		auth.Failure(c, 422, "VALIDATION_FAILED", "请检查用户信息", fields)
		return
	}
	item, err := h.service.Create(c.Request.Context(), input)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Created(c, item)
}
func (h *Handler) Update(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	current, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		fail(c, err)
		return
	}
	var input UpdateRequest
	if !auth.BindJSON(c, &input) {
		return
	}
	merged := CreateRequest{Username: current.Username, Nickname: current.Nickname, Email: current.Email, Avatar: current.Avatar, Bio: current.Bio, Role: current.Role, Status: current.Status}
	if input.Username != nil {
		merged.Username = *input.Username
	}
	if input.Nickname != nil {
		merged.Nickname = *input.Nickname
	}
	if input.Email != nil {
		merged.Email = *input.Email
	}
	if input.Role != nil {
		merged.Role = *input.Role
	}
	if input.Status != nil {
		merged.Status = *input.Status
	}
	fields := validateCreate(merged, false)
	if input.Password != nil && *input.Password != "" {
		if err := appdb.ValidatePassword(*input.Password); err != nil {
			fields["password"] = []string{"密码需为 8-72 位并同时包含字母和数字"}
		}
	}
	actor, _ := auth.CurrentUser(c)
	if actor.ID == id && input.Status != nil && *input.Status == "disabled" {
		fields["status"] = []string{"不能禁用当前登录用户"}
	}
	if current.Role == "admin" && current.Status == "active" && (merged.Role != "admin" || merged.Status != "active") {
		admins, countErr := h.service.CountActiveAdmins(c.Request.Context())
		if countErr != nil {
			fail(c, countErr)
			return
		}
		if admins <= 1 {
			fields["role"] = []string{"不能降级或禁用最后一个管理员"}
		}
	}
	if len(fields) > 0 {
		auth.Failure(c, 422, "VALIDATION_FAILED", "请检查用户信息", fields)
		return
	}
	item, err := h.service.Update(c.Request.Context(), id, input)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) Status(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	var input struct {
		Status string `json:"status"`
	}
	if !auth.BindJSON(c, &input) {
		return
	}
	if !validStatus(input.Status) {
		auth.Failure(c, 422, "VALIDATION_FAILED", "用户状态不正确", nil)
		return
	}
	actor, _ := auth.CurrentUser(c)
	if actor.ID == id && input.Status == "disabled" {
		auth.Failure(c, 409, "PROTECTED_USER", "不能禁用当前登录用户", nil)
		return
	}
	if input.Status == "disabled" {
		item, getErr := h.service.Get(c.Request.Context(), id)
		if getErr != nil {
			fail(c, getErr)
			return
		}
		if item.Role == "admin" && item.Status == "active" {
			admins, countErr := h.service.CountActiveAdmins(c.Request.Context())
			if countErr != nil {
				fail(c, countErr)
				return
			}
			if admins <= 1 {
				fail(c, ErrProtected)
				return
			}
		}
	}
	item, err := h.service.Update(c.Request.Context(), id, UpdateRequest{Status: &input.Status})
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) Delete(c *gin.Context) {
	var ids []uint64
	if c.Param("id") != "" {
		id, ok := idParam(c)
		if !ok {
			return
		}
		ids = []uint64{id}
	} else {
		var body struct {
			IDs []uint64 `json:"ids"`
		}
		if !auth.BindJSON(c, &body) {
			return
		}
		ids = body.IDs
	}
	if len(ids) == 0 {
		auth.Failure(c, 422, "VALIDATION_FAILED", "请选择用户", nil)
		return
	}
	actor, _ := auth.CurrentUser(c)
	admins, err := h.service.CountActiveAdmins(c.Request.Context())
	if err != nil {
		fail(c, err)
		return
	}
	for _, id := range ids {
		if id == actor.ID {
			fail(c, ErrProtected)
			return
		}
		item, err := h.service.Get(c.Request.Context(), id)
		if err != nil {
			fail(c, err)
			return
		}
		if item.Role == "admin" && item.Status == "active" {
			admins--
		}
	}
	if admins < 1 {
		fail(c, ErrProtected)
		return
	}
	if err = h.service.Delete(c.Request.Context(), ids); err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{})
}

func MethodNotAllowed(c *gin.Context) {
	auth.Failure(c, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "请求方法不受支持", nil)
}
