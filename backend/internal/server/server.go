package server

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/config"
	"github.com/ismw-project/ismw/backend/internal/handler"
	"github.com/ismw-project/ismw/backend/internal/httpx"
	"github.com/ismw-project/ismw/backend/internal/middleware"
	"github.com/ismw-project/ismw/backend/internal/repository"
	"github.com/ismw-project/ismw/backend/internal/service"
)

const shutdownTimeout = 10 * time.Second

// Server wires middleware, routes, and graceful shutdown.
type Server struct {
	cfg    *config.Config
	log    *slog.Logger
	engine *gin.Engine
	http   *http.Server
}

func New(cfg *config.Config, log *slog.Logger, db *pgxpool.Pool) *Server {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.Use(
		middleware.Recovery(log),
		middleware.RequestID(),
		middleware.Logger(log),
		middleware.CORS(cfg.CORSAllowedOrigins),
	)

	health := handler.NewHealth(db)
	engine.GET("/healthz", health.Live)

	projectRepository := repository.NewProjectRepository(db)
	userRepository := repository.NewUserRepository(db)
	surveyRepository := repository.NewSurveyRepository(db)
	areaRepository := repository.NewSurveyAreaRepository(db)
	pointRepository := repository.NewSurveyPointRepository(db)
	parcelRepository := repository.NewParcelRepository(db)

	projectService := service.NewProjectService(db, projectRepository, userRepository)
	surveyService := service.NewSurveyService(db, surveyRepository, projectRepository, userRepository)
	areaService := service.NewSurveyAreaService(db, areaRepository, projectRepository)
	pointService := service.NewSurveyPointService(db, pointRepository, surveyRepository, projectRepository)
	parcelService := service.NewParcelService(db, parcelRepository, projectRepository, surveyRepository)

	projectHandler := handler.NewProjectHandler(projectService)
	surveyHandler := handler.NewSurveyHandler(surveyService)
	areaHandler := handler.NewSurveyAreaHandler(areaService)
	pointHandler := handler.NewSurveyPointHandler(pointService)
	parcelHandler := handler.NewParcelHandler(parcelService)

	api := engine.Group("/api/v1")
	api.GET("/health", health.Check)

	secured := api.Group("")
	secured.Use(middleware.Actor(cfg, db, log))

	secured.GET("/projects", projectHandler.List)
	secured.POST("/projects", projectHandler.Create)
	secured.GET("/projects/:id", projectHandler.Get)
	secured.PUT("/projects/:id", projectHandler.Update)
	secured.DELETE("/projects/:id", projectHandler.Delete)

	secured.GET("/projects/:id/members", projectHandler.ListMembers)
	secured.POST("/projects/:id/members", projectHandler.AddMember)
	secured.PUT("/projects/:id/members/:userId", projectHandler.UpdateMemberRole)
	secured.DELETE("/projects/:id/members/:userId", projectHandler.RemoveMember)

	secured.GET("/projects/:id/survey-areas", areaHandler.List)
	secured.POST("/projects/:id/survey-areas", areaHandler.Create)
	secured.DELETE("/survey-areas/:areaId", areaHandler.Delete)

	secured.GET("/surveys", surveyHandler.List)
	secured.POST("/surveys", surveyHandler.Create)
	secured.GET("/surveys/:id", surveyHandler.Get)
	secured.PUT("/surveys/:id", surveyHandler.Update)
	secured.DELETE("/surveys/:id", surveyHandler.Delete)

	secured.GET("/surveys/:id/points", pointHandler.List)
	secured.POST("/surveys/:id/points", pointHandler.Create)
	secured.PUT("/surveys/:id/points/:pointId", pointHandler.Update)
	secured.DELETE("/surveys/:id/points/:pointId", pointHandler.Delete)

	secured.GET("/parcels", parcelHandler.List)
	secured.POST("/parcels", parcelHandler.Create)
	secured.GET("/parcels/:id", parcelHandler.Get)
	secured.PUT("/parcels/:id", parcelHandler.Update)
	secured.DELETE("/parcels/:id", parcelHandler.Delete)
	secured.PUT("/parcels/:id/geometry", parcelHandler.UpdateGeometry)
	secured.PUT("/parcels/:id/status", parcelHandler.UpdateStatus)
	secured.GET("/parcels/:id/versions", parcelHandler.Versions)

	secured.GET("/projects/:id/features", parcelHandler.Features)

	engine.NoRoute(httpx.NotFound)

	return &Server{
		cfg:    cfg,
		log:    log,
		engine: engine,
		http: &http.Server{
			Addr:              ":" + cfg.HTTPPort,
			Handler:           engine,
			ReadHeaderTimeout: 10 * time.Second,
			ReadTimeout:       30 * time.Second,
			WriteTimeout:      60 * time.Second,
			IdleTimeout:       90 * time.Second,
		},
	}
}

// Run starts the HTTP server and blocks until ctx is cancelled or a fatal
// listener error occurs.
func (s *Server) Run(ctx context.Context) error {
	errCh := make(chan error, 1)

	go func() {
		s.log.Info("http server listening",
			"address", s.http.Addr,
			"env", s.cfg.AppEnv,
			"cors_origins", s.cfg.CORSAllowedOrigins,
		)
		if err := s.http.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("http server: %w", err)
	case <-ctx.Done():
		s.log.Info("shutdown signal received")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	if err := s.http.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}

	s.log.Info("http server stopped")
	return nil
}
