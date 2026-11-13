package middleware

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/httpx"
)

const requestIDHeader = "X-Request-ID"

// RequestID attaches a request id to the context, honouring an inbound header.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(requestIDHeader)
		if id == "" {
			id = newID()
		}

		c.Set(httpx.RequestIDKey, id)
		c.Header(requestIDHeader, id)
		c.Next()
	}
}

func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "unknown"
	}
	return hex.EncodeToString(b)
}
