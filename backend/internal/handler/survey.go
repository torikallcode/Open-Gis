package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/httpx"
)

var surveySortColumns = map[string]string{
	"created_at":  "s.created_at",
	"updated_at":  "s.updated_at",
	"survey_date": "s.survey_date",
	"name":        "s.name",
	"status":      "s.status",
}

// SurveyService is the business interface required by the HTTP layer.
type SurveyService interface {
	List(ctx context.Context, actor access.Actor, filter domain.SurveyListFilter) ([]domain.Survey, int, error)
	Get(ctx context.Context, actor access.Actor, id string) (domain.Survey, error)
	Create(ctx context.Context, actor access.Actor, input domain.CreateSurveyInput, meta domain.RequestMeta) (domain.Survey, error)
	Update(ctx context.Context, actor access.Actor, id string, input domain.CreateSurveyInput, meta domain.RequestMeta) (domain.Survey, error)
	Delete(ctx context.Context, actor access.Actor, id string, meta domain.RequestMeta) error
}

// SurveyHandler exposes survey endpoints.
type SurveyHandler struct {
	service SurveyService
}

func NewSurveyHandler(service SurveyService) *SurveyHandler {
	return &SurveyHandler{service: service}
}

func (h *SurveyHandler) List(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	pagination := httpx.ParsePagination(c)
	sortColumn, sortOrder := httpx.ParseSort(c, surveySortColumns, "created_at")

	surveys, total, err := h.service.List(c.Request.Context(), actor, domain.SurveyListFilter{
		ProjectID:  c.Query("project_id"),
		Status:     c.Query("status"),
		Query:      c.Query("q"),
		From:       c.Query("from"),
		To:         c.Query("to"),
		SortColumn: sortColumn,
		SortOrder:  sortOrder,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
	})
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSONWithMeta(c, http.StatusOK, surveys, httpx.BuildMeta(pagination, total))
}

func (h *SurveyHandler) Get(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	survey, err := h.service.Get(c.Request.Context(), actor, c.Param("id"))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, survey)
}

func (h *SurveyHandler) Create(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.CreateSurveyInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	survey, err := h.service.Create(c.Request.Context(), actor, input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusCreated, survey)
}

func (h *SurveyHandler) Update(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.CreateSurveyInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	survey, err := h.service.Update(c.Request.Context(), actor, c.Param("id"), input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, survey)
}

func (h *SurveyHandler) Delete(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	if err := h.service.Delete(c.Request.Context(), actor, c.Param("id"), requestMeta(c)); err != nil {
		httpx.FromError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
