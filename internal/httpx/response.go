package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 是成功与失败请求共用的响应结构，Code 与 HTTP 状态码保持一致
type Response[T any] struct {
	Code      int                 `json:"code"`
	Data      T                   `json:"data"`
	Msg       string              `json:"msg"`
	ErrorCode string              `json:"error_code,omitempty"`
	Errors    map[string][]string `json:"errors,omitempty"`
}

func Success(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Response[any]{Code: http.StatusOK, Data: data})
}

func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, Response[any]{Code: http.StatusCreated, Data: data})
}

// Failure 输出统一错误响应，但不终止调用链，调用方需返回或调用 Abort
func Failure(c *gin.Context, status int, code, message string, fields map[string][]string) {
	c.JSON(status, Response[any]{Code: status, Msg: message, ErrorCode: code, Errors: fields})
}
