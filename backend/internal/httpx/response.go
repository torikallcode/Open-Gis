package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequestIDKey is the gin context key holding the current request id.
const RequestIDKey = "request_id"

// Envelope is the standard success response shape.
type Envelope struct {
	Data any `json:"data"`
	Meta any `json:"meta,omitempty"`
}

// ErrorBody is the standard error payload.
type ErrorBody struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Details   any    `json:"details,omitempty"`
	RequestID string `json:"request_id,omitempty"`
}

type errorEnvelope struct {
	Error ErrorBody `json:"error"`
}

// JSON writes a success envelope.
func JSON(c *gin.Context, status int, data any) {
	c.JSON(status, Envelope{Data: data})
}

// JSONWithMeta writes a success envelope with pagination metadata.
func JSONWithMeta(c *gin.Context, status int, data, meta any) {
	c.JSON(status, Envelope{Data: data, Meta: meta})
}

// Error writes an error envelope using the request id from context.
func Error(c *gin.Context, status int, code, message string, details any) {
	requestID, _ := c.Get(RequestIDKey)
	body := errorEnvelope{Error: ErrorBody{
		Code:      code,
		Message:   message,
		Details:   details,
		RequestID: stringValue(requestID),
	}}
	c.AbortWithStatusJSON(status, body)
}

// NotFound is the default handler for unmatched routes.
func NotFound(c *gin.Context) {
	Error(c, http.StatusNotFound, "not_found", "route not found", nil)
}

func stringValue(v any) string {
	s, _ := v.(string)
	return s
}
