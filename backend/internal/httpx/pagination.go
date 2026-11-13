package httpx

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// Pagination holds validated page parameters.
type Pagination struct {
	Page    int
	PerPage int
}

// ListMeta is returned alongside list responses.
type ListMeta struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// ParsePagination reads page and per_page with safe defaults and limits.
func ParsePagination(c *gin.Context) Pagination {
	page := parsePositiveInt(c.Query("page"), 1)
	perPage := parsePositiveInt(c.Query("per_page"), 20)
	if perPage > 100 {
		perPage = 100
	}

	return Pagination{Page: page, PerPage: perPage}
}

// BuildMeta computes pagination metadata for a total row count.
func BuildMeta(p Pagination, total int) ListMeta {
	totalPages := 0
	if total > 0 {
		totalPages = (total + p.PerPage - 1) / p.PerPage
	}

	return ListMeta{
		Page:       p.Page,
		PerPage:    p.PerPage,
		Total:      total,
		TotalPages: totalPages,
	}
}

func (p Pagination) Offset() int {
	return (p.Page - 1) * p.PerPage
}

// ParseSort resolves a client sort key against an allowlist of SQL expressions.
// The returned column is always one of the allowlisted values, never raw input.
func ParseSort(c *gin.Context, allowed map[string]string, fallback string) (column, order string) {
	column = allowed[fallback]

	if key := strings.TrimSpace(c.Query("sort")); key != "" {
		if candidate, ok := allowed[key]; ok {
			column = candidate
		}
	}

	order = "DESC"
	if strings.EqualFold(c.Query("order"), "asc") {
		order = "ASC"
	}

	return column, order
}

func parsePositiveInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 {
		return fallback
	}
	return value
}
