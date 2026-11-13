-- Survey management (Sprint 3B): surveys, project work areas, survey points.

CREATE TABLE surveys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    surveyor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name        VARCHAR(200) NOT NULL,
    survey_date DATE,
    method      VARCHAR(100),
    status      VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes       TEXT,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT surveys_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT surveys_status_check CHECK (
        status IN ('draft', 'in_progress', 'completed', 'cancelled')
    )
);

CREATE INDEX surveys_project_date_idx ON surveys (project_id, survey_date DESC);
CREATE INDEX surveys_status_idx ON surveys (status);
CREATE INDEX surveys_surveyor_idx ON surveys (surveyor_id);
CREATE INDEX surveys_deleted_at_idx ON surveys (deleted_at);

CREATE TRIGGER surveys_set_updated_at
BEFORE UPDATE ON surveys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE survey_areas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    boundary    geometry(MultiPolygon, 4326) NOT NULL,
    area_m2     NUMERIC(18, 2) NOT NULL,
    area_method VARCHAR(50) NOT NULL DEFAULT 'st_transform_metric',
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT survey_areas_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT survey_areas_srid_check CHECK (ST_SRID(boundary) = 4326),
    CONSTRAINT survey_areas_valid_check CHECK (ST_IsValid(boundary)),
    CONSTRAINT survey_areas_area_check CHECK (area_m2 > 0)
);

CREATE INDEX survey_areas_boundary_gix ON survey_areas USING GIST (boundary);
CREATE INDEX survey_areas_project_idx ON survey_areas (project_id);

CREATE TRIGGER survey_areas_set_updated_at
BEFORE UPDATE ON survey_areas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE survey_points (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id    UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    point_code   VARCHAR(50) NOT NULL,
    location     geometry(Point, 4326) NOT NULL,
    accuracy_m   NUMERIC(8, 3),
    elevation_m  NUMERIC(8, 2),
    source       VARCHAR(100),
    recorded_at  TIMESTAMPTZ,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT survey_points_code_not_blank CHECK (length(btrim(point_code)) > 0),
    CONSTRAINT survey_points_srid_check CHECK (ST_SRID(location) = 4326),
    CONSTRAINT survey_points_accuracy_check CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
    CONSTRAINT survey_points_code_unique UNIQUE (survey_id, point_code)
);

CREATE INDEX survey_points_location_gix ON survey_points USING GIST (location);
CREATE INDEX survey_points_survey_idx ON survey_points (survey_id);

CREATE TRIGGER survey_points_set_updated_at
BEFORE UPDATE ON survey_points
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
