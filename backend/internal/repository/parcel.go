package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

const parcelSelectColumns = `
	p.id::text, p.project_id::text, COALESCE(p.survey_id::text, ''), p.parcel_code,
	COALESCE(p.land_use, ''), COALESCE(p.notes, ''),
	p.attributes::text, ST_AsGeoJSON(p.boundary),
	p.area_m2::float8, p.area_method, p.verification_status,
	COALESCE(p.review_note, ''), p.current_version,
	COALESCE(p.created_by::text, ''), COALESCE(p.updated_by::text, ''),
	p.created_at, p.updated_at`

const parcelReturningColumns = `
	id::text, project_id::text, COALESCE(survey_id::text, ''), parcel_code,
	COALESCE(land_use, ''), COALESCE(notes, ''),
	attributes::text, ST_AsGeoJSON(boundary),
	area_m2::float8, area_method, verification_status,
	COALESCE(review_note, ''), current_version,
	COALESCE(created_by::text, ''), COALESCE(updated_by::text, ''),
	created_at, updated_at`

const parcelVersionSelectColumns = `
	v.id::text, v.parcel_id::text, v.version_number, v.parcel_code,
	COALESCE(v.land_use, ''), COALESCE(v.notes, ''),
	v.attributes::text, ST_AsGeoJSON(v.boundary), v.area_m2::float8,
	v.verification_status, COALESCE(v.change_reason, ''),
	COALESCE(v.changed_by::text, ''), v.created_at`

func scanParcel(row rowScanner) (domain.Parcel, error) {
	var parcel domain.Parcel
	var attributes, boundary string

	err := row.Scan(
		&parcel.ID,
		&parcel.ProjectID,
		&parcel.SurveyID,
		&parcel.ParcelCode,
		&parcel.LandUse,
		&parcel.Notes,
		&attributes,
		&boundary,
		&parcel.AreaM2,
		&parcel.AreaMethod,
		&parcel.VerificationStatus,
		&parcel.ReviewNote,
		&parcel.CurrentVersion,
		&parcel.CreatedBy,
		&parcel.UpdatedBy,
		&parcel.CreatedAt,
		&parcel.UpdatedAt,
	)
	if err != nil {
		return domain.Parcel{}, err
	}

	parcel.Attributes = json.RawMessage(attributes)
	parcel.Boundary = json.RawMessage(boundary)
	return parcel, nil
}

// ParcelRepository provides SQL access to parcels and version snapshots.
type ParcelRepository struct {
	pool *pgxpool.Pool
}

func NewParcelRepository(pool *pgxpool.Pool) *ParcelRepository {
	return &ParcelRepository{pool: pool}
}

// ValidateGeometry reports type, validity, and metric area for a GeoJSON input.
func (r *ParcelRepository) ValidateGeometry(ctx context.Context, projectID string, boundary []byte) (AreaGeometryInfo, error) {
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
		return AreaGeometryInfo{}, fmt.Errorf("validate parcel geometry: %w", err)
	}
	return info, nil
}

// List returns parcels visible to the user plus the filtered total count.
func (r *ParcelRepository) List(ctx context.Context, userID string, isAdmin bool, filter domain.ParcelListFilter) ([]domain.Parcel, int, error) {
	where := []string{"p.deleted_at IS NULL"}
	args := make([]any, 0, 8)

	if !isAdmin {
		args = append(args, userID)
		where = append(where, fmt.Sprintf(
			"EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = $%d::uuid)",
			len(args),
		))
	}

	if filter.ProjectID != "" {
		args = append(args, filter.ProjectID)
		where = append(where, fmt.Sprintf("p.project_id = $%d::uuid", len(args)))
	}

	if filter.SurveyID != "" {
		args = append(args, filter.SurveyID)
		where = append(where, fmt.Sprintf("p.survey_id = $%d::uuid", len(args)))
	}

	if filter.Status != "" {
		args = append(args, filter.Status)
		where = append(where, fmt.Sprintf("p.verification_status = $%d", len(args)))
	}

	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		where = append(where, fmt.Sprintf(
			"(p.parcel_code ILIKE $%d OR COALESCE(p.land_use, '') ILIKE $%d)",
			len(args), len(args),
		))
	}

	whereSQL := strings.Join(where, " AND ")

	var total int
	countSQL := "SELECT count(*) FROM parcels p WHERE " + whereSQL
	if err := r.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count parcels: %w", err)
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
		"SELECT %s FROM parcels p WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d",
		parcelSelectColumns,
		whereSQL,
		safeParcelSortColumn(filter.SortColumn),
		safeSortOrder(filter.SortOrder),
		len(args)-1,
		len(args),
	)

	rows, err := r.pool.Query(ctx, listSQL, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list parcels: %w", err)
	}
	defer rows.Close()

	parcels := make([]domain.Parcel, 0, perPage)
	for rows.Next() {
		parcel, err := scanParcel(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan parcel: %w", err)
		}
		parcels = append(parcels, parcel)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate parcels: %w", err)
	}

	return parcels, total, nil
}

// Get loads one active parcel.
func (r *ParcelRepository) Get(ctx context.Context, id string) (domain.Parcel, error) {
	parcel, err := scanParcel(r.pool.QueryRow(ctx,
		"SELECT "+parcelSelectColumns+" FROM parcels p WHERE p.id = $1::uuid AND p.deleted_at IS NULL",
		id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Parcel{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Parcel{}, fmt.Errorf("get parcel: %w", err)
	}
	return parcel, nil
}

// Create inserts a parcel and computes its metric area inside the transaction.
func (r *ParcelRepository) Create(
	ctx context.Context,
	q Querier,
	input domain.CreateParcelInput,
	crsEPSG int,
	actorID string,
) (domain.Parcel, error) {
	parcel, err := scanParcel(q.QueryRow(ctx, `
		INSERT INTO parcels (
			project_id, survey_id, parcel_code, land_use, notes, attributes,
			boundary, area_m2, area_method, verification_status, current_version,
			created_by, updated_by
		)
		VALUES (
			$1::uuid, NULLIF($2, '')::uuid, $3, NULLIF($4, ''), NULLIF($5, ''),
			$6::jsonb,
			ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326)),
			ST_Area(ST_Transform(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326)), $8::integer)),
			'st_transform_metric', 'draft', 1, $9::uuid, $9::uuid
		)
		RETURNING `+parcelReturningColumns,
		input.ProjectID,
		input.SurveyID,
		input.ParcelCode,
		input.LandUse,
		input.Notes,
		string(input.Attributes),
		string(input.Boundary),
		crsEPSG,
		actorID,
	))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.Parcel{}, domain.ErrConflict
		}
		return domain.Parcel{}, fmt.Errorf("create parcel: %w", err)
	}
	return parcel, nil
}

// UpdateAttributes updates non-spatial attributes and bumps the version.
func (r *ParcelRepository) UpdateAttributes(
	ctx context.Context,
	q Querier,
	id string,
	input domain.UpdateParcelInput,
	actorID string,
) (domain.Parcel, error) {
	parcel, err := scanParcel(q.QueryRow(ctx, `
		UPDATE parcels
		SET survey_id = NULLIF($1, '')::uuid,
		    parcel_code = $2,
		    land_use = NULLIF($3, ''),
		    notes = NULLIF($4, ''),
		    attributes = $5::jsonb,
		    updated_by = $6::uuid,
		    current_version = current_version + 1
		WHERE id = $7::uuid AND deleted_at IS NULL
		RETURNING `+parcelReturningColumns,
		input.SurveyID,
		input.ParcelCode,
		input.LandUse,
		input.Notes,
		string(input.Attributes),
		actorID,
		id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Parcel{}, domain.ErrNotFound
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.Parcel{}, domain.ErrConflict
		}
		return domain.Parcel{}, fmt.Errorf("update parcel: %w", err)
	}
	return parcel, nil
}

// UpdateGeometry replaces the boundary and recomputes area and version.
func (r *ParcelRepository) UpdateGeometry(
	ctx context.Context,
	q Querier,
	id string,
	boundary []byte,
	crsEPSG int,
	actorID string,
) (domain.Parcel, error) {
	parcel, err := scanParcel(q.QueryRow(ctx, `
		UPDATE parcels
		SET boundary = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)),
		    area_m2 = ST_Area(ST_Transform(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)), $2::integer)),
		    area_method = 'st_transform_metric',
		    updated_by = $3::uuid,
		    current_version = current_version + 1
		WHERE id = $4::uuid AND deleted_at IS NULL
		RETURNING `+parcelReturningColumns,
		string(boundary),
		crsEPSG,
		actorID,
		id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Parcel{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Parcel{}, fmt.Errorf("update parcel geometry: %w", err)
	}
	return parcel, nil
}

// UpdateStatus changes verification status and bumps the version.
func (r *ParcelRepository) UpdateStatus(
	ctx context.Context,
	q Querier,
	id, status, note, actorID string,
) (domain.Parcel, error) {
	parcel, err := scanParcel(q.QueryRow(ctx, `
		UPDATE parcels
		SET verification_status = $1,
		    review_note = NULLIF($2, ''),
		    updated_by = $3::uuid,
		    current_version = current_version + 1
		WHERE id = $4::uuid AND deleted_at IS NULL
		RETURNING `+parcelReturningColumns,
		status,
		note,
		actorID,
		id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Parcel{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Parcel{}, fmt.Errorf("update parcel status: %w", err)
	}
	return parcel, nil
}

// InsertVersion writes an immutable snapshot inside the caller's transaction.
func (r *ParcelRepository) InsertVersion(
	ctx context.Context,
	q Querier,
	parcel domain.Parcel,
	changeReason, actorID string,
) error {
	_, err := q.Exec(ctx, `
		INSERT INTO parcel_versions (
			parcel_id, version_number, parcel_code, land_use, notes,
			attributes, boundary, area_m2, verification_status,
			change_reason, changed_by
		)
		VALUES (
			$1::uuid, $2, $3, NULLIF($4, ''), NULLIF($5, ''),
			$6::jsonb, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326)), $8,
			$9, NULLIF($10, ''), $11::uuid
		)
	`, parcel.ID, parcel.CurrentVersion, parcel.ParcelCode, parcel.LandUse, parcel.Notes,
		string(parcel.Attributes), string(parcel.Boundary), parcel.AreaM2,
		parcel.VerificationStatus, changeReason, actorID,
	)
	if err != nil {
		return fmt.Errorf("insert parcel version: %w", err)
	}
	return nil
}

// ListVersions returns snapshots ordered newest first.
func (r *ParcelRepository) ListVersions(ctx context.Context, parcelID string) ([]domain.ParcelVersion, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+parcelVersionSelectColumns+`
		FROM parcel_versions v
		WHERE v.parcel_id = $1::uuid
		ORDER BY v.version_number DESC
	`, parcelID)
	if err != nil {
		return nil, fmt.Errorf("list parcel versions: %w", err)
	}
	defer rows.Close()

	versions := make([]domain.ParcelVersion, 0, 8)
	for rows.Next() {
		var version domain.ParcelVersion
		var attributes, boundary string

		if err := rows.Scan(
			&version.ID,
			&version.ParcelID,
			&version.VersionNumber,
			&version.ParcelCode,
			&version.LandUse,
			&version.Notes,
			&attributes,
			&boundary,
			&version.AreaM2,
			&version.VerificationStatus,
			&version.ChangeReason,
			&version.ChangedBy,
			&version.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan parcel version: %w", err)
		}

		version.Attributes = json.RawMessage(attributes)
		version.Boundary = json.RawMessage(boundary)
		versions = append(versions, version)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate parcel versions: %w", err)
	}

	return versions, nil
}

// SoftDelete marks a parcel as deleted inside the caller's transaction.
func (r *ParcelRepository) SoftDelete(ctx context.Context, q Querier, id, actorID string) error {
	tag, err := q.Exec(ctx, `
		UPDATE parcels
		SET deleted_at = now(), updated_by = $2::uuid
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id, actorID)
	if err != nil {
		return fmt.Errorf("delete parcel: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// ListFeatures returns GeoJSON-ready parcel features for a project.
func (r *ParcelRepository) ListFeatures(ctx context.Context, projectID string) ([]domain.ParcelFeature, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT p.id::text, p.parcel_code, COALESCE(p.land_use, ''),
		       p.verification_status, COALESCE(p.survey_id::text, ''),
		       ST_AsGeoJSON(p.boundary)
		FROM parcels p
		WHERE p.project_id = $1::uuid AND p.deleted_at IS NULL
		ORDER BY p.parcel_code
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("list parcel features: %w", err)
	}
	defer rows.Close()

	features := make([]domain.ParcelFeature, 0, 32)
	for rows.Next() {
		var feature domain.ParcelFeature
		var boundary string

		if err := rows.Scan(
			&feature.ID,
			&feature.Code,
			&feature.LandUse,
			&feature.Status,
			&feature.SurveyID,
			&boundary,
		); err != nil {
			return nil, fmt.Errorf("scan parcel feature: %w", err)
		}

		feature.Boundary = json.RawMessage(boundary)
		features = append(features, feature)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate parcel features: %w", err)
	}

	return features, nil
}

func safeParcelSortColumn(column string) string {
	switch column {
	case "p.parcel_code", "p.verification_status", "p.area_m2", "p.created_at", "p.updated_at":
		return column
	default:
		return "p.created_at"
	}
}
