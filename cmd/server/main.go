package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"mossline/internal/app"
	"mossline/internal/config"
)

// main 加载配置并将进程退出信号交给应用生命周期管理
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration: %v", err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	migrateOnly := len(os.Args) > 1 && os.Args[1] == "migrate"
	if err := app.Run(ctx, cfg, migrateOnly); err != nil {
		log.Fatal(err)
	}
}
