package middleware

import (
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/httpx"
)

// Recovery converts panics into a structured 500 response instead of letting
// the connection drop silently.
func Recovery(log *slog.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		log.Error("panic recovered",
			"error", fmt.Sprint(recovered),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"request_id", c.GetString(httpx.RequestIDKey),
		)
		httpx.Error(c, 500, "internal_error", "internal server error", nil)
	})
}
