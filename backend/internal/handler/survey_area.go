package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/httpx"
)

// SurveyAreaService is the business interface required by the HTTP layer.
type SurveyAreaService interface {
	List(ctx context.Context, actor access.Actor, projectID string) ([]domain.SurveyArea, error)
	Create(ctx context.Context, actor access.Actor, projectID string, input domain.CreateAreaInput, meta domain.RequestMeta) (domain.SurveyArea, error)
	Delete(ctx context.Context, actor access.Actor, id string, meta domain.RequestMeta) error
}

// SurveyAreaHandler exposes project work-area endpoints.
type SurveyAreaHandler struct {
	service SurveyAreaService
}

func NewSurveyAreaHandler(service SurveyAreaService) *SurveyAreaHandler {
	return &SurveyAreaHandler{service: service}
}

func (h *SurveyAreaHandler) List(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	areas, err := h.service.List(c.Request.Context(), actor, c.Param("id"))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, areas)
}

func (h *SurveyAreaHandler) Create(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.CreateAreaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	area, err := h.service.Create(c.Request.Context(), actor, c.Param("id"), input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusCreated, area)
}

func (h *SurveyAreaHandler) Delete(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	if err := h.service.Delete(c.Request.Context(), actor, c.Param("areaId"), requestMeta(c)); err != nil {
		httpx.FromError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
