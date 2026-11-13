package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

const surveyPointSelectColumns = `
	id::text, survey_id::text, point_code,
	ST_X(location), ST_Y(location),
	accuracy_m::float8, elevation_m::float8,
	COALESCE(source, ''),
	COALESCE(to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
	COALESCE(created_by::text, ''), COALESCE(updated_by::text, ''),
	created_at, updated_at`

func scanSurveyPoint(row rowScanner) (domain.SurveyPoint, error) {
	var point domain.SurveyPoint
	var lon, lat float64

	err := row.Scan(
		&point.ID,
		&point.SurveyID,
		&point.PointCode,
		&lon,
		&lat,
		&point.AccuracyM,
		&point.ElevationM,
		&point.Source,
		&point.RecordedAt,
		&point.CreatedBy,
		&point.UpdatedBy,
		&point.CreatedAt,
		&point.UpdatedAt,
	)
	if err != nil {
		return domain.SurveyPoint{}, err
	}

	point.Location = domain.GeoPoint{Type: "Point", Coordinates: [2]float64{lon, lat}}
	return point, nil
}

// SurveyPointRepository provides SQL access to survey points.
type SurveyPointRepository struct {
	pool *pgxpool.Pool
}

func NewSurveyPointRepository(pool *pgxpool.Pool) *SurveyPointRepository {
	return &SurveyPointRepository{pool: pool}
}

// List returns all points of a survey ordered by code.
func (r *SurveyPointRepository) List(ctx context.Context, surveyID string) ([]domain.SurveyPoint, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+surveyPointSelectColumns+`
		FROM survey_points
		WHERE survey_id = $1::uuid
		ORDER BY point_code
	`, surveyID)
	if err != nil {
		return nil, fmt.Errorf("list survey points: %w", err)
	}
	defer rows.Close()

	points := make([]domain.SurveyPoint, 0, 16)
	for rows.Next() {
		point, err := scanSurveyPoint(rows)
		if err != nil {
			return nil, fmt.Errorf("scan survey point: %w", err)
		}
		points = append(points, point)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate survey points: %w", err)
	}

	return points, nil
}

// Get loads one point of a survey.
func (r *SurveyPointRepository) Get(ctx context.Context, surveyID, pointID string) (domain.SurveyPoint, error) {
	point, err := scanSurveyPoint(r.pool.QueryRow(ctx, `
		SELECT `+surveyPointSelectColumns+`
		FROM survey_points
		WHERE survey_id = $1::uuid AND id = $2::uuid
	`, surveyID, pointID))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.SurveyPoint{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.SurveyPoint{}, fmt.Errorf("get survey point: %w", err)
	}
	return point, nil
}

// Create inserts a survey point inside the caller's transaction.
func (r *SurveyPointRepository) Create(
	ctx context.Context,
	q Querier,
	surveyID string,
	input domain.CreatePointInput,
	actorID string,
) (domain.SurveyPoint, error) {
	point, err := scanSurveyPoint(q.QueryRow(ctx, `
		INSERT INTO survey_points (
			survey_id, point_code, location, accuracy_m, elevation_m, source, recorded_at, created_by, updated_by
		)
		VALUES (
			$1::uuid, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326),
			$5, $6, NULLIF($7, ''), NULLIF($8, '')::timestamptz, $9::uuid, $9::uuid
		)
		RETURNING `+surveyPointSelectColumns,
		surveyID,
		input.PointCode,
		input.Location.Coordinates[0],
		input.Location.Coordinates[1],
		input.AccuracyM,
		input.ElevationM,
		input.Source,
		input.RecordedAt,
		actorID,
	))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.SurveyPoint{}, domain.ErrConflict
		}
		return domain.SurveyPoint{}, fmt.Errorf("create survey point: %w", err)
	}
	return point, nil
}

// Update replaces a survey point inside the caller's transaction.
func (r *SurveyPointRepository) Update(
	ctx context.Context,
	q Querier,
	surveyID, pointID string,
	input domain.CreatePointInput,
	actorID string,
) (domain.SurveyPoint, error) {
	point, err := scanSurveyPoint(q.QueryRow(ctx, `
		UPDATE survey_points
		SET point_code = $1,
		    location = ST_SetSRID(ST_MakePoint($2, $3), 4326),
		    accuracy_m = $4,
		    elevation_m = $5,
		    source = NULLIF($6, ''),
		    recorded_at = NULLIF($7, '')::timestamptz,
		    updated_by = $8::uuid
		WHERE survey_id = $9::uuid AND id = $10::uuid
		RETURNING `+surveyPointSelectColumns,
		input.PointCode,
		input.Location.Coordinates[0],
		input.Location.Coordinates[1],
		input.AccuracyM,
		input.ElevationM,
		input.Source,
		input.RecordedAt,
		actorID,
		surveyID,
		pointID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.SurveyPoint{}, domain.ErrNotFound
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.SurveyPoint{}, domain.ErrConflict
		}
		return domain.SurveyPoint{}, fmt.Errorf("update survey point: %w", err)
	}
	return point, nil
}

// Delete removes a survey point inside the caller's transaction.
func (r *SurveyPointRepository) Delete(ctx context.Context, q Querier, surveyID, pointID string) error {
	tag, err := q.Exec(ctx, `
		DELETE FROM survey_points
		WHERE survey_id = $1::uuid AND id = $2::uuid
	`, surveyID, pointID)
	if err != nil {
		return fmt.Errorf("delete survey point: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
