package service

import (
	"context"
	"encoding/json"
	"strings"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/audit"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/repository"
)

const maxAttributesBytes = 32 * 1024

// ParcelService contains parcel business rules, versioning, and auditing.
type ParcelService struct {
	pool     *pgxpool.Pool
	parcels  *repository.ParcelRepository
	projects *repository.ProjectRepository
	surveys  *repository.SurveyRepository
}

func NewParcelService(
	pool *pgxpool.Pool,
	parcels *repository.ParcelRepository,
	projects *repository.ProjectRepository,
	surveys *repository.SurveyRepository,
) *ParcelService {
	return &ParcelService{pool: pool, parcels: parcels, projects: projects, surveys: surveys}
}

// List returns parcels visible to the actor.
func (s *ParcelService) List(ctx context.Context, actor access.Actor, filter domain.ParcelListFilter) ([]domain.Parcel, int, error) {
	validation := domain.NewValidationError()

	if filter.ProjectID != "" && !uuidPattern.MatchString(filter.ProjectID) {
		validation.Add("project_id", "Format ID proyek tidak valid.")
	}
	if filter.SurveyID != "" && !uuidPattern.MatchString(filter.SurveyID) {
		validation.Add("survey_id", "Format ID survei tidak valid.")
	}
	if filter.Status != "" && !domain.IsValidParcelStatus(filter.Status) {
		validation.Add("status", "Status bidang tidak dikenal.")
	}
	if validation.HasErrors() {
		return nil, 0, validation
	}

	return s.parcels.List(ctx, actor.ID, actor.IsAdmin, filter)
}

// Get loads one parcel for project members.
func (s *ParcelService) Get(ctx context.Context, actor access.Actor, id string) (domain.Parcel, error) {
	if err := validateUUID(id, "id"); err != nil {
		return domain.Parcel{}, err
	}

	parcel, _, err := loadParcelWithAccess(ctx, s.parcels, s.projects, actor, id)
	return parcel, err
}

// Create inserts a parcel and its initial version.
func (s *ParcelService) Create(ctx context.Context, actor access.Actor, input domain.CreateParcelInput, meta domain.RequestMeta) (domain.Parcel, error) {
	if err := validateUUID(input.ProjectID, "project_id"); err != nil {
		return domain.Parcel{}, err
	}

	project, role, err := resolveProjectRole(ctx, s.projects, actor, input.ProjectID)
	if err != nil {
		return domain.Parcel{}, err
	}
	if !actor.CanWriteSurvey(role) {
		return domain.Parcel{}, domain.ErrForbidden
	}

	if validation := validateParcelCreateInput(&input); validation != nil {
		return domain.Parcel{}, validation
	}
	if err := s.validateSurvey(ctx, project.ID, input.SurveyID); err != nil {
		return domain.Parcel{}, err
	}
	if err := s.validateGeometry(ctx, project.ID, input.Boundary); err != nil {
		return domain.Parcel{}, err
	}

	var parcel domain.Parcel
	err = withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		created, err := s.parcels.Create(ctx, tx, input, project.CRSEPSG, actor.ID)
		if err != nil {
			return err
		}
		parcel = created

		if err := s.parcels.InsertVersion(ctx, tx, created, "Pembuatan bidang", actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  project.ID,
			Action:     "parcel.create",
			EntityType: "parcel",
			EntityID:   created.ID,
			After:      created,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.Parcel{}, err
	}
	return parcel, nil
}

// Update changes non-spatial attributes and creates a new version.
func (s *ParcelService) Update(ctx context.Context, actor access.Actor, id string, input domain.UpdateParcelInput, meta domain.RequestMeta) (domain.Parcel, error) {
	if err := validateUUID(id, "id"); err != nil {
		return domain.Parcel{}, err
	}

	before, role, err := loadParcelWithAccess(ctx, s.parcels, s.projects, actor, id)
	if err != nil {
		return domain.Parcel{}, err
	}
	if !actor.CanWriteSurvey(role) {
		return domain.Parcel{}, domain.ErrForbidden
	}
	if !parcelEditable(before.VerificationStatus) {
		return domain.Parcel{}, lockedParcelError(before.VerificationStatus)
	}

	if validation := validateParcelUpdateInput(&input); validation != nil {
		return domain.Parcel{}, validation
	}
	if err := s.validateSurvey(ctx, before.ProjectID, input.SurveyID); err != nil {
		return domain.Parcel{}, err
	}

	var parcel domain.Parcel
	err = withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		updated, err := s.parcels.UpdateAttributes(ctx, tx, id, input, actor.ID)
		if err != nil {
			return err
		}
		parcel = updated

		if err := s.parcels.InsertVersion(ctx, tx, updated, "Perubahan atribut", actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  before.ProjectID,
			Action:     "parcel.update",
			EntityType: "parcel",
			EntityID:   id,
			Before:     before,
			After:      updated,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.Parcel{}, err
	}
	return parcel, nil
}

// UpdateGeometry replaces the boundary and creates a new version.
func (s *ParcelService) UpdateGeometry(ctx context.Context, actor access.Actor, id string, input domain.UpdateGeometryInput, meta domain.RequestMeta) (domain.Parcel, error) {
	if err := validateUUID(id, "id"); err != nil {
		return domain.Parcel{}, err
	}

	before, role, err := loadParcelWithAccess(ctx, s.parcels, s.projects, actor, id)
	if err != nil {
		return domain.Parcel{}, err
	}
	if !actor.CanWriteSurvey(role) {
		return domain.Parcel{}, domain.ErrForbidden
	}
	if !parcelEditable(before.VerificationStatus) {
		return domain.Parcel{}, lockedParcelError(before.VerificationStatus)
	}

	validation := domain.NewValidationError()
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	if len(input.Boundary) == 0 || !json.Valid(input.Boundary) {
		validation.Add("boundary", "Boundary harus berupa objek GeoJSON yang valid.")
	} else {
		var geometry struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(input.Boundary, &geometry); err != nil ||
			(geometry.Type != "Polygon" && geometry.Type != "MultiPolygon") {
			validation.Add("boundary", "Boundary harus GeoJSON Polygon atau MultiPolygon.")
		}
	}
	if utf8.RuneCountInString(input.ChangeReason) > 1000 {
		validation.Add("change_reason", "Alasan perubahan maksimal 1000 karakter.")
	}
	if validation.HasErrors() {
		return domain.Parcel{}, validation
	}

	project, err := s.projects.Get(ctx, before.ProjectID)
	if err != nil {
		return domain.Parcel{}, err
	}
	if err := s.validateGeometry(ctx, project.ID, input.Boundary); err != nil {
		return domain.Parcel{}, err
	}

	reason := input.ChangeReason
	if reason == "" {
		reason = "Perubahan geometri"
	}

	var parcel domain.Parcel
	err = withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		updated, err := s.parcels.UpdateGeometry(ctx, tx, id, input.Boundary, project.CRSEPSG, actor.ID)
		if err != nil {
			return err
		}
		parcel = updated

		if err := s.parcels.InsertVersion(ctx, tx, updated, reason, actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  before.ProjectID,
			Action:     "parcel.geometry",
			EntityType: "parcel",
			EntityID:   id,
			Before:     before,
			After:      updated,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.Parcel{}, err
	}
	return parcel, nil
}

// UpdateStatus applies a workflow transition and creates a new version.
func (s *ParcelService) UpdateStatus(ctx context.Context, actor access.Actor, id string, input domain.UpdateStatusInput, meta domain.RequestMeta) (domain.Parcel, error) {
	if err := validateUUID(id, "id"); err != nil {
		return domain.Parcel{}, err
	}

	before, role, err := loadParcelWithAccess(ctx, s.parcels, s.projects, actor, id)
	if err != nil {
		return domain.Parcel{}, err
	}

	validation := domain.NewValidationError()
	input.Status = strings.TrimSpace(input.Status)
	input.Note = strings.TrimSpace(input.Note)

	if !domain.IsValidParcelStatus(input.Status) {
		validation.Add("status", "Status bidang tidak dikenal.")
	} else if input.Status == before.VerificationStatus {
		validation.Add("status", "Status tujuan sama dengan status saat ini.")
	} else if !canTransitionParcel(actor, role, before.VerificationStatus, input.Status) {
		validation.Add("status", "Transisi status tidak diizinkan untuk peran Anda.")
	}
	if utf8.RuneCountInString(input.Note) > 1000 {
		validation.Add("note", "Catatan maksimal 1000 karakter.")
	}
	if validation.HasErrors() {
		return domain.Parcel{}, validation
	}

	var parcel domain.Parcel
	err = withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		updated, err := s.parcels.UpdateStatus(ctx, tx, id, input.Status, input.Note, actor.ID)
		if err != nil {
			return err
		}
		parcel = updated

		reason := "Status: " + before.VerificationStatus + " → " + input.Status
		if input.Note != "" {
			reason += " (" + input.Note + ")"
		}
		if err := s.parcels.InsertVersion(ctx, tx, updated, reason, actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  before.ProjectID,
			Action:     "parcel.status",
			EntityType: "parcel",
			EntityID:   id,
			Before:     before,
			After:      updated,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.Parcel{}, err
	}
	return parcel, nil
}

// Delete soft-deletes a parcel. Only managers and admins may delete.
func (s *ParcelService) Delete(ctx context.Context, actor access.Actor, id string, meta domain.RequestMeta) error {
	if err := validateUUID(id, "id"); err != nil {
		return err
	}

	parcel, role, err := loadParcelWithAccess(ctx, s.parcels, s.projects, actor, id)
	if err != nil {
		return err
	}
	if !actor.CanManageProject(role) {
		return domain.ErrForbidden
	}

	return withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.parcels.SoftDelete(ctx, tx, id, actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  parcel.ProjectID,
			Action:     "parcel.delete",
			EntityType: "parcel",
			EntityID:   id,
			Before:     parcel,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
}

// Versions returns the immutable version history.
func (s *ParcelService) Versions(ctx context.Context, actor access.Actor, id string) ([]domain.ParcelVersion, error) {
	if err := validateUUID(id, "id"); err != nil {
		return nil, err
	}
	if _, _, err := loadParcelWithAccess(ctx, s.parcels, s.projects, actor, id); err != nil {
		return nil, err
	}

	return s.parcels.ListVersions(ctx, id)
}

// Features returns parcels of a project as a GeoJSON FeatureCollection.
func (s *ParcelService) Features(ctx context.Context, actor access.Actor, projectID string) (map[string]any, error) {
	if err := validateUUID(projectID, "id"); err != nil {
		return nil, err
	}
	if _, _, err := resolveProjectRole(ctx, s.projects, actor, projectID); err != nil {
		return nil, err
	}

	parcels, err := s.parcels.ListFeatures(ctx, projectID)
	if err != nil {
		return nil, err
	}

	features := make([]map[string]any, 0, len(parcels))
	for _, parcel := range parcels {
		features = append(features, map[string]any{
			"type":     "Feature",
			"geometry": parcel.Boundary,
			"properties": map[string]any{
				"id":                  parcel.ID,
				"parcel_code":         parcel.Code,
				"land_use":            parcel.LandUse,
				"verification_status": parcel.Status,
				"survey_id":           parcel.SurveyID,
			},
		})
	}

	return map[string]any{
		"type":     "FeatureCollection",
		"features": features,
	}, nil
}

func loadParcelWithAccess(
	ctx context.Context,
	parcels *repository.ParcelRepository,
	projects *repository.ProjectRepository,
	actor access.Actor,
	id string,
) (domain.Parcel, string, error) {
	parcel, err := parcels.Get(ctx, id)
	if err != nil {
		return domain.Parcel{}, "", err
	}

	_, role, err := resolveProjectRole(ctx, projects, actor, parcel.ProjectID)
	if err != nil {
		return domain.Parcel{}, "", err
	}

	return parcel, role, nil
}

func (s *ParcelService) validateSurvey(ctx context.Context, projectID, surveyID string) error {
	if surveyID == "" {
		return nil
	}
	if !uuidPattern.MatchString(surveyID) {
		validation := domain.NewValidationError()
		validation.Add("survey_id", "Format ID survei tidak valid.")
		return validation
	}

	survey, err := s.surveys.Get(ctx, surveyID)
	if err != nil {
		if err == domain.ErrNotFound {
			validation := domain.NewValidationError()
			validation.Add("survey_id", "Survei tidak ditemukan.")
			return validation
		}
		return err
	}
	if survey.ProjectID != projectID {
		validation := domain.NewValidationError()
		validation.Add("survey_id", "Survei bukan milik proyek yang sama.")
		return validation
	}
	return nil
}

func (s *ParcelService) validateGeometry(ctx context.Context, projectID string, boundary []byte) error {
	info, err := s.parcels.ValidateGeometry(ctx, projectID, boundary)
	if err != nil {
		if isDataException(err) {
			validation := domain.NewValidationError()
			validation.Add("boundary", "Geometri tidak dapat dibaca. Kirim GeoJSON Polygon atau MultiPolygon.")
			return validation
		}
		return err
	}

	if info.GeometryType != "ST_MultiPolygon" || !info.Valid || info.Empty || info.AreaM2 <= 0 {
		validation := domain.NewValidationError()
		validation.Add("boundary", "Geometri harus polygon valid, tidak kosong, dan memiliki luas.")
		return validation
	}
	return nil
}

func validateParcelCreateInput(input *domain.CreateParcelInput) *domain.ValidationError {
	validation := domain.NewValidationError()

	input.ParcelCode = strings.TrimSpace(input.ParcelCode)
	input.LandUse = strings.TrimSpace(input.LandUse)
	input.Notes = strings.TrimSpace(input.Notes)
	input.SurveyID = strings.TrimSpace(input.SurveyID)

	validateParcelFields(validation, input.ParcelCode, input.LandUse, input.Notes)

	attributes, ok := normalizeParcelAttributes(input.Attributes)
	if !ok {
		validation.Add("attributes", "Atribut harus objek JSON dengan ukuran maksimal 32 KB.")
	} else {
		input.Attributes = attributes
	}

	if len(input.Boundary) == 0 || !json.Valid(input.Boundary) {
		validation.Add("boundary", "Boundary harus berupa objek GeoJSON yang valid.")
	} else {
		var geometry struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(input.Boundary, &geometry); err != nil ||
			(geometry.Type != "Polygon" && geometry.Type != "MultiPolygon") {
			validation.Add("boundary", "Boundary harus GeoJSON Polygon atau MultiPolygon.")
		}
	}

	if validation.HasErrors() {
		return validation
	}
	return nil
}

func validateParcelUpdateInput(input *domain.UpdateParcelInput) *domain.ValidationError {
	validation := domain.NewValidationError()

	input.ParcelCode = strings.TrimSpace(input.ParcelCode)
	input.LandUse = strings.TrimSpace(input.LandUse)
	input.Notes = strings.TrimSpace(input.Notes)
	input.SurveyID = strings.TrimSpace(input.SurveyID)

	validateParcelFields(validation, input.ParcelCode, input.LandUse, input.Notes)

	attributes, ok := normalizeParcelAttributes(input.Attributes)
	if !ok {
		validation.Add("attributes", "Atribut harus objek JSON dengan ukuran maksimal 32 KB.")
	} else {
		input.Attributes = attributes
	}

	if validation.HasErrors() {
		return validation
	}
	return nil
}

func validateParcelFields(validation *domain.ValidationError, code, landUse, notes string) {
	if code == "" {
		validation.Add("parcel_code", "Kode bidang wajib diisi.")
	} else if utf8.RuneCountInString(code) > 50 {
		validation.Add("parcel_code", "Kode bidang maksimal 50 karakter.")
	}

	if utf8.RuneCountInString(landUse) > 100 {
		validation.Add("land_use", "Penggunaan lahan maksimal 100 karakter.")
	}
	if utf8.RuneCountInString(notes) > 5000 {
		validation.Add("notes", "Catatan maksimal 5000 karakter.")
	}
}

func normalizeParcelAttributes(raw json.RawMessage) (json.RawMessage, bool) {
	if len(raw) == 0 {
		return json.RawMessage(`{}`), true
	}
	if len(raw) > maxAttributesBytes || !json.Valid(raw) {
		return nil, false
	}

	var object map[string]any
	if err := json.Unmarshal(raw, &object); err != nil {
		return nil, false
	}

	normalized, err := json.Marshal(object)
	if err != nil {
		return nil, false
	}
	return json.RawMessage(normalized), true
}

func parcelEditable(status string) bool {
	return status == domain.ParcelStatusDraft || status == domain.ParcelStatusRejected
}

func lockedParcelError(status string) error {
	validation := domain.NewValidationError()
	validation.Add("status", "Bidang berstatus "+status+" tidak dapat diubah. Kembalikan ke draft terlebih dahulu.")
	return validation
}

func canTransitionParcel(actor access.Actor, projectRole, from, to string) bool {
	switch {
	case from == domain.ParcelStatusDraft && to == domain.ParcelStatusSubmitted:
		return actor.CanWriteSurvey(projectRole)
	case from == domain.ParcelStatusSubmitted && to == domain.ParcelStatusUnderReview:
		return canReviewParcel(actor, projectRole)
	case from == domain.ParcelStatusUnderReview &&
		(to == domain.ParcelStatusApproved || to == domain.ParcelStatusRejected):
		return canReviewParcel(actor, projectRole)
	case from == domain.ParcelStatusRejected && to == domain.ParcelStatusDraft:
		return actor.CanWriteSurvey(projectRole)
	default:
		return false
	}
}

func canReviewParcel(actor access.Actor, projectRole string) bool {
	return actor.IsAdmin || projectRole == "manager" || projectRole == "supervisor"
}
