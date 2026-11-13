package domain

import (
	"encoding/json"
	"time"
)

// Survey statuses.
const (
	SurveyStatusDraft      = "draft"
	SurveyStatusInProgress = "in_progress"
	SurveyStatusCompleted  = "completed"
	SurveyStatusCancelled  = "cancelled"
)

var surveyStatuses = map[string]struct{}{
	SurveyStatusDraft:      {},
	SurveyStatusInProgress: {},
	SurveyStatusCompleted:  {},
	SurveyStatusCancelled:  {},
}

// IsValidSurveyStatus reports whether status is an allowed survey status.
func IsValidSurveyStatus(status string) bool {
	_, ok := surveyStatuses[status]
	return ok
}

// Survey is a survey activity inside a project.
type Survey struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	ProjectName string    `json:"project_name"`
	SurveyorID  string    `json:"surveyor_id"`
	Name        string    `json:"name"`
	SurveyDate  string    `json:"survey_date"`
	Method      string    `json:"method"`
	Status      string    `json:"status"`
	Notes       string    `json:"notes"`
	CreatedBy   string    `json:"created_by"`
	UpdatedBy   string    `json:"updated_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	PointCount  int       `json:"point_count"`
}

// SurveyListFilter carries validated list parameters.
type SurveyListFilter struct {
	ProjectID  string
	Status     string
	Query      string
	From       string
	To         string
	SortColumn string
	SortOrder  string
	Page       int
	PerPage    int
}

// CreateSurveyInput is the payload for creating or replacing a survey.
type CreateSurveyInput struct {
	ProjectID  string `json:"project_id"`
	SurveyorID string `json:"surveyor_id"`
	Name       string `json:"name"`
	SurveyDate string `json:"survey_date"`
	Method     string `json:"method"`
	Status     string `json:"status"`
	Notes      string `json:"notes"`
}

// SurveyArea is a project work area stored as a MultiPolygon in EPSG:4326.
type SurveyArea struct {
	ID         string          `json:"id"`
	ProjectID  string          `json:"project_id"`
	Name       string          `json:"name"`
	Boundary   json.RawMessage `json:"boundary"`
	AreaM2     float64         `json:"area_m2"`
	AreaMethod string          `json:"area_method"`
	CreatedBy  string          `json:"created_by"`
	UpdatedBy  string          `json:"updated_by"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

// CreateAreaInput is the payload for creating a survey area.
type CreateAreaInput struct {
	Name     string          `json:"name"`
	Boundary json.RawMessage `json:"boundary"`
}

// GeoPoint is an RFC 7946 point geometry.
type GeoPoint struct {
	Type        string     `json:"type"`
	Coordinates [2]float64 `json:"coordinates"`
}

// SurveyPoint is one measured point inside a survey.
type SurveyPoint struct {
	ID         string    `json:"id"`
	SurveyID   string    `json:"survey_id"`
	PointCode  string    `json:"point_code"`
	Location   GeoPoint  `json:"location"`
	AccuracyM  *float64  `json:"accuracy_m"`
	ElevationM *float64  `json:"elevation_m"`
	Source     string    `json:"source"`
	RecordedAt string    `json:"recorded_at"`
	CreatedBy  string    `json:"created_by"`
	UpdatedBy  string    `json:"updated_by"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CreatePointInput is the payload for creating or replacing a survey point.
type CreatePointInput struct {
	PointCode  string   `json:"point_code"`
	Location   GeoPoint `json:"location"`
	AccuracyM  *float64 `json:"accuracy_m"`
	ElevationM *float64 `json:"elevation_m"`
	Source     string   `json:"source"`
	RecordedAt string   `json:"recorded_at"`
}
