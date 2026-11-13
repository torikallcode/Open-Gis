package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/audit"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/repository"
)

// SurveyAreaService contains work-area business rules and auditing.
type SurveyAreaService struct {
	pool     *pgxpool.Pool
	areas    *repository.SurveyAreaRepository
	projects *repository.ProjectRepository
}

func NewSurveyAreaService(
	pool *pgxpool.Pool,
	areas *repository.SurveyAreaRepository,
	projects *repository.ProjectRepository,
) *SurveyAreaService {
	return &SurveyAreaService{pool: pool, areas: areas, projects: projects}
}

// List returns work areas of a project for members and admins.
func (s *SurveyAreaService) List(ctx context.Context, actor access.Actor, projectID string) ([]domain.SurveyArea, error) {
	if err := validateUUID(projectID, "project_id"); err != nil {
		return nil, err
	}
	if _, _, err := resolveProjectRole(ctx, s.projects, actor, projectID); err != nil {
		return nil, err
	}

	return s.areas.List(ctx, projectID)
}

// Create validates and stores a work area, computing its metric area.
func (s *SurveyAreaService) Create(ctx context.Context, actor access.Actor, projectID string, input domain.CreateAreaInput, meta domain.RequestMeta) (domain.SurveyArea, error) {
	if err := validateUUID(projectID, "project_id"); err != nil {
		return domain.SurveyArea{}, err
	}

	project, role, err := resolveProjectRole(ctx, s.projects, actor, projectID)
	if err != nil {
		return domain.SurveyArea{}, err
	}
	if !actor.CanManageProject(role) {
		return domain.SurveyArea{}, domain.ErrForbidden
	}

	if validation := validateAreaInput(&input); validation != nil {
		return domain.SurveyArea{}, validation
	}

	info, err := s.areas.Validate(ctx, projectID, input.Boundary)
	if err != nil {
		if isDataException(err) {
			validation := domain.NewValidationError()
			validation.Add("boundary", "Geometri tidak dapat dibaca. Kirim GeoJSON Polygon atau MultiPolygon.")
			return domain.SurveyArea{}, validation
		}
		return domain.SurveyArea{}, err
	}

	if info.GeometryType != "ST_MultiPolygon" || !info.Valid || info.Empty || info.AreaM2 <= 0 {
		validation := domain.NewValidationError()
		validation.Add("boundary", "Geometri harus polygon valid, tidak kosong, dan memiliki luas.")
		return domain.SurveyArea{}, validation
	}

	var area domain.SurveyArea
	err = withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		created, err := s.areas.Create(ctx, tx, projectID, input, project.CRSEPSG, actor.ID)
		if err != nil {
			return err
		}
		area = created

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  projectID,
			Action:     "survey.area.create",
			EntityType: "survey_area",
			EntityID:   created.ID,
			After:      created,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.SurveyArea{}, err
	}
	return area, nil
}

// Delete soft-deletes a work area.
func (s *SurveyAreaService) Delete(ctx context.Context, actor access.Actor, id string, meta domain.RequestMeta) error {
	if err := validateUUID(id, "id"); err != nil {
		return err
	}

	area, err := s.areas.Get(ctx, id)
	if err != nil {
		return err
	}

	_, role, err := resolveProjectRole(ctx, s.projects, actor, area.ProjectID)
	if err != nil {
		return err
	}
	if !actor.CanManageProject(role) {
		return domain.ErrForbidden
	}

	return withTransaction(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.areas.SoftDelete(ctx, tx, id, actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  area.ProjectID,
			Action:     "survey.area.delete",
			EntityType: "survey_area",
			EntityID:   id,
			Before:     area,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
}

func validateAreaInput(input *domain.CreateAreaInput) *domain.ValidationError {
	validation := domain.NewValidationError()

	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		validation.Add("name", "Nama area wajib diisi.")
	} else if utf8.RuneCountInString(input.Name) > 150 {
		validation.Add("name", "Nama area maksimal 150 karakter.")
	}

	if len(input.Boundary) == 0 || !json.Valid(input.Boundary) {
		validation.Add("boundary", "Boundary harus berupa objek GeoJSON yang valid.")
	} else {
		var geometry struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(input.Boundary, &geometry); err != nil {
			validation.Add("boundary", "Boundary harus berupa objek GeoJSON yang valid.")
		} else if geometry.Type != "Polygon" && geometry.Type != "MultiPolygon" {
			validation.Add("boundary", "Boundary harus GeoJSON Polygon atau MultiPolygon.")
		}
	}

	if validation.HasErrors() {
		return validation
	}
	return nil
}

func isDataException(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && strings.HasPrefix(pgErr.Code, "22")
}
