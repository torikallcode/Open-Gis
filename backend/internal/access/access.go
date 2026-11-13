package access

import "github.com/gin-gonic/gin"

// ActorKey is the gin context key holding the authenticated actor.
const ActorKey = "actor"

// Actor represents the user performing the current request.
type Actor struct {
	ID      string
	Email   string
	Name    string
	IsAdmin bool
}

// FromContext returns the actor attached by the actor middleware.
func FromContext(c *gin.Context) (Actor, bool) {
	value, exists := c.Get(ActorKey)
	if !exists {
		return Actor{}, false
	}

	actor, ok := value.(Actor)
	return actor, ok
}

// CanManageProject allows admins and project managers to change a project.
func (a Actor) CanManageProject(projectRole string) bool {
	return a.IsAdmin || projectRole == "manager"
}

// CanWriteSurvey allows admins, managers, and surveyors to write survey data.
func (a Actor) CanWriteSurvey(projectRole string) bool {
	return a.IsAdmin || projectRole == "manager" || projectRole == "surveyor"
}
