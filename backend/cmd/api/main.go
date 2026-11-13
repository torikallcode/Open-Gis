package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/ismw-project/ismw/backend/internal/config"
	"github.com/ismw-project/ismw/backend/internal/database"
	"github.com/ismw-project/ismw/backend/internal/migration"
	"github.com/ismw-project/ismw/backend/internal/server"
)

func main() {
	os.Exit(run())
}

func run() int {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("startup failed", "error", err)
		return 1
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if cfg.AutoMigrate {
		applied, err := migration.Up(cfg.DatabaseURL)
		if err != nil {
			logger.Error("auto migration failed", "error", err)
			return 1
		}
		logger.Info("auto migration finished", "applied", applied)
	}

	db, err := database.New(ctx, cfg, logger)
	if err != nil {
		logger.Error("database unavailable", "error", err)
		return 1
	}
	defer db.Close()

	srv := server.New(cfg, logger, db)
	if err := srv.Run(ctx); err != nil {
		logger.Error("server terminated with error", "error", err)
		return 1
	}

	return 0
}
