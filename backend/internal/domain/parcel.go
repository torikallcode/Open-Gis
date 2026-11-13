package domain

import (
	"encoding/json"
	"time"
)

// Parcel verification statuses.
const (
	ParcelStatusDraft       = "draft"
	ParcelStatusSubmitted   = "submitted"
	ParcelStatusUnderReview = "under_review"
	ParcelStatusApproved    = "approved"
	ParcelStatusRejected    = "rejected"
)

var parcelStatuses = map[string]struct{}{
	ParcelStatusDraft:       {},
	ParcelStatusSubmitted:   {},
	ParcelStatusUnderReview: {},
	ParcelStatusApproved:    {},
	ParcelStatusRejected:    {},
}

// IsValidParcelStatus reports whether status is an allowed parcel status.
func IsValidParcelStatus(status string) bool {
	_, ok := parcelStatuses[status]
	return ok
}

// Parcel is a land parcel inside a project.
type Parcel struct {
	ID                 string          `json:"id"`
	ProjectID          string          `json:"project_id"`
	SurveyID           string          `json:"survey_id"`
	ParcelCode         string          `json:"parcel_code"`
	LandUse            string          `json:"land_use"`
	Notes              string          `json:"notes"`
	Attributes         json.RawMessage `json:"attributes"`
	Boundary           json.RawMessage `json:"boundary"`
	AreaM2             float64         `json:"area_m2"`
	AreaMethod         string          `json:"area_method"`
	VerificationStatus string          `json:"verification_status"`
	ReviewNote         string          `json:"review_note"`
	CurrentVersion     int             `json:"current_version"`
	CreatedBy          string          `json:"created_by"`
	UpdatedBy          string          `json:"updated_by"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// ParcelVersion is an immutable snapshot of a parcel state.
type ParcelVersion struct {
	ID                 string          `json:"id"`
	ParcelID           string          `json:"parcel_id"`
	VersionNumber      int             `json:"version_number"`
	ParcelCode         string          `json:"parcel_code"`
	LandUse            string          `json:"land_use"`
	Notes              string          `json:"notes"`
	Attributes         json.RawMessage `json:"attributes"`
	Boundary           json.RawMessage `json:"boundary"`
	AreaM2             float64         `json:"area_m2"`
	VerificationStatus string          `json:"verification_status"`
	ChangeReason       string          `json:"change_reason"`
	ChangedBy          string          `json:"changed_by"`
	CreatedAt          time.Time       `json:"created_at"`
}

// CreateParcelInput is the payload for creating a parcel.
type CreateParcelInput struct {
	ProjectID  string          `json:"project_id"`
	SurveyID   string          `json:"survey_id"`
	ParcelCode string          `json:"parcel_code"`
	LandUse    string          `json:"land_use"`
	Notes      string          `json:"notes"`
	Attributes json.RawMessage `json:"attributes"`
	Boundary   json.RawMessage `json:"boundary"`
}

// UpdateParcelInput is the payload for updating parcel attributes.
type UpdateParcelInput struct {
	SurveyID   string          `json:"survey_id"`
	ParcelCode string          `json:"parcel_code"`
	LandUse    string          `json:"land_use"`
	Notes      string          `json:"notes"`
	Attributes json.RawMessage `json:"attributes"`
}

// UpdateGeometryInput is the payload for replacing a parcel boundary.
type UpdateGeometryInput struct {
	Boundary     json.RawMessage `json:"boundary"`
	ChangeReason string          `json:"change_reason"`
}

// UpdateStatusInput is the payload for a parcel status transition.
type UpdateStatusInput struct {
	Status string `json:"status"`
	Note   string `json:"note"`
}

// ParcelListFilter carries validated list parameters.
type ParcelListFilter struct {
	ProjectID  string
	SurveyID   string
	Status     string
	Query      string
	SortColumn string
	SortOrder  string
	Page       int
	PerPage    int
}

// ParcelFeature is one parcel rendered as a GeoJSON feature.
type ParcelFeature struct {
	ID       string
	Code     string
	LandUse  string
	Status   string
	SurveyID string
	Boundary json.RawMessage
}
