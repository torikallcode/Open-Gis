package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/httpx"
)

var projectSortColumns = map[string]string{
	"created_at": "p.created_at",
	"updated_at": "p.updated_at",
	"name":       "p.name",
	"status":     "p.status",
	"start_date": "p.start_date",
}

// ProjectService is the business interface required by the HTTP layer.
type ProjectService interface {
	List(ctx context.Context, actor access.Actor, filter domain.ProjectListFilter) ([]domain.Project, int, error)
	Get(ctx context.Context, actor access.Actor, id string) (domain.Project, error)
	Create(ctx context.Context, actor access.Actor, input domain.CreateProjectInput, meta domain.RequestMeta) (domain.Project, error)
	Update(ctx context.Context, actor access.Actor, id string, input domain.CreateProjectInput, meta domain.RequestMeta) (domain.Project, error)
	Delete(ctx context.Context, actor access.Actor, id string, meta domain.RequestMeta) error
	ListMembers(ctx context.Context, actor access.Actor, projectID string) ([]domain.ProjectMember, error)
	AddMember(ctx context.Context, actor access.Actor, projectID string, input domain.AddMemberInput, meta domain.RequestMeta) (domain.ProjectMember, error)
	UpdateMemberRole(ctx context.Context, actor access.Actor, projectID, userID string, input domain.UpdateMemberInput, meta domain.RequestMeta) (domain.ProjectMember, error)
	RemoveMember(ctx context.Context, actor access.Actor, projectID, userID string, meta domain.RequestMeta) error
}

// ProjectHandler exposes project and membership endpoints.
type ProjectHandler struct {
	service ProjectService
}

func NewProjectHandler(service ProjectService) *ProjectHandler {
	return &ProjectHandler{service: service}
}

func (h *ProjectHandler) List(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	pagination := httpx.ParsePagination(c)
	sortColumn, sortOrder := httpx.ParseSort(c, projectSortColumns, "created_at")

	projects, total, err := h.service.List(c.Request.Context(), actor, domain.ProjectListFilter{
		Query:      c.Query("q"),
		Status:     c.Query("status"),
		SortColumn: sortColumn,
		SortOrder:  sortOrder,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
	})
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSONWithMeta(c, http.StatusOK, projects, httpx.BuildMeta(pagination, total))
}

func (h *ProjectHandler) Get(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	project, err := h.service.Get(c.Request.Context(), actor, c.Param("id"))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, project)
}

func (h *ProjectHandler) Create(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.CreateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	project, err := h.service.Create(c.Request.Context(), actor, input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusCreated, project)
}

func (h *ProjectHandler) Update(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.CreateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	project, err := h.service.Update(c.Request.Context(), actor, c.Param("id"), input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, project)
}

func (h *ProjectHandler) Delete(c *gin.Context) {
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

func (h *ProjectHandler) ListMembers(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	members, err := h.service.ListMembers(c.Request.Context(), actor, c.Param("id"))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, members)
}

func (h *ProjectHandler) AddMember(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.AddMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	member, err := h.service.AddMember(c.Request.Context(), actor, c.Param("id"), input, requestMeta(c))
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusCreated, member)
}

func (h *ProjectHandler) UpdateMemberRole(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	var input domain.UpdateMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		httpx.Error(c, http.StatusUnprocessableEntity, "validation_error", "Body JSON tidak valid.", nil)
		return
	}

	member, err := h.service.UpdateMemberRole(
		c.Request.Context(),
		actor,
		c.Param("id"),
		c.Param("userId"),
		input,
		requestMeta(c),
	)
	if err != nil {
		httpx.FromError(c, err)
		return
	}

	httpx.JSON(c, http.StatusOK, member)
}

func (h *ProjectHandler) RemoveMember(c *gin.Context) {
	actor, ok := currentActor(c)
	if !ok {
		return
	}

	if err := h.service.RemoveMember(
		c.Request.Context(),
		actor,
		c.Param("id"),
		c.Param("userId"),
		requestMeta(c),
	); err != nil {
		httpx.FromError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

func currentActor(c *gin.Context) (access.Actor, bool) {
	actor, ok := access.FromContext(c)
	if !ok {
		httpx.Error(c, http.StatusUnauthorized, "unauthenticated", "Aktor tidak tersedia.", nil)
		return access.Actor{}, false
	}
	return actor, true
}

func requestMeta(c *gin.Context) domain.RequestMeta {
	return domain.RequestMeta{
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		RequestID: c.GetString(httpx.RequestIDKey),
	}
}
