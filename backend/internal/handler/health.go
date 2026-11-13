package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/database"
	"github.com/ismw-project/ismw/backend/internal/httpx"
	"github.com/ismw-project/ismw/backend/internal/version"
)

const dbPingTimeout = 2 * time.Second

type checkResult struct {
	Status    string `json:"status"`
	LatencyMS int64  `json:"latency_ms"`
	Message   string `json:"message,omitempty"`
}

type healthPayload struct {
	Status        string                 `json:"status"`
	Version       string                 `json:"version"`
	UptimeSeconds int64                  `json:"uptime_seconds"`
	Checks        map[string]checkResult `json:"checks"`
	Timestamp     time.Time              `json:"timestamp"`
}

// Health reports service and dependency health.
type Health struct {
	db      *pgxpool.Pool
	started time.Time
}

func NewHealth(db *pgxpool.Pool) *Health {
	return &Health{db: db, started: time.Now()}
}

// Check reports readiness, including a database ping.
func (h *Health) Check(c *gin.Context) {
	latency, err := database.Ping(c.Request.Context(), h.db, dbPingTimeout)

	payload := healthPayload{
		Status:        "ok",
		Version:       version.Version,
		UptimeSeconds: int64(time.Since(h.started).Seconds()),
		Timestamp:     time.Now().UTC(),
		Checks: map[string]checkResult{
			"database": {
				Status:    "ok",
				LatencyMS: latency.Milliseconds(),
			},
		},
	}

	status := http.StatusOK
	if err != nil {
		// Deliberately generic: never leak DSN, host, or credentials.
		payload.Status = "degraded"
		payload.Checks["database"] = checkResult{
			Status:    "error",
			LatencyMS: latency.Milliseconds(),
			Message:   "database unreachable",
		}
		status = http.StatusServiceUnavailable
	}

	httpx.JSON(c, status, payload)
}

// Live is a dependency-free liveness probe.
func (h *Health) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
