package service

import (
	"context"
	"math"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/audit"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/repository"
)

var pointTimeLayouts = []string{
	time.RFC3339,
	"2006-01-02T15:04",
	"2006-01-02T15:04:05",
	"2006-01-02",
}

// SurveyPointService contains point business rules and auditing.
type SurveyPointService struct {
	pool     *pgxpool.Pool
	points   *repository.SurveyPointRepository
	surveys  *repository.SurveyRepository
	projects *repository.ProjectRepository
}

func NewSurveyPointService(
	pool *pgxpool.Pool,
	points *repository.SurveyPointRepository,
	surveys *repository.SurveyRepository,
	projects *repository.ProjectRepository,
) *SurveyPointService {
	return &SurveyPointService{pool: pool, points: points, surveys: surveys, projects: projects}
}

// List returns points of a survey for members and admins.
func (s *SurveyPointService) List(ctx context.Context, actor access.Actor, surveyID string) ([]domain.SurveyPoint, error) {
	if err := validateUUID(surveyID, "survey_id"); err != nil {
		return nil, err
	}
	if _, _, err := loadSurveyWithAccess(ctx, s.surveys, s.projects, actor, surveyID); err != nil {
		return nil, err
	}

	return s.points.List(ctx, surveyID)
}

// Create adds a point to a survey.
func (s *SurveyPointService) Create(ctx context.Context, actor access.Actor, surveyID string, input domain.CreatePointInput, meta domain.RequestMeta) (domain.SurveyPoint, error) {
	if err := validateUUID(surveyID, "survey_id"); err != nil {
		return domain.SurveyPoint{}, err
	}

	survey, role, err := loadSurveyWithAccess(ctx, s.surveys, s.projects, actor, surveyID)
	if err != nil {
		return domain.SurveyPoint{}, err
	}
	if !actor.CanWriteSurvey(role) {
		return domain.SurveyPoint{}, domain.ErrForbidden
	}

	if validation := validatePointInput(&input); validation != nil {
		return domain.SurveyPoint{}, validation
	}

	var point domain.SurveyPoint
	err = withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		created, err := s.points.Create(ctx, tx, surveyID, input, actor.ID)
		if err != nil {
			return err
		}
		point = created

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  survey.ProjectID,
			Action:     "survey.point.create",
			EntityType: "survey_point",
			EntityID:   created.ID,
			After:      created,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.SurveyPoint{}, err
	}
	return point, nil
}

// Update replaces a survey point.
func (s *SurveyPointService) Update(ctx context.Context, actor access.Actor, surveyID, pointID string, input domain.CreatePointInput, meta domain.RequestMeta) (domain.SurveyPoint, error) {
	if err := validateUUID(surveyID, "survey_id"); err != nil {
		return domain.SurveyPoint{}, err
	}
	if err := validateUUID(pointID, "point_id"); err != nil {
		return domain.SurveyPoint{}, err
	}

	survey, role, err := loadSurveyWithAccess(ctx, s.surveys, s.projects, actor, surveyID)
	if err != nil {
		return domain.SurveyPoint{}, err
	}
	if !actor.CanWriteSurvey(role) {
		return domain.SurveyPoint{}, domain.ErrForbidden
	}

	before, err := s.points.Get(ctx, surveyID, pointID)
	if err != nil {
		return domain.SurveyPoint{}, err
	}

	if validation := validatePointInput(&input); validation != nil {
		return domain.SurveyPoint{}, validation
	}

	var point domain.SurveyPoint
	err = withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		updated, err := s.points.Update(ctx, tx, surveyID, pointID, input, actor.ID)
		if err != nil {
			return err
		}
		point = updated

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  survey.ProjectID,
			Action:     "survey.point.update",
			EntityType: "survey_point",
			EntityID:   pointID,
			Before:     before,
			After:      updated,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.SurveyPoint{}, err
	}
	return point, nil
}

// Delete removes a survey point permanently, recording the snapshot in audit.
func (s *SurveyPointService) Delete(ctx context.Context, actor access.Actor, surveyID, pointID string, meta domain.RequestMeta) error {
	if err := validateUUID(surveyID, "survey_id"); err != nil {
		return err
	}
	if err := validateUUID(pointID, "point_id"); err != nil {
		return err
	}

	survey, role, err := loadSurveyWithAccess(ctx, s.surveys, s.projects, actor, surveyID)
	if err != nil {
		return err
	}
	if !actor.CanWriteSurvey(role) {
		return domain.ErrForbidden
	}

	before, err := s.points.Get(ctx, surveyID, pointID)
	if err != nil {
		return err
	}

	return withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.points.Delete(ctx, tx, surveyID, pointID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  survey.ProjectID,
			Action:     "survey.point.delete",
			EntityType: "survey_point",
			EntityID:   pointID,
			Before:     before,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
}

func validatePointInput(input *domain.CreatePointInput) *domain.ValidationError {
	validation := domain.NewValidationError()

	input.PointCode = strings.TrimSpace(input.PointCode)
	input.Source = strings.TrimSpace(input.Source)
	input.RecordedAt = strings.TrimSpace(input.RecordedAt)

	if input.PointCode == "" {
		validation.Add("point_code", "Kode titik wajib diisi.")
	} else if utf8.RuneCountInString(input.PointCode) > 50 {
		validation.Add("point_code", "Kode titik maksimal 50 karakter.")
	}

	if input.Location.Type != "Point" {
		validation.Add("location", "Location harus GeoJSON dengan type Point.")
	} else {
		lon := input.Location.Coordinates[0]
		lat := input.Location.Coordinates[1]
		if math.IsNaN(lon) || math.IsNaN(lat) || math.IsInf(lon, 0) || math.IsInf(lat, 0) {
			validation.Add("location", "Koordinat titik tidak valid.")
		} else if lon < -180 || lon > 180 {
			validation.Add("location", "Longitude harus berada di antara -180 dan 180.")
		} else if lat < -90 || lat > 90 {
			validation.Add("location", "Latitude harus berada di antara -90 dan 90.")
		}
	}

	if input.AccuracyM != nil {
		if math.IsNaN(*input.AccuracyM) || math.IsInf(*input.AccuracyM, 0) || *input.AccuracyM < 0 {
			validation.Add("accuracy_m", "Akurasi harus berupa angka >= 0.")
		}
	}

	if input.ElevationM != nil && (math.IsNaN(*input.ElevationM) || math.IsInf(*input.ElevationM, 0)) {
		validation.Add("elevation_m", "Elevasi harus berupa angka.")
	}

	if utf8.RuneCountInString(input.Source) > 100 {
		validation.Add("source", "Sumber maksimal 100 karakter.")
	}

	if input.RecordedAt != "" && !validTime(input.RecordedAt) {
		validation.Add("recorded_at", "Waktu pencatatan tidak valid (gunakan format ISO 8601).")
	}

	if validation.HasErrors() {
		return validation
	}
	return nil
}

func validTime(value string) bool {
	for _, layout := range pointTimeLayouts {
		if _, err := time.Parse(layout, value); err == nil {
			return true
		}
	}
	return false
}
