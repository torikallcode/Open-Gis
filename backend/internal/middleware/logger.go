package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/httpx"
)

// Logger emits one structured log line per request.
func Logger(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := c.Writer.Status()
		attrs := []any{
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", status,
			"latency_ms", time.Since(start).Milliseconds(),
			"client_ip", c.ClientIP(),
			"request_id", c.GetString(httpx.RequestIDKey),
		}

		switch {
		case status >= 500:
			log.Error("request failed", attrs...)
		case status >= 400:
			log.Warn("request rejected", attrs...)
		default:
			log.Info("request completed", attrs...)
		}
	}
}
