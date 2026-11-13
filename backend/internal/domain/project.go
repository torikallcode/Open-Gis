package domain

import (
	"errors"
	"time"
)

// Sentinel errors mapped to HTTP status codes by the transport layer.
var (
	ErrNotFound  = errors.New("not found")
	ErrForbidden = errors.New("forbidden")
	ErrConflict  = errors.New("conflict")
)

// Project statuses.
const (
	ProjectStatusPlanning  = "planning"
	ProjectStatusActive    = "active"
	ProjectStatusOnHold    = "on_hold"
	ProjectStatusCompleted = "completed"
	ProjectStatusArchived  = "archived"
)

// Project roles.
const (
	ProjectRoleManager    = "manager"
	ProjectRoleSurveyor   = "surveyor"
	ProjectRoleGIS        = "gis_analyst"
	ProjectRoleSupervisor = "supervisor"
	ProjectRoleViewer     = "viewer"
)

var projectStatuses = map[string]struct{}{
	ProjectStatusPlanning:  {},
	ProjectStatusActive:    {},
	ProjectStatusOnHold:    {},
	ProjectStatusCompleted: {},
	ProjectStatusArchived:  {},
}

var projectRoles = map[string]struct{}{
	ProjectRoleManager:    {},
	ProjectRoleSurveyor:   {},
	ProjectRoleGIS:        {},
	ProjectRoleSupervisor: {},
	ProjectRoleViewer:     {},
}

// IsValidProjectStatus reports whether status is an allowed project status.
func IsValidProjectStatus(status string) bool {
	_, ok := projectStatuses[status]
	return ok
}

// IsValidProjectRole reports whether role is an allowed project role.
func IsValidProjectRole(role string) bool {
	_, ok := projectRoles[role]
	return ok
}

// Project is a survey project.
type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Location    string    `json:"location"`
	CRSEPSG     int       `json:"crs_epsg"`
	Status      string    `json:"status"`
	StartDate   string    `json:"start_date"`
	EndDate     string    `json:"end_date"`
	CreatedBy   string    `json:"created_by"`
	UpdatedBy   string    `json:"updated_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	MemberRole  string    `json:"member_role,omitempty"`
}

// ProjectMember is a user's membership in a project.
type ProjectMember struct {
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	ProjectRole string    `json:"project_role"`
	JoinedAt    time.Time `json:"joined_at"`
}

// CreateProjectInput is the payload for creating or replacing a project.
type CreateProjectInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Location    string `json:"location"`
	CRSEPSG     int    `json:"crs_epsg"`
	Status      string `json:"status"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
}

// AddMemberInput is the payload for adding a project member.
type AddMemberInput struct {
	Email       string `json:"email"`
	ProjectRole string `json:"project_role"`
}

// UpdateMemberInput is the payload for changing a project member role.
type UpdateMemberInput struct {
	ProjectRole string `json:"project_role"`
}

// ProjectListFilter carries validated list parameters.
type ProjectListFilter struct {
	Query      string
	Status     string
	SortColumn string
	SortOrder  string
	Page       int
	PerPage    int
}

// RequestMeta carries request metadata for audit logging.
type RequestMeta struct {
	IPAddress string
	UserAgent string
	RequestID string
}
