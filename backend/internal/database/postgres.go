package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/config"
)

const (
	connectAttempts = 5
	connectDelay    = 2 * time.Second
	pingTimeout     = 5 * time.Second
)

// New creates a pgx pool and waits until the database answers a ping.
func New(ctx context.Context, cfg *config.Config, log *slog.Logger) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}

	poolCfg.MaxConns = cfg.DBMaxConns
	poolCfg.ConnConfig.RuntimeParams["application_name"] = "ismw-api"

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	var lastErr error
	for attempt := 1; attempt <= connectAttempts; attempt++ {
		pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
		lastErr = pool.Ping(pingCtx)
		cancel()

		if lastErr == nil {
			log.Info("database connection established", "attempt", attempt)
			return pool, nil
		}

		if ctx.Err() != nil {
			break
		}

		log.Warn("database not ready, retrying", "attempt", attempt, "max_attempts", connectAttempts, "error", lastErr)
		select {
		case <-ctx.Done():
			pool.Close()
			return nil, ctx.Err()
		case <-time.After(connectDelay):
		}
	}

	pool.Close()
	return nil, fmt.Errorf("connect to database after %d attempts: %w", connectAttempts, lastErr)
}

// Ping verifies the database is reachable within the given timeout.
func Ping(ctx context.Context, pool *pgxpool.Pool, timeout time.Duration) (time.Duration, error) {
	start := time.Now()
	pingCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	err := pool.Ping(pingCtx)
	return time.Since(start), err
}
