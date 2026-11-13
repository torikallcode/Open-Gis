package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

const surveySelectColumns = `
	s.id::text, s.project_id::text, p.name, COALESCE(s.surveyor_id::text, ''),
	s.name, COALESCE(to_char(s.survey_date, 'YYYY-MM-DD'), ''), COALESCE(s.method, ''),
	s.status, COALESCE(s.notes, ''), COALESCE(s.created_by::text, ''), COALESCE(s.updated_by::text, ''),
	s.created_at, s.updated_at,
	(SELECT count(*) FROM survey_points sp WHERE sp.survey_id = s.id)`

const surveyReturningColumns = `
	id::text, project_id::text, COALESCE(surveyor_id::text, ''),
	name, COALESCE(to_char(survey_date, 'YYYY-MM-DD'), ''), COALESCE(method, ''),
	status, COALESCE(notes, ''), COALESCE(created_by::text, ''), COALESCE(updated_by::text, ''),
	created_at, updated_at`

func scanSurveyBase(row rowScanner) (domain.Survey, error) {
	var survey domain.Survey
	err := row.Scan(
		&survey.ID,
		&survey.ProjectID,
		&survey.SurveyorID,
		&survey.Name,
		&survey.SurveyDate,
		&survey.Method,
		&survey.Status,
		&survey.Notes,
		&survey.CreatedBy,
		&survey.UpdatedBy,
		&survey.CreatedAt,
		&survey.UpdatedAt,
	)
	return survey, err
}

func scanSurvey(row rowScanner) (domain.Survey, error) {
	var survey domain.Survey
	err := row.Scan(
		&survey.ID,
		&survey.ProjectID,
		&survey.ProjectName,
		&survey.SurveyorID,
		&survey.Name,
		&survey.SurveyDate,
		&survey.Method,
		&survey.Status,
		&survey.Notes,
		&survey.CreatedBy,
		&survey.UpdatedBy,
		&survey.CreatedAt,
		&survey.UpdatedAt,
		&survey.PointCount,
	)
	return survey, err
}

// SurveyRepository provides SQL access to surveys.
type SurveyRepository struct {
	pool *pgxpool.Pool
}

func NewSurveyRepository(pool *pgxpool.Pool) *SurveyRepository {
	return &SurveyRepository{pool: pool}
}

// List returns surveys visible to the user plus the filtered total count.
func (r *SurveyRepository) List(ctx context.Context, userID string, isAdmin bool, filter domain.SurveyListFilter) ([]domain.Survey, int, error) {
	where := []string{"s.deleted_at IS NULL", "p.deleted_at IS NULL"}
	args := make([]any, 0, 8)

	if !isAdmin {
		args = append(args, userID)
		where = append(where, fmt.Sprintf(
			"EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = s.project_id AND pm.user_id = $%d::uuid)",
			len(args),
		))
	}

	if filter.ProjectID != "" {
		args = append(args, filter.ProjectID)
		where = append(where, fmt.Sprintf("s.project_id = $%d::uuid", len(args)))
	}

	if filter.Status != "" {
		args = append(args, filter.Status)
		where = append(where, fmt.Sprintf("s.status = $%d", len(args)))
	}

	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		where = append(where, fmt.Sprintf(
			"(s.name ILIKE $%d OR COALESCE(s.method, '') ILIKE $%d)",
			len(args), len(args),
		))
	}

	if filter.From != "" {
		args = append(args, filter.From)
		where = append(where, fmt.Sprintf("s.survey_date >= $%d::date", len(args)))
	}

	if filter.To != "" {
		args = append(args, filter.To)
		where = append(where, fmt.Sprintf("s.survey_date <= $%d::date", len(args)))
	}

	whereSQL := strings.Join(where, " AND ")

	var total int
	countSQL := "SELECT count(*) FROM surveys s JOIN projects p ON p.id = s.project_id WHERE " + whereSQL
	if err := r.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count surveys: %w", err)
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	perPage := filter.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	args = append(args, perPage, (page-1)*perPage)
	listSQL := fmt.Sprintf(
		"SELECT %s FROM surveys s JOIN projects p ON p.id = s.project_id WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d",
		surveySelectColumns,
		whereSQL,
		safeSurveySortColumn(filter.SortColumn),
		safeSortOrder(filter.SortOrder),
		len(args)-1,
		len(args),
	)

	rows, err := r.pool.Query(ctx, listSQL, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list surveys: %w", err)
	}
	defer rows.Close()

	surveys := make([]domain.Survey, 0, perPage)
	for rows.Next() {
		survey, err := scanSurvey(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan survey: %w", err)
		}
		surveys = append(surveys, survey)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate surveys: %w", err)
	}

	return surveys, total, nil
}

// Get loads one non-deleted survey.
func (r *SurveyRepository) Get(ctx context.Context, id string) (domain.Survey, error) {
	survey, err := scanSurvey(r.pool.QueryRow(ctx,
		"SELECT "+surveySelectColumns+` FROM surveys s
		 JOIN projects p ON p.id = s.project_id
		 WHERE s.id = $1::uuid AND s.deleted_at IS NULL AND p.deleted_at IS NULL`,
		id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Survey{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Survey{}, fmt.Errorf("get survey: %w", err)
	}
	return survey, nil
}

// Create inserts a survey inside the caller's transaction.
func (r *SurveyRepository) Create(ctx context.Context, q Querier, input domain.CreateSurveyInput, projectID, surveyorID, actorID string) (domain.Survey, error) {
	survey, err := scanSurveyBase(q.QueryRow(ctx, `
		INSERT INTO surveys (project_id, surveyor_id, name, survey_date, method, status, notes, created_by, updated_by)
		VALUES ($1::uuid, NULLIF($2, '')::uuid, $3, NULLIF($4, '')::date, NULLIF($5, ''), $6, NULLIF($7, ''), $8::uuid, $8::uuid)
		RETURNING `+surveyReturningColumns,
		projectID,
		surveyorID,
		input.Name,
		input.SurveyDate,
		input.Method,
		input.Status,
		input.Notes,
		actorID,
	))
	if err != nil {
		return domain.Survey{}, fmt.Errorf("create survey: %w", err)
	}
	return survey, nil
}

// Update replaces survey fields inside the caller's transaction.
func (r *SurveyRepository) Update(ctx context.Context, q Querier, id string, input domain.CreateSurveyInput, surveyorID, actorID string) (domain.Survey, error) {
	survey, err := scanSurveyBase(q.QueryRow(ctx, `
		UPDATE surveys
		SET surveyor_id = NULLIF($1, '')::uuid,
		    name = $2,
		    survey_date = NULLIF($3, '')::date,
		    method = NULLIF($4, ''),
		    status = $5,
		    notes = NULLIF($6, ''),
		    updated_by = $7::uuid
		WHERE id = $8::uuid AND deleted_at IS NULL
		RETURNING `+surveyReturningColumns,
		surveyorID,
		input.Name,
		input.SurveyDate,
		input.Method,
		input.Status,
		input.Notes,
		actorID,
		id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Survey{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Survey{}, fmt.Errorf("update survey: %w", err)
	}
	return survey, nil
}

// SoftDelete marks a survey as deleted.
func (r *SurveyRepository) SoftDelete(ctx context.Context, q Querier, id, actorID string) error {
	tag, err := q.Exec(ctx, `
		UPDATE surveys
		SET deleted_at = now(), updated_by = $2::uuid
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id, actorID)
	if err != nil {
		return fmt.Errorf("delete survey: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func safeSurveySortColumn(column string) string {
	switch column {
	case "s.survey_date", "s.name", "s.status", "s.created_at", "s.updated_at":
		return column
	default:
		return "s.created_at"
	}
}
