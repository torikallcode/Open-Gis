package middleware

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/config"
	"github.com/ismw-project/ismw/backend/internal/httpx"
)

// Actor resolves the acting user. Authentication is not implemented until
// Sprint 7, so development uses DEV_USER_EMAIL. Production fails closed.
func Actor(cfg *config.Config, pool *pgxpool.Pool, log *slog.Logger) gin.HandlerFunc {
	if cfg.AppEnv == "production" {
		return func(c *gin.Context) {
			httpx.Error(c, 401, "unauthenticated", "Authentication is not implemented yet.", nil)
		}
	}

	return func(c *gin.Context) {
		var actor access.Actor
		err := pool.QueryRow(c.Request.Context(), `
			SELECT u.id::text, u.name, u.email,
			       EXISTS (
			           SELECT 1
			           FROM user_roles ur
			           JOIN roles r ON r.id = ur.role_id
			           WHERE ur.user_id = u.id AND r.code = 'admin'
			       )
			FROM users u
			WHERE lower(u.email) = lower($1)
			  AND u.deleted_at IS NULL
			  AND u.is_active
		`, cfg.DevUserEmail).Scan(&actor.ID, &actor.Name, &actor.Email, &actor.IsAdmin)

		if err != nil {
			log.Error("dev actor not available", "email", cfg.DevUserEmail, "error", err)
			httpx.Error(c, 401, "unauthenticated",
				"Dev actor tidak ditemukan. Jalankan seed dan periksa DEV_USER_EMAIL.", nil)
			return
		}

		c.Set(access.ActorKey, actor)
		c.Next()
	}
}
