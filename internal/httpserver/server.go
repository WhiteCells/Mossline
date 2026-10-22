package httpserver

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/config"
	"mossline/internal/httpx"
)

// New 装配 HTTP 服务、中间件、静态附件和 Huma 默认文档页面
// 数据库连接及服务启停由调用方管理
func New(cfg config.Config, db *sql.DB, started time.Time) (*http.Server, error) {
	if cfg.Environment == config.Production {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	if err := router.SetTrustedProxies(cfg.Server.TrustedProxyCIDR); err != nil {
		return nil, fmt.Errorf("trusted proxies: %w", err)
	}
	router.Use(gin.Logger(), recovery(), securityHeaders(), cors(cfg.CORS))
	if err := os.MkdirAll(cfg.Storage.LocalDirectory, 0750); err != nil {
		return nil, fmt.Errorf("upload directory: %w", err)
	}
	if strings.HasPrefix(cfg.Storage.PublicURLPrefix, "/") {
		router.Static(cfg.Storage.PublicURLPrefix, filepath.Clean(cfg.Storage.LocalDirectory))
	}
	doc := RegisterRoutes(router, db, cfg.Storage, started)
	if err := doc.Mount(router); err != nil {
		return nil, fmt.Errorf("API documentation: %w", err)
	}
	router.NoRoute(func(c *gin.Context) {
		httpx.Failure(c, http.StatusNotFound, "ROUTE_NOT_FOUND", "接口不存在", nil)
	})
	router.NoMethod(func(c *gin.Context) {
		httpx.Failure(c, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "请求方法不受支持", nil)
	})
	return &http.Server{
		Addr:              cfg.Server.Address,
		Handler:           router,
		ReadTimeout:       cfg.Server.ReadTimeout,
		WriteTimeout:      cfg.Server.WriteTimeout,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}, nil
}
