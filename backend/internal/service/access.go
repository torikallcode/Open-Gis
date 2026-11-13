package service

import (
	"context"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/domain"
	"github.com/ismw-project/ismw/backend/internal/repository"
)

// resolveProjectRole verifies the project exists and returns the actor's
// project role ("admin" for global admins).
func resolveProjectRole(
	ctx context.Context,
	projects *repository.ProjectRepository,
	actor access.Actor,
	projectID string,
) (domain.Project, string, error) {
	project, err := projects.Get(ctx, projectID)
	if err != nil {
		return domain.Project{}, "", err
	}

	if actor.IsAdmin {
		project.MemberRole = "admin"
		return project, "admin", nil
	}

	role, err := projects.MemberRole(ctx, projectID, actor.ID)
	if err != nil {
		return domain.Project{}, "", err
	}
	if role == "" {
		return domain.Project{}, "", domain.ErrForbidden
	}

	project.MemberRole = role
	return project, role, nil
}

// loadSurveyWithAccess loads a survey and the actor's role in its project.
func loadSurveyWithAccess(
	ctx context.Context,
	surveys *repository.SurveyRepository,
	projects *repository.ProjectRepository,
	actor access.Actor,
	id string,
) (domain.Survey, string, error) {
	survey, err := surveys.Get(ctx, id)
	if err != nil {
		return domain.Survey{}, "", err
	}

	_, role, err := resolveProjectRole(ctx, projects, actor, survey.ProjectID)
	if err != nil {
		return domain.Survey{}, "", err
	}

	return survey, role, nil
}
