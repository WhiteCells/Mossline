package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/admin"
	"mossline/internal/attachment"
	"mossline/internal/auth"
	"mossline/internal/config"
	"mossline/internal/content"
	"mossline/internal/database"
	"mossline/internal/user"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration: %v", err)
	}
	db, err := database.Open(cfg.Database)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if err = database.Migrate(ctx, db); err != nil {
		log.Fatalf("migrations: %v", err)
	}
	if err = database.BootstrapAdmin(ctx, db, cfg.Auth); err != nil {
		log.Fatalf("bootstrap administrator: %v", err)
	}
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		log.Print("database migrations completed")
		return
	}

	if cfg.Environment == config.Production {
		gin.SetMode(gin.ReleaseMode)
	}
	started := time.Now()
	router := gin.New()
	if err := router.SetTrustedProxies(cfg.Server.TrustedProxyCIDR); err != nil {
		log.Fatalf("trusted proxies: %v", err)
	}
	router.Use(gin.Logger(), recovery(), securityHeaders(), cors(cfg.CORS))
	if err := os.MkdirAll(cfg.Storage.LocalDirectory, 0750); err != nil {
		log.Fatalf("upload directory: %v", err)
	}
	if strings.HasPrefix(cfg.Storage.PublicURLPrefix, "/") {
		router.Static(cfg.Storage.PublicURLPrefix, filepath.Clean(cfg.Storage.LocalDirectory))
	}
	router.GET("/healthz", admin.NewHandler(db, started).Health)
	registerDocs(router)
	api := router.Group("/api")
	api.Use(admin.Audit(db))
	auth.RegisterRoutes(api, db)
	content.RegisterRoutes(api, db)
	attachment.RegisterRoutes(api, db, cfg.Storage)
	admin.RegisterRoutes(api, db, started)
	adminGroup := api.Group("/admin")
	admin.RegisterRoutes(adminGroup, db, started)
	user.RegisterRoutes(adminGroup, db)
	router.NoRoute(func(c *gin.Context) { auth.Failure(c, http.StatusNotFound, "ROUTE_NOT_FOUND", "接口不存在", nil) })
	router.NoMethod(content.MethodNotAllowed)

	server := &http.Server{Addr: cfg.Server.Address, Handler: router, ReadTimeout: cfg.Server.ReadTimeout, WriteTimeout: cfg.Server.WriteTimeout, ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 1 << 20}
	go func() {
		log.Printf("Mossline API listening on %s", cfg.Server.Address)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown: %v", err)
	}
}

func recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, _ any) {
		auth.Failure(c, http.StatusInternalServerError, "INTERNAL_ERROR", "服务发生异常", nil)
	})
}

func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Next()
	}
}

func cors(cfg config.CORS) gin.HandlerFunc {
	allowed := map[string]struct{}{}
	for _, origin := range cfg.AllowedOrigins {
		allowed[origin] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := allowed[origin]; ok {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			if cfg.AllowCredentials {
				c.Header("Access-Control-Allow-Credentials", "true")
			}
		}
		if c.Request.Method == http.MethodOptions {
			if _, ok := allowed[origin]; !ok && origin != "" {
				auth.Failure(c, http.StatusForbidden, "CORS_FORBIDDEN", "来源不受允许", nil)
			} else {
				c.Status(http.StatusNoContent)
			}
			c.Abort()
			return
		}
		c.Next()
	}
}
