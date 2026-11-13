package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

const surveyAreaSelectColumns = `
	id::text, project_id::text, name,
	ST_AsGeoJSON(boundary), area_m2::float8, area_method,
	COALESCE(created_by::text, ''), COALESCE(updated_by::text, ''),
	created_at, updated_at`

func scanSurveyArea(row rowScanner) (domain.SurveyArea, error) {
	var area domain.SurveyArea
	var boundary string

	err := row.Scan(
		&area.ID,
		&area.ProjectID,
		&area.Name,
		&boundary,
		&area.AreaM2,
		&area.AreaMethod,
		&area.CreatedBy,
		&area.UpdatedBy,
		&area.CreatedAt,
		&area.UpdatedAt,
	)
	if err != nil {
		return domain.SurveyArea{}, err
	}

	area.Boundary = json.RawMessage(boundary)
	return area, nil
}

// AreaGeometryInfo is the result of PostGIS geometry validation.
type AreaGeometryInfo struct {
	GeometryType string
	Valid        bool
	Empty        bool
	AreaM2       float64
}

// SurveyAreaRepository provides SQL access to project work areas.
type SurveyAreaRepository struct {
	pool *pgxpool.Pool
}

func NewSurveyAreaRepository(pool *pgxpool.Pool) *SurveyAreaRepository {
	return &SurveyAreaRepository{pool: pool}
}

// Validate reports geometry type, validity, and metric area for a GeoJSON input.
// It returns PG data-exception errors to the caller, which can be mapped to a
// validation error.
func (r *SurveyAreaRepository) Validate(ctx context.Context, projectID string, boundary []byte) (AreaGeometryInfo, error) {
	var info AreaGeometryInfo

	err := r.pool.QueryRow(ctx, `
		WITH input AS (
			SELECT ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)) AS g
		)
		SELECT ST_GeometryType(g), ST_IsValid(g), ST_IsEmpty(g),
		       ST_Area(ST_Transform(g, p.crs_epsg))
		FROM input, projects p
		WHERE p.id = $1::uuid AND p.deleted_at IS NULL
	`, projectID, string(boundary)).Scan(&info.GeometryType, &info.Valid, &info.Empty, &info.AreaM2)

	if errors.Is(err, pgx.ErrNoRows) {
		return AreaGeometryInfo{}, domain.ErrNotFound
	}
	if err != nil {
		return AreaGeometryInfo{}, fmt.Errorf("validate survey area: %w", err)
	}
	return info, nil
}

// List returns all active work areas of a project.
func (r *SurveyAreaRepository) List(ctx context.Context, projectID string) ([]domain.SurveyArea, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+surveyAreaSelectColumns+`
		FROM survey_areas
		WHERE project_id = $1::uuid AND deleted_at IS NULL
		ORDER BY created_at
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("list survey areas: %w", err)
	}
	defer rows.Close()

	areas := make([]domain.SurveyArea, 0, 4)
	for rows.Next() {
		area, err := scanSurveyArea(rows)
		if err != nil {
			return nil, fmt.Errorf("scan survey area: %w", err)
		}
		areas = append(areas, area)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate survey areas: %w", err)
	}

	return areas, nil
}

// Get loads one active work area.
func (r *SurveyAreaRepository) Get(ctx context.Context, id string) (domain.SurveyArea, error) {
	area, err := scanSurveyArea(r.pool.QueryRow(ctx, `
		SELECT `+surveyAreaSelectColumns+`
		FROM survey_areas
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.SurveyArea{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.SurveyArea{}, fmt.Errorf("get survey area: %w", err)
	}
	return area, nil
}

// Create inserts an area and computes its metric area inside the transaction.
func (r *SurveyAreaRepository) Create(
	ctx context.Context,
	q Querier,
	projectID string,
	input domain.CreateAreaInput,
	crsEPSG int,
	actorID string,
) (domain.SurveyArea, error) {
	area, err := scanSurveyArea(q.QueryRow(ctx, `
		INSERT INTO survey_areas (project_id, name, boundary, area_m2, area_method, created_by, updated_by)
		VALUES (
			$1::uuid,
			$2,
			ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)),
			ST_Area(ST_Transform(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)), $4::integer)),
			'st_transform_metric',
			$5::uuid,
			$5::uuid
		)
		RETURNING `+surveyAreaSelectColumns,
		projectID,
		input.Name,
		string(input.Boundary),
		crsEPSG,
		actorID,
	))
	if err != nil {
		return domain.SurveyArea{}, fmt.Errorf("create survey area: %w", err)
	}
	return area, nil
}

// SoftDelete marks an area as deleted inside the caller's transaction.
func (r *SurveyAreaRepository) SoftDelete(ctx context.Context, q Querier, id, actorID string) error {
	tag, err := q.Exec(ctx, `
		UPDATE survey_areas
		SET deleted_at = now(), updated_by = $2::uuid
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id, actorID)
	if err != nil {
		return fmt.Errorf("delete survey area: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
