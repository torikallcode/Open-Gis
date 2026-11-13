package service

import (
	"context"
	"net/mail"
	"regexp"
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

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// ProjectService contains project business rules, authorization, and auditing.
type ProjectService struct {
	pool     *pgxpool.Pool
	projects *repository.ProjectRepository
	users    *repository.UserRepository
}

func NewProjectService(
	pool *pgxpool.Pool,
	projects *repository.ProjectRepository,
	users *repository.UserRepository,
) *ProjectService {
	return &ProjectService{pool: pool, projects: projects, users: users}
}

// List returns projects visible to the actor.
func (s *ProjectService) List(ctx context.Context, actor access.Actor, filter domain.ProjectListFilter) ([]domain.Project, int, error) {
	if filter.Status != "" && !domain.IsValidProjectStatus(filter.Status) {
		validation := domain.NewValidationError()
		validation.Add("status", "Status proyek tidak dikenal.")
		return nil, 0, validation
	}

	return s.projects.List(ctx, actor.ID, actor.IsAdmin, repository.ProjectFilter{
		Query:      strings.TrimSpace(filter.Query),
		Status:     filter.Status,
		SortColumn: filter.SortColumn,
		SortOrder:  filter.SortOrder,
		Page:       filter.Page,
		PerPage:    filter.PerPage,
	})
}

// Get loads one project and attaches the actor's project role.
func (s *ProjectService) Get(ctx context.Context, actor access.Actor, id string) (domain.Project, error) {
	if err := validateUUID(id, "id"); err != nil {
		return domain.Project{}, err
	}

	project, _, err := s.loadProject(ctx, actor, id)
	return project, err
}

// Create creates a project. Only global admins may create projects.
func (s *ProjectService) Create(ctx context.Context, actor access.Actor, input domain.CreateProjectInput, meta domain.RequestMeta) (domain.Project, error) {
	if !actor.IsAdmin {
		return domain.Project{}, domain.ErrForbidden
	}

	if err := validateProjectInput(&input); err != nil {
		return domain.Project{}, err
	}
	if err := s.ensureProjectedCRS(ctx, input.CRSEPSG); err != nil {
		return domain.Project{}, err
	}

	var project domain.Project
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		created, err := s.projects.Create(ctx, tx, input, actor.ID)
		if err != nil {
			return err
		}
		project = created

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  created.ID,
			Action:     "project.create",
			EntityType: "project",
			EntityID:   created.ID,
			After:      created,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.Project{}, err
	}

	project.MemberRole = "admin"
	return project, nil
}

// Update replaces a project. Admins and project managers may update.
func (s *ProjectService) Update(ctx context.Context, actor access.Actor, id string, input domain.CreateProjectInput, meta domain.RequestMeta) (domain.Project, error) {
	if err := validateUUID(id, "id"); err != nil {
		return domain.Project{}, err
	}

	before, role, err := s.loadProject(ctx, actor, id)
	if err != nil {
		return domain.Project{}, err
	}
	if !actor.CanManageProject(role) {
		return domain.Project{}, domain.ErrForbidden
	}

	if err := validateProjectInput(&input); err != nil {
		return domain.Project{}, err
	}
	if err := s.ensureProjectedCRS(ctx, input.CRSEPSG); err != nil {
		return domain.Project{}, err
	}

	var project domain.Project
	err = s.withTx(ctx, func(tx pgx.Tx) error {
		updated, err := s.projects.Update(ctx, tx, id, input, actor.ID)
		if err != nil {
			return err
		}
		project = updated

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  id,
			Action:     "project.update",
			EntityType: "project",
			EntityID:   id,
			Before:     before,
			After:      updated,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.Project{}, err
	}

	project.MemberRole = role
	return project, nil
}

// Delete soft-deletes a project. Only global admins may delete.
func (s *ProjectService) Delete(ctx context.Context, actor access.Actor, id string, meta domain.RequestMeta) error {
	if err := validateUUID(id, "id"); err != nil {
		return err
	}
	if !actor.IsAdmin {
		return domain.ErrForbidden
	}

	project, err := s.projects.Get(ctx, id)
	if err != nil {
		return err
	}

	return s.withTx(ctx, func(tx pgx.Tx) error {
		if err := s.projects.SoftDelete(ctx, tx, id, actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  id,
			Action:     "project.delete",
			EntityType: "project",
			EntityID:   id,
			Before:     project,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
}

// ListMembers returns project members for members and admins.
func (s *ProjectService) ListMembers(ctx context.Context, actor access.Actor, projectID string) ([]domain.ProjectMember, error) {
	if err := validateUUID(projectID, "id"); err != nil {
		return nil, err
	}
	if _, _, err := s.loadProject(ctx, actor, projectID); err != nil {
		return nil, err
	}

	return s.projects.ListMembers(ctx, projectID)
}

// AddMember adds a user to a project by email.
func (s *ProjectService) AddMember(ctx context.Context, actor access.Actor, projectID string, input domain.AddMemberInput, meta domain.RequestMeta) (domain.ProjectMember, error) {
	if err := validateUUID(projectID, "id"); err != nil {
		return domain.ProjectMember{}, err
	}

	_, role, err := s.loadProject(ctx, actor, projectID)
	if err != nil {
		return domain.ProjectMember{}, err
	}
	if !actor.CanManageProject(role) {
		return domain.ProjectMember{}, domain.ErrForbidden
	}

	email, err := validateMemberInput(&input)
	if err != nil {
		return domain.ProjectMember{}, err
	}

	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if err == domain.ErrNotFound {
			validation := domain.NewValidationError()
			validation.Add("email", "Pengguna dengan email tersebut tidak ditemukan.")
			return domain.ProjectMember{}, validation
		}
		return domain.ProjectMember{}, err
	}

	err = s.withTx(ctx, func(tx pgx.Tx) error {
		if err := s.projects.AddMember(ctx, tx, projectID, user.ID, input.ProjectRole, actor.ID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  projectID,
			Action:     "project.member.add",
			EntityType: "project_member",
			EntityID:   user.ID,
			After: map[string]string{
				"user_id":      user.ID,
				"email":        user.Email,
				"project_role": input.ProjectRole,
			},
			IPAddress: meta.IPAddress,
			UserAgent: meta.UserAgent,
			RequestID: meta.RequestID,
		})
	})
	if err != nil {
		return domain.ProjectMember{}, err
	}

	return s.projects.GetMember(ctx, projectID, user.ID)
}

// UpdateMemberRole changes a member role.
func (s *ProjectService) UpdateMemberRole(ctx context.Context, actor access.Actor, projectID, userID string, input domain.UpdateMemberInput, meta domain.RequestMeta) (domain.ProjectMember, error) {
	if err := validateUUID(projectID, "id"); err != nil {
		return domain.ProjectMember{}, err
	}
	if err := validateUUID(userID, "user_id"); err != nil {
		return domain.ProjectMember{}, err
	}

	_, role, err := s.loadProject(ctx, actor, projectID)
	if err != nil {
		return domain.ProjectMember{}, err
	}
	if !actor.CanManageProject(role) {
		return domain.ProjectMember{}, domain.ErrForbidden
	}

	validation := domain.NewValidationError()
	if !domain.IsValidProjectRole(input.ProjectRole) {
		validation.Add("project_role", "Peran proyek tidak dikenal.")
	}
	if validation.HasErrors() {
		return domain.ProjectMember{}, validation
	}

	before, err := s.projects.GetMember(ctx, projectID, userID)
	if err != nil {
		return domain.ProjectMember{}, err
	}

	err = s.withTx(ctx, func(tx pgx.Tx) error {
		if err := s.projects.UpdateMemberRole(ctx, tx, projectID, userID, input.ProjectRole); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  projectID,
			Action:     "project.member.update",
			EntityType: "project_member",
			EntityID:   userID,
			Before:     before,
			After:      map[string]string{"project_role": input.ProjectRole},
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
	if err != nil {
		return domain.ProjectMember{}, err
	}

	return s.projects.GetMember(ctx, projectID, userID)
}

// RemoveMember removes a user from a project.
func (s *ProjectService) RemoveMember(ctx context.Context, actor access.Actor, projectID, userID string, meta domain.RequestMeta) error {
	if err := validateUUID(projectID, "id"); err != nil {
		return err
	}
	if err := validateUUID(userID, "user_id"); err != nil {
		return err
	}

	_, role, err := s.loadProject(ctx, actor, projectID)
	if err != nil {
		return err
	}
	if !actor.CanManageProject(role) {
		return domain.ErrForbidden
	}

	before, err := s.projects.GetMember(ctx, projectID, userID)
	if err != nil {
		return err
	}

	return s.withTx(ctx, func(tx pgx.Tx) error {
		if err := s.projects.RemoveMember(ctx, tx, projectID, userID); err != nil {
			return err
		}

		return audit.Record(ctx, tx, audit.Entry{
			ActorID:    actor.ID,
			ActorEmail: actor.Email,
			ProjectID:  projectID,
			Action:     "project.member.remove",
			EntityType: "project_member",
			EntityID:   userID,
			Before:     before,
			IPAddress:  meta.IPAddress,
			UserAgent:  meta.UserAgent,
			RequestID:  meta.RequestID,
		})
	})
}

func (s *ProjectService) loadProject(ctx context.Context, actor access.Actor, id string) (domain.Project, string, error) {
	project, err := s.projects.Get(ctx, id)
	if err != nil {
		return domain.Project{}, "", err
	}

	if actor.IsAdmin {
		project.MemberRole = "admin"
		return project, "admin", nil
	}

	role, err := s.projects.MemberRole(ctx, id, actor.ID)
	if err != nil {
		return domain.Project{}, "", err
	}
	if role == "" {
		return domain.Project{}, "", domain.ErrForbidden
	}

	project.MemberRole = role
	return project, role, nil
}

func (s *ProjectService) ensureProjectedCRS(ctx context.Context, srid int) error {
	projected, err := s.projects.CRSIsProjected(ctx, srid)
	if err != nil {
		return err
	}
	if !projected {
		validation := domain.NewValidationError()
		validation.Add("crs_epsg", "CRS harus berupa CRS proyeksi metrik yang dikenal PostGIS.")
		return validation
	}
	return nil
}

func (s *ProjectService) withTx(ctx context.Context, fn func(pgx.Tx) error) error {
	return withTransaction(ctx, s.pool, fn)
}

func validateProjectInput(input *domain.CreateProjectInput) *domain.ValidationError {
	validation := domain.NewValidationError()

	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)
	input.Location = strings.TrimSpace(input.Location)
	input.StartDate = strings.TrimSpace(input.StartDate)
	input.EndDate = strings.TrimSpace(input.EndDate)

	if input.Name == "" {
		validation.Add("name", "Nama proyek wajib diisi.")
	} else if utf8.RuneCountInString(input.Name) > 200 {
		validation.Add("name", "Nama proyek maksimal 200 karakter.")
	}

	if utf8.RuneCountInString(input.Description) > 5000 {
		validation.Add("description", "Deskripsi maksimal 5000 karakter.")
	}
	if utf8.RuneCountInString(input.Location) > 255 {
		validation.Add("location", "Lokasi maksimal 255 karakter.")
	}

	if input.Status == "" {
		input.Status = domain.ProjectStatusPlanning
	}
	if !domain.IsValidProjectStatus(input.Status) {
		validation.Add("status", "Status proyek tidak dikenal.")
	}

	if input.CRSEPSG <= 0 {
		validation.Add("crs_epsg", "CRS proyek wajib dipilih.")
	}

	var start, end time.Time
	var startErr, endErr error
	if input.StartDate != "" {
		start, startErr = time.Parse("2006-01-02", input.StartDate)
		if startErr != nil {
			validation.Add("start_date", "Tanggal mulai harus berformat YYYY-MM-DD.")
		}
	}
	if input.EndDate != "" {
		end, endErr = time.Parse("2006-01-02", input.EndDate)
		if endErr != nil {
			validation.Add("end_date", "Tanggal selesai harus berformat YYYY-MM-DD.")
		}
	}
	if startErr == nil && endErr == nil && input.StartDate != "" && input.EndDate != "" && end.Before(start) {
		validation.Add("end_date", "Tanggal selesai tidak boleh sebelum tanggal mulai.")
	}

	if validation.HasErrors() {
		return validation
	}
	return nil
}

func validateMemberInput(input *domain.AddMemberInput) (string, error) {
	validation := domain.NewValidationError()

	raw := strings.TrimSpace(input.Email)
	email := ""

	if raw == "" {
		validation.Add("email", "Email wajib diisi.")
	} else if parsed, err := mail.ParseAddress(raw); err != nil {
		validation.Add("email", "Format email tidak valid.")
	} else {
		email = parsed.Address
	}

	if !domain.IsValidProjectRole(input.ProjectRole) {
		validation.Add("project_role", "Peran proyek tidak dikenal.")
	}

	if validation.HasErrors() {
		return "", validation
	}

	return email, nil
}

func validateUUID(id, field string) error {
	if !uuidPattern.MatchString(id) {
		validation := domain.NewValidationError()
		validation.Add(field, "Format ID tidak valid.")
		return validation
	}
	return nil
}
