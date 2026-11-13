package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/httpx"
)

// SurveyPointService is the business interface required by the HTTP layer.
type SurveyPointService interface {
	List(ctx context.Context, actor access.Actor, surveyID string) ([]domain.SurveyPoint, error)
	Create(ctx context.Context, actor access.Actor, surveyID string, input domain.CreatePointInput, meta domain.RequestMeta) (domain.SurveyPoint, error)
	Update(ctx context.Context, actor access.Actor, surveyID, pointID string, input domain.CreatePointInput, meta domain.RequestMeta) (domain.SurveyPoint, error)
	Delete(ctx context.Context, actor access.Actor, surveyID, pointID string, meta domain.RequestMeta) error
}

// SurveyPointHandler exposes survey point endpoints.
type SurveyPointHandler struct {
	service SurveyPointService
}

func NewSurveyPointHandler(service SurveyPointService) *SurveyPointHandler {
	return &SurveyPointHandler{service: service}
}

func (h *SurveyPointHandler) List(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	points, err := h.service.List(c.Request.Context(), actor, c.Param("id"))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, points)
}

func (h *SurveyPointHandler) Create(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.CreatePointInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	point, err := h.service.Create(c.Request.Context(), actor, c.Param("id"), input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusCreated, point)
}

func (h *SurveyPointHandler) Update(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.CreatePointInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	point, err := h.service.Update(
		c.Request.Context(),
		actor,
		c.Param("id"),
		c.Param("pointId"),
		input,
		requestMeta(c),
	)
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, point)
}

func (h *SurveyPointHandler) Delete(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	if err := h.service.Delete(
		c.Request.Context(),
		actor,
		c.Param("id"),
		c.Param("pointId"),
		requestMeta(c),
	); err != nil {
		httpx.FromError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
