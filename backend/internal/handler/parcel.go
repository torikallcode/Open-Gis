package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/httpx"
)

var parcelSortColumns = map[string]string{
	"created_at":  "p.created_at",
	"updated_at":  "p.updated_at",
	"parcel_code": "p.parcel_code",
	"status":      "p.verification_status",
	"area_m2":     "p.area_m2",
}

// ParcelService is the business interface required by the HTTP layer.
type ParcelService interface {
	List(ctx context.Context, actor access.Actor, filter domain.ParcelListFilter) ([]domain.Parcel, int, error)
	Get(ctx context.Context, actor access.Actor, id string) (domain.Parcel, error)
	Create(ctx context.Context, actor access.Actor, input domain.CreateParcelInput, meta domain.RequestMeta) (domain.Parcel, error)
	Update(ctx context.Context, actor access.Actor, id string, input domain.UpdateParcelInput, meta domain.RequestMeta) (domain.Parcel, error)
	Delete(ctx context.Context, actor access.Actor, id string, meta domain.RequestMeta) error
	UpdateGeometry(ctx context.Context, actor access.Actor, id string, input domain.UpdateGeometryInput, meta domain.RequestMeta) (domain.Parcel, error)
	UpdateStatus(ctx context.Context, actor access.Actor, id string, input domain.UpdateStatusInput, meta domain.RequestMeta) (domain.Parcel, error)
	Versions(ctx context.Context, actor access.Actor, id string) ([]domain.ParcelVersion, error)
	Features(ctx context.Context, actor access.Actor, projectID string) (map[string]any, error)
}

// ParcelHandler exposes parcel endpoints.
type ParcelHandler struct {
	service ParcelService
}

func NewParcelHandler(service ParcelService) *ParcelHandler {
	return &ParcelHandler{service: service}
}

func (h *ParcelHandler) List(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	pagination := httpx.ParsePagination(c)
	sortColumn, sortOrder := httpx.ParseSort(c, parcelSortColumns, "created_at")

	parcels, total, err := h.service.List(c.Request.Context(), actor, domain.ParcelListFilter{
		ProjectID:  c.Query("project_id"),
		SurveyID:   c.Query("survey_id"),
		Status:     c.Query("status"),
		Query:      c.Query("q"),
		SortColumn: sortColumn,
		SortOrder:  sortOrder,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
	})
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSONWithMeta(c, http.StatusOK, parcels, httpx.BuildMeta(pagination, total))
}

func (h *ParcelHandler) Get(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	parcel, err := h.service.Get(c.Request.Context(), actor, c.Param("id"))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, parcel)
}

func (h *ParcelHandler) Create(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.CreateParcelInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	parcel, err := h.service.Create(c.Request.Context(), actor, input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusCreated, parcel)
}

func (h *ParcelHandler) Update(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.UpdateParcelInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	parcel, err := h.service.Update(c.Request.Context(), actor, c.Param("id"), input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, parcel)
}

func (h *ParcelHandler) Delete(c *gin.Context) {
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

func (h *ParcelHandler) UpdateGeometry(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.UpdateGeometryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	parcel, err := h.service.UpdateGeometry(c.Request.Context(), actor, c.Param("id"), input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, parcel)
}

func (h *ParcelHandler) UpdateStatus(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.UpdateStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	parcel, err := h.service.UpdateStatus(c.Request.Context(), actor, c.Param("id"), input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, parcel)
}

func (h *ParcelHandler) Versions(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	versions, err := h.service.Versions(c.Request.Context(), actor, c.Param("id"))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, versions)
}

func (h *ParcelHandler) Features(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	collection, err := h.service.Features(c.Request.Context(), actor, c.Param("id"))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, collection)
}
