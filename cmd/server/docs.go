package main

import (
	_ "embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed openapi.yaml
var openAPIDocument []byte

func registerDocs(router *gin.Engine) {
	router.GET("/openapi.yaml", func(c *gin.Context) { c.Data(http.StatusOK, "application/yaml; charset=utf-8", openAPIDocument) })
	router.GET("/docs", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Mossline API</title><style>body{font:16px/1.6 system-ui;max-width:880px;margin:4rem auto;padding:0 1.5rem;color:#24332b}code{background:#eef3ee;padding:.15rem .4rem;border-radius:4px}a{color:#26734d}</style></head><body><h1>Mossline API</h1><p>OpenAPI 3.1 文档已随服务发布。</p><p><a href="/openapi.yaml">下载 OpenAPI YAML</a></p><p>可将 <code>/openapi.yaml</code> 导入 Swagger Editor、Postman、Insomnia 或任意 OpenAPI 客户端。</p></body></html>`)
	})
}
