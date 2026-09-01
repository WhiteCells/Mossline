package auth

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type Pagination struct {
	Page       int   `json:"page"`
	Size       int   `json:"size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasMore    bool  `json:"has_more"`
}

func NewPagination(page, size int, total int64) Pagination {
	pages := int((total + int64(size) - 1) / int64(size))
	if pages < 1 {
		pages = 1
	}
	return Pagination{Page: page, Size: size, Total: total, TotalPages: pages, HasMore: page < pages}
}

func ParsePagination(c *gin.Context) (page, size int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ = strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	if size > 200 {
		size = 200
	}
	return page, size
}

func Success(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"code": http.StatusOK, "data": data, "msg": ""})
}

func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, gin.H{"code": http.StatusCreated, "data": data, "msg": ""})
}

func Failure(c *gin.Context, status int, code, message string, fields map[string][]string) {
	payload := gin.H{"code": status, "data": nil, "msg": message}
	if code != "" {
		payload["error_code"] = code
	}
	if len(fields) > 0 {
		payload["errors"] = fields
	}
	c.JSON(status, payload)
}

func BindJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		Failure(c, http.StatusBadRequest, "INVALID_JSON", "请求数据格式不正确", map[string][]string{"body": {err.Error()}})
		return false
	}
	return true
}

func BearerToken(c *gin.Context) string {
	header := strings.TrimSpace(c.GetHeader("Authorization"))
	parts := strings.Fields(header)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}
