package httpx

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

type Pagination struct {
	Page       int   `json:"page"`
	Size       int   `json:"size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasMore    bool  `json:"has_more"`
}

// NewPagination 计算分页信息，size 必须为正数，空列表也保留一页
func NewPagination(page, size int, total int64) Pagination {
	pages := int((total + int64(size) - 1) / int64(size))
	if pages < 1 {
		pages = 1
	}
	return Pagination{Page: page, Size: size, Total: total, TotalPages: pages, HasMore: page < pages}
}

// ParsePagination 规范化页码和每页数量，默认每页二十条，最多二百条
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
