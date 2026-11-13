package service

import (
	"context"
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

// SurveyService contains survey business rules, authorization, and auditing.
type SurveyService struct {
	pool     *pgxpool.Pool
	surveys  *repository.SurveyRepository
	projects *repository.ProjectRepository
	users    *repository.UserRepository
}

func NewSurveyService(
	pool *pgxpool.Pool,
	surveys *repository.SurveyRepository,
	projects *repository.ProjectRepository,
	users *repository.UserRepository,
) *SurveyService {
	return &SurveyService{pool: pool, surveys: surveys, projects: projects, users: users}
}

// List returns surveys visible to the actor.
func (s *SurveyService) List(ctx context.Context, actor access.Actor, filter domain.SurveyListFilter) ([]domain.Survey, int, error) {
	validation := domain.NewValidationError()

	if filter.Status != "" && !domain.IsValidSurveyStatus(filter.Status) {
		validation.Add("status", "Status survei tidak dikenal.")
	}
	if filter.ProjectID != "" && !uuidPattern.MatchString(filter.ProjectID) {
		validation.Add("project_id", "Format ID proyek tidak valid.")
	}
	if filter.From != "" && !validDate(filter.From) {
		validation.Add("from", "Tanggal awal harus berformat YYYY-MM-DD.")
	}
	if filter.To != "" && !validDate(filter.To) {
		validation.Add("to", "Tanggal akhir harus berformat YYYY-MM-DD.")
	}
	if validation.HasErrors() {
		return nil, 0, validation
	}

	return s.surveys.List(ctx, actor.ID, actor.IsAdmin, filter)
}

// Get loads one survey for project members.
func (s *SurveyService) Get(ctx context.Context, actor access.Actor, id string) (domain.Survey, error) {
	if err := validateUUID(id, "id"); err != nil {
		return domain.Survey{}, err
	}

	survey, _, err := loadSurveyWithAccess(ctx, s.surveys, s.projects, actor, id)
	return survey, err
}

// Create creates a survey inside an accessible project.
func (s *SurveyService) Create(ctx context.Context, actor access.Actor, input domain.CreateSurveyInput, meta domain.RequestMeta) (domain.Survey, error) {
	if err := validateUUID(input.ProjectID, "project_id"); err != nil {
		return domain.Survey{}, err
	}

	project, role, err := resolveProjectRole(ctx, s.projects, actor, input.ProjectID)
	if err != nil {
		return domain.Survey{}, err
	}
	if !actor.CanWriteSurvey(role) {
		return domain.Survey{}, domain.ErrForbidden
	}

	if err := validateSurveyInput(&input); err != nil {
		return domain.Survey{}, err
	}

	surveyorID := input.SurveyorID
	if surveyorID == "" {
		surveyorID = actor.ID
	} else if _, err := s.users.FindByID(ctx, surveyorID); err != nil {
		if err == domain.ErrNotFound {
			validation := domain.NewValidationError()
			validation.Add("surveyor_id", "Surveyor tidak ditemukan.")
			return domain.Survey{}, validation
		}
		return domain.Survey{}, err
	}

	var survey domain.Survey
	err = s.withTx(ctx, func(tx pgx.Tx) error {
		created, err := s.surveys.Create(ctx, tx, input, project.ID, surveyorID, actor.ID)
		if err != nil {
			return err
		}
		survey = created
		survey.ProjectName = project.Name

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  project.ID,
			Action:     "survey.create",
			EntityType: "survey",
			EntityID:   created.ID,
			After:      created,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.Survey{}, err
	}
	return survey, nil
}

// Update replaces an existing survey.
func (s *SurveyService) Update(ctx context.Context, actor access.Actor, id string, input domain.CreateSurveyInput, meta domain.RequestMeta) (domain.Survey, error) {
	if err := validateUUID(id, "id"); err != nil {
		return domain.Survey{}, err
	}

	before, role, err := loadSurveyWithAccess(ctx, s.surveys, s.projects, actor, id)
	if err != nil {
		return domain.Survey{}, err
	}
	if !canModifySurvey(actor, role, before) {
		return domain.Survey{}, domain.ErrForbidden
	}

	if err := validateSurveyInput(&input); err != nil {
		return domain.Survey{}, err
	}

	surveyorID := input.SurveyorID
	if surveyorID == "" {
		surveyorID = before.SurveyorID
	}
	if surveyorID != "" && surveyorID != before.SurveyorID {
		if _, err := s.users.FindByID(ctx, surveyorID); err != nil {
			if err == domain.ErrNotFound {
				validation := domain.NewValidationError()
				validation.Add("surveyor_id", "Surveyor tidak ditemukan.")
				return domain.Survey{}, validation
			}
			return domain.Survey{}, err
		}
	}

	var survey domain.Survey
	err = s.withTx(ctx, func(tx pgx.Tx) error {
		updated, err := s.surveys.Update(ctx, tx, id, input, surveyorID, actor.ID)
		if err != nil {
			return err
		}
		updated.ProjectName = before.ProjectName
		updated.PointCount = before.PointCount
		survey = updated

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  before.ProjectID,
			Action:     "survey.update",
			EntityType: "survey",
			EntityID:   id,
			Before:     before,
			After:      updated,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.Survey{}, err
	}
	return survey, nil
}

// Delete soft-deletes a survey. Only managers and admins may delete.
func (s *SurveyService) Delete(ctx context.Context, actor access.Actor, id string, meta domain.RequestMeta) error {
	if err := validateUUID(id, "id"); err != nil {
		return err
	}

	survey, role, err := loadSurveyWithAccess(ctx, s.surveys, s.projects, actor, id)
	if err != nil {
		return err
	}
	if !actor.CanManageProject(role) {
		return domain.ErrForbidden
	}

	return s.withTx(ctx, func(tx pgx.Tx) error {
		if err := s.surveys.SoftDelete(ctx, tx, id, actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  survey.ProjectID,
			Action:     "survey.delete",
			EntityType: "survey",
			EntityID:   id,
			Before:     survey,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
}

func (s *SurveyService) withTx(ctx context.Context, fn func(pgx.Tx) error) error {
	return withTransaction(ctx, s.pool, fn)
}

func validateSurveyInput(input *domain.CreateSurveyInput) *domain.ValidationError {
	validation := domain.NewValidationError()

	input.Name = strings.TrimSpace(input.Name)
	input.Method = strings.TrimSpace(input.Method)
	input.Notes = strings.TrimSpace(input.Notes)
	input.SurveyDate = strings.TrimSpace(input.SurveyDate)
	input.SurveyorID = strings.TrimSpace(input.SurveyorID)

	if input.Name == "" {
		validation.Add("name", "Nama survei wajib diisi.")
	} else if utf8.RuneCountInString(input.Name) > 200 {
		validation.Add("name", "Nama survei maksimal 200 karakter.")
	}

	if input.Status == "" {
		input.Status = domain.SurveyStatusDraft
	}
	if !domain.IsValidSurveyStatus(input.Status) {
		validation.Add("status", "Status survei tidak dikenal.")
	}

	if input.SurveyDate != "" && !validDate(input.SurveyDate) {
		validation.Add("survey_date", "Tanggal survei harus berformat YYYY-MM-DD.")
	}

	if utf8.RuneCountInString(input.Method) > 100 {
		validation.Add("method", "Metode maksimal 100 karakter.")
	}
	if utf8.RuneCountInString(input.Notes) > 5000 {
		validation.Add("notes", "Catatan maksimal 5000 karakter.")
	}

	if input.SurveyorID != "" && !uuidPattern.MatchString(input.SurveyorID) {
		validation.Add("surveyor_id", "Format ID surveyor tidak valid.")
	}

	if validation.HasErrors() {
		return validation
	}
	return nil
}

func canModifySurvey(actor access.Actor, projectRole string, survey domain.Survey) bool {
	if actor.IsAdmin || projectRole == "manager" {
		return true
	}
	return projectRole == "surveyor" && survey.SurveyorID == actor.ID
}

func validDate(value string) bool {
	_, err := time.Parse("2006-01-02", value)
	return err == nil
}
