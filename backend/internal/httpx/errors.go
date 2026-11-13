package httpx

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

// FromError maps domain/service errors to consistent HTTP responses.
func FromError(c *gin.Context, err error) {
	var validation *domain.ValidationError
	if errors.As(err, &validation) {
		Error(c, http.StatusUnprocessableEntity, "validation_error", "Data tidak valid.", validation.Fields)
		return
	}

	switch {
	case errors.Is(err, domain.ErrNotFound):
		Error(c, http.StatusNotFound, "not_found", "Sumber daya tidak ditemukan.", nil)
	case errors.Is(err, domain.ErrForbidden):
		Error(c, http.StatusForbidden, "forbidden", "Anda tidak memiliki akses ke sumber daya ini.", nil)
	case errors.Is(err, domain.ErrConflict):
		Error(c, http.StatusConflict, "conflict", "Data bertentangan dengan data yang sudah ada.", nil)
	default:
		Error(c, http.StatusInternalServerError, "internal_error", "Terjadi kesalahan internal.", nil)
	}
}
