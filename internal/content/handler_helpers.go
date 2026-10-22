package content

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
	"mossline/internal/httpx"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

// isAdminRequest 根据已认证角色决定内容读取范围，不依赖请求路径
func isAdminRequest(c *gin.Context) bool {
	user, ok := auth.CurrentUser(c)
	return ok && (user.Role == "admin" || user.Role == "editor")
}

// resourceID 解析路径中的正整数 ID，失败时写入错误响应，调用方应立即返回
func resourceID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		httpx.Failure(c, 400, "INVALID_ID", "资源 ID 不正确", nil)
		return 0, false
	}
	return id, true
}

// listOptions 汇总分页和筛选参数，并从登录身份确定管理模式
func listOptions(c *gin.Context) ListOptions {
	page, size := httpx.ParsePagination(c)
	return ListOptions{
		Page:     page,
		Size:     size,
		Search:   strings.TrimSpace(c.Query("search")),
		Status:   strings.TrimSpace(c.Query("status")),
		Sort:     c.Query("sort"),
		Order:    c.Query("order"),
		Category: strings.TrimSpace(c.Query("category")),
		Tag:      strings.TrimSpace(c.Query("tag")),
		DateFrom: c.Query("date_from"),
		DateTo:   c.Query("date_to"),
		Admin:    isAdminRequest(c),
	}
}

// fail 将内容业务错误映射为 HTTP 响应，内部异常不直接暴露给客户端
func fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalid):
		httpx.Failure(c, 422, "VALIDATION_FAILED", "请检查请求参数", map[string][]string{"body": {"字段格式、状态或关联资源不正确"}})
	case errors.Is(err, ErrNotFound):
		httpx.Failure(c, 404, "NOT_FOUND", "资源不存在", nil)
	case errors.Is(err, ErrConflict):
		httpx.Failure(c, 409, "CONFLICT", "名称或标识已存在", nil)
	case errors.Is(err, ErrReferenced):
		httpx.Failure(c, 409, "RESOURCE_REFERENCED", "资源仍被内容引用，不能删除", nil)
	default:
		httpx.Failure(c, 500, "INTERNAL_ERROR", "服务暂时无法完成请求", nil)
	}
}

func idsFromRequest(c *gin.Context) ([]uint64, bool) {
	var input BatchIDsRequest
	if !httpx.BindJSON(c, &input) {
		return nil, false
	}
	ids, err := parseIDs(input.IDs)
	if err != nil || len(ids) == 0 {
		fail(c, ErrInvalid)
		return nil, false
	}
	return ids, true
}

// singleOrBatch 优先读取路径 ID，无路径 ID 时从 JSON 请求体读取批量 ID
func singleOrBatch(c *gin.Context) ([]uint64, bool) {
	if c.Param("id") != "" {
		id, ok := resourceID(c)
		return []uint64{id}, ok
	}
	return idsFromRequest(c)
}
