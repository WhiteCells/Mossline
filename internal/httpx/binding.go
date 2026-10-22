package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type BatchIDsRequest struct {
	IDs []uint64 `json:"ids"`
}

// BindJSON 绑定 JSON，失败时写入错误响应并返回 false，调用方应立即返回
func BindJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		Failure(c, http.StatusBadRequest, "INVALID_JSON", "请求数据格式不正确", map[string][]string{"body": {err.Error()}})
		return false
	}
	return true
}
