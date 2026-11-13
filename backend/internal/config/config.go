package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds runtime configuration loaded from environment variables.
type Config struct {
	AppEnv             string
	HTTPPort           string
	DatabaseURL        string
	DBMaxConns         int32
	CORSAllowedOrigins []string
	LogLevel           slog.Level
	AutoMigrate        bool
	DevUserEmail       string
}

// Load reads environment variables (optionally from a .env file) and validates
// the result. It fails fast so misconfiguration never reaches the HTTP server.
func Load() (*Config, error) {
	loadDotEnv()

	cfg := &Config{
		AppEnv:       getEnv("APP_ENV", "development"),
		HTTPPort:     getEnv("HTTP_PORT", "8080"),
		DatabaseURL:  strings.TrimSpace(os.Getenv("DATABASE_URL")),
		DevUserEmail: getEnv("DEV_USER_EMAIL", "admin@example.local"),
	}

	var problems []string

	if cfg.DatabaseURL == "" {
		problems = append(problems, "DATABASE_URL is required")
	}

	port, err := strconv.Atoi(cfg.HTTPPort)
	if err != nil || port < 1 || port > 65535 {
		problems = append(problems, "HTTP_PORT must be a valid TCP port")
	}

	maxConns, err := strconv.ParseInt(getEnv("DB_MAX_CONNS", "10"), 10, 32)
	if err != nil || maxConns < 1 {
		problems = append(problems, "DB_MAX_CONNS must be a positive integer")
	} else {
		cfg.DBMaxConns = int32(maxConns)
	}

	cfg.CORSAllowedOrigins = splitList(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"))
	if len(cfg.CORSAllowedOrigins) == 0 {
		problems = append(problems, "CORS_ALLOWED_ORIGINS must contain at least one origin")
	}

	level, err := parseLogLevel(getEnv("LOG_LEVEL", "info"))
	if err != nil {
		problems = append(problems, err.Error())
	} else {
		cfg.LogLevel = level
	}

	autoMigrate, err := strconv.ParseBool(getEnv("AUTO_MIGRATE", "false"))
	if err != nil {
		problems = append(problems, "AUTO_MIGRATE must be a boolean")
	} else {
		cfg.AutoMigrate = autoMigrate
	}

	if len(problems) > 0 {
		return nil, fmt.Errorf("invalid configuration: %s", strings.Join(problems, "; "))
	}

	return cfg, nil
}

// loadDotEnv loads the first .env file found, walking up to the repo root.
// Existing environment variables always win.
func loadDotEnv() {
	for _, path := range []string{".env", "../.env", "../../.env"} {
		if _, err := os.Stat(path); err == nil {
			_ = godotenv.Load(path)
			return
		}
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return fallback
}

func splitList(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func parseLogLevel(raw string) (slog.Level, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "debug":
		return slog.LevelDebug, nil
	case "info":
		return slog.LevelInfo, nil
	case "warn", "warning":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return slog.LevelInfo, fmt.Errorf("LOG_LEVEL must be one of debug, info, warn, error")
	}
}
