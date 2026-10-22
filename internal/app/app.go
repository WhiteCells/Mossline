// app 负责应用资源初始化和服务生命周期
package app

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"mossline/internal/config"
	"mossline/internal/database"
	"mossline/internal/httpserver"
)

// Run 初始化数据库并运行应用，迁移模式在完成初始化后直接返回
// ctx 取消时限时关闭 HTTP 服务，返回前释放数据库连接
func Run(ctx context.Context, cfg config.Config, migrateOnly bool) error {
	db, err := database.Open(cfg.Database)
	if err != nil {
		return fmt.Errorf("database: %w", err)
	}
	defer db.Close()
	initCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	if err := database.Migrate(initCtx, db); err != nil {
		return fmt.Errorf("migrations: %w", err)
	}
	if err := database.BootstrapAdmin(initCtx, db, cfg.Auth); err != nil {
		return fmt.Errorf("bootstrap administrator: %w", err)
	}
	if migrateOnly {
		log.Print("database migrations completed")
		return nil
	}
	server, err := httpserver.New(cfg, db, time.Now())
	if err != nil {
		return err
	}
	return serve(ctx, server, cfg.Server.ShutdownTimeout)
}

// serve 等待退出信号或监听错误，正常退出时在独立超时上下文中完成关闭
func serve(ctx context.Context, server *http.Server, shutdownTimeout time.Duration) error {
	finished := make(chan error, 1)
	go func() {
		log.Printf("Mossline API listening on %s", server.Addr)
		finished <- server.ListenAndServe()
	}()
	select {
	case err := <-finished:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("server: %w", err)
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			_ = server.Close()
			return fmt.Errorf("graceful shutdown: %w", err)
		}
		return nil
	}
}
