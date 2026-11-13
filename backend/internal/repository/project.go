package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

const projectSelectColumns = `
	p.id::text, p.name, COALESCE(p.description, ''), COALESCE(p.location, ''),
	p.crs_epsg, p.status,
	COALESCE(to_char(p.start_date, 'YYYY-MM-DD'), ''),
	COALESCE(to_char(p.end_date, 'YYYY-MM-DD'), ''),
	COALESCE(p.created_by::text, ''), COALESCE(p.updated_by::text, ''),
	p.created_at, p.updated_at`

const projectReturningColumns = `
	id::text, name, COALESCE(description, ''), COALESCE(location, ''),
	crs_epsg, status,
	COALESCE(to_char(start_date, 'YYYY-MM-DD'), ''),
	COALESCE(to_char(end_date, 'YYYY-MM-DD'), ''),
	COALESCE(created_by::text, ''), COALESCE(updated_by::text, ''),
	created_at, updated_at`

func scanProject(row rowScanner) (domain.Project, error) {
	var project domain.Project
	err := row.Scan(
		&project.ID,
		&project.Name,
		&project.Description,
		&project.Location,
		&project.CRSEPSG,
		&project.Status,
		&project.StartDate,
		&project.EndDate,
		&project.CreatedBy,
		&project.UpdatedBy,
		&project.CreatedAt,
		&project.UpdatedAt,
	)
	return project, err
}

// ProjectFilter narrows and paginates a project list.
type ProjectFilter struct {
	Query      string
	Status     string
	SortColumn string
	SortOrder  string
	Page       int
	PerPage    int
}

// ProjectRepository provides SQL access to projects and memberships.
type ProjectRepository struct {
	pool *pgxpool.Pool
}

func NewProjectRepository(pool *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{pool: pool}
}

// List returns projects visible to the user plus the filtered total count.
func (r *ProjectRepository) List(ctx context.Context, userID string, isAdmin bool, filter ProjectFilter) ([]domain.Project, int, error) {
	where := []string{"p.deleted_at IS NULL"}
	args := make([]any, 0, 6)

	if !isAdmin {
		args = append(args, userID)
		where = append(where, fmt.Sprintf(
			"EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $%d::uuid)",
			len(args),
		))
	}

	if filter.Query != "" {
		args = append(args, "%"+filter.Query+"%")
		index := len(args)
		where = append(where, fmt.Sprintf(
			"(p.name ILIKE $%d OR COALESCE(p.description, '') ILIKE $%d OR COALESCE(p.location, '') ILIKE $%d)",
			index, index, index,
		))
	}

	if filter.Status != "" {
		args = append(args, filter.Status)
		where = append(where, fmt.Sprintf("p.status = $%d", len(args)))
	}

	whereSQL := strings.Join(where, " AND ")

	var total int
	countSQL := "SELECT count(*) FROM projects p WHERE " + whereSQL
	if err := r.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count projects: %w", err)
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
		"SELECT %s FROM projects p WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d",
		projectSelectColumns,
		whereSQL,
		safeSortColumn(filter.SortColumn),
		safeSortOrder(filter.SortOrder),
		len(args)-1,
		len(args),
	)

	rows, err := r.pool.Query(ctx, listSQL, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list projects: %w", err)
	}
	defer rows.Close()

	projects := make([]domain.Project, 0, perPage)
	for rows.Next() {
		project, err := scanProject(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan project: %w", err)
		}
		projects = append(projects, project)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate projects: %w", err)
	}

	return projects, total, nil
}

// Get loads one non-deleted project.
func (r *ProjectRepository) Get(ctx context.Context, id string) (domain.Project, error) {
	project, err := scanProject(r.pool.QueryRow(ctx,
		"SELECT "+projectSelectColumns+" FROM projects p WHERE p.id = $1::uuid AND p.deleted_at IS NULL",
		id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Project{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Project{}, fmt.Errorf("get project: %w", err)
	}
	return project, nil
}

// Create inserts a project inside the caller's transaction.
func (r *ProjectRepository) Create(ctx context.Context, q Querier, input domain.CreateProjectInput, actorID string) (domain.Project, error) {
	project, err := scanProject(q.QueryRow(ctx, `
		INSERT INTO projects (name, description, location, crs_epsg, status, start_date, end_date, created_by, updated_by)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, $5, NULLIF($6, '')::date, NULLIF($7, '')::date, $8::uuid, $8::uuid)
		RETURNING `+projectReturningColumns,
		input.Name,
		input.Description,
		input.Location,
		input.CRSEPSG,
		input.Status,
		input.StartDate,
		input.EndDate,
		actorID,
	))
	if err != nil {
		return domain.Project{}, fmt.Errorf("create project: %w", err)
	}
	return project, nil
}

// Update replaces project fields inside the caller's transaction.
func (r *ProjectRepository) Update(ctx context.Context, q Querier, id string, input domain.CreateProjectInput, actorID string) (domain.Project, error) {
	project, err := scanProject(q.QueryRow(ctx, `
		UPDATE projects
		SET name = $1,
		    description = NULLIF($2, ''),
		    location = NULLIF($3, ''),
		    crs_epsg = $4,
		    status = $5,
		    start_date = NULLIF($6, '')::date,
		    end_date = NULLIF($7, '')::date,
		    updated_by = $8::uuid
		WHERE id = $9::uuid AND deleted_at IS NULL
		RETURNING `+projectReturningColumns,
		input.Name,
		input.Description,
		input.Location,
		input.CRSEPSG,
		input.Status,
		input.StartDate,
		input.EndDate,
		actorID,
		id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Project{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Project{}, fmt.Errorf("update project: %w", err)
	}
	return project, nil
}

// SoftDelete marks a project as deleted.
func (r *ProjectRepository) SoftDelete(ctx context.Context, q Querier, id, actorID string) error {
	tag, err := q.Exec(ctx, `
		UPDATE projects
		SET deleted_at = now(), updated_by = $2::uuid
		WHERE id = $1::uuid AND deleted_at IS NULL
	`, id, actorID)
	if err != nil {
		return fmt.Errorf("delete project: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// CRSIsProjected verifies that an EPSG code exists and is a projected CRS.
func (r *ProjectRepository) CRSIsProjected(ctx context.Context, srid int) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM spatial_ref_sys
			WHERE srid = $1
			  AND srid > 0
			  AND proj4text IS NOT NULL
			  AND proj4text NOT LIKE '%+proj=longlat%'
		)
	`, srid).Scan(&ok)
	if err != nil {
		return false, fmt.Errorf("validate crs: %w", err)
	}
	return ok, nil
}

// MemberRole returns the project role for a user, or "" when not a member.
func (r *ProjectRepository) MemberRole(ctx context.Context, projectID, userID string) (string, error) {
	var role string
	err := r.pool.QueryRow(ctx,
		`SELECT project_role FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
		projectID, userID,
	).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("get project member role: %w", err)
	}
	return role, nil
}

// ListMembers returns all members of a project.
func (r *ProjectRepository) ListMembers(ctx context.Context, projectID string) ([]domain.ProjectMember, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id::text, u.name, u.email, pm.project_role, pm.joined_at
		FROM project_members pm
		JOIN users u ON u.id = pm.user_id
		WHERE pm.project_id = $1::uuid
		ORDER BY u.name, u.email
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("list project members: %w", err)
	}
	defer rows.Close()

	members := make([]domain.ProjectMember, 0, 8)
	for rows.Next() {
		var member domain.ProjectMember
		if err := rows.Scan(&member.UserID, &member.Name, &member.Email, &member.ProjectRole, &member.JoinedAt); err != nil {
			return nil, fmt.Errorf("scan project member: %w", err)
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate project members: %w", err)
	}

	return members, nil
}

// AddMember inserts a project membership inside the caller's transaction.
func (r *ProjectRepository) AddMember(ctx context.Context, q Querier, projectID, userID, role, actorID string) error {
	_, err := q.Exec(ctx, `
		INSERT INTO project_members (project_id, user_id, project_role, added_by)
		VALUES ($1::uuid, $2::uuid, $3, $4::uuid)
	`, projectID, userID, role, actorID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("add project member: %w", err)
	}
	return nil
}

// GetMember loads one project member.
func (r *ProjectRepository) GetMember(ctx context.Context, projectID, userID string) (domain.ProjectMember, error) {
	var member domain.ProjectMember
	err := r.pool.QueryRow(ctx, `
		SELECT u.id::text, u.name, u.email, pm.project_role, pm.joined_at
		FROM project_members pm
		JOIN users u ON u.id = pm.user_id
		WHERE pm.project_id = $1::uuid AND pm.user_id = $2::uuid
	`, projectID, userID).Scan(
		&member.UserID,
		&member.Name,
		&member.Email,
		&member.ProjectRole,
		&member.JoinedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ProjectMember{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.ProjectMember{}, fmt.Errorf("get project member: %w", err)
	}
	return member, nil
}

// UpdateMemberRole changes a member role inside the caller's transaction.
func (r *ProjectRepository) UpdateMemberRole(ctx context.Context, q Querier, projectID, userID, role string) error {
	tag, err := q.Exec(ctx, `
		UPDATE project_members SET project_role = $3
		WHERE project_id = $1::uuid AND user_id = $2::uuid
	`, projectID, userID, role)
	if err != nil {
		return fmt.Errorf("update project member: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// RemoveMember deletes a project membership inside the caller's transaction.
func (r *ProjectRepository) RemoveMember(ctx context.Context, q Querier, projectID, userID string) error {
	tag, err := q.Exec(ctx, `
		DELETE FROM project_members
		WHERE project_id = $1::uuid AND user_id = $2::uuid
	`, projectID, userID)
	if err != nil {
		return fmt.Errorf("remove project member: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func safeSortColumn(column string) string {
	switch column {
	case "p.name", "p.status", "p.start_date", "p.updated_at", "p.created_at":
		return column
	default:
		return "p.created_at"
	}
}

func safeSortOrder(order string) string {
	if strings.EqualFold(order, "asc") {
		return "ASC"
	}
	return "DESC"
}
