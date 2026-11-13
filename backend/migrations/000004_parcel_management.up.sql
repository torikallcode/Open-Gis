-- Parcel management (Sprint 4): parcels with immutable version history.

CREATE TABLE parcels (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    survey_id           UUID REFERENCES surveys(id) ON DELETE SET NULL,
    parcel_code         VARCHAR(50) NOT NULL,
    land_use            VARCHAR(100),
    notes               TEXT,
    attributes          JSONB NOT NULL DEFAULT '{}'::jsonb,
    boundary            geometry(MultiPolygon, 4326) NOT NULL,
    area_m2             NUMERIC(18, 2) NOT NULL,
    area_method         VARCHAR(50) NOT NULL DEFAULT 'st_transform_metric',
    verification_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    review_note         TEXT,
    current_version     INTEGER NOT NULL DEFAULT 1,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT parcels_code_not_blank CHECK (length(btrim(parcel_code)) > 0),
    CONSTRAINT parcels_status_check CHECK (
        verification_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')
    ),
    CONSTRAINT parcels_area_check CHECK (area_m2 >= 0),
    CONSTRAINT parcels_version_check CHECK (current_version >= 1),
    CONSTRAINT parcels_srid_check CHECK (ST_SRID(boundary) = 4326),
    CONSTRAINT parcels_valid_check CHECK (ST_IsValid(boundary))
);

CREATE UNIQUE INDEX parcels_project_code_unique
    ON parcels (project_id, lower(parcel_code))
    WHERE deleted_at IS NULL;

CREATE INDEX parcels_boundary_gix ON parcels USING GIST (boundary);
CREATE INDEX parcels_project_idx ON parcels (project_id);
CREATE INDEX parcels_survey_idx ON parcels (survey_id);
CREATE INDEX parcels_status_idx ON parcels (verification_status);
CREATE INDEX parcels_deleted_at_idx ON parcels (deleted_at);

CREATE TRIGGER parcels_set_updated_at
BEFORE UPDATE ON parcels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE parcel_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id           UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    version_number      INTEGER NOT NULL,
    parcel_code         VARCHAR(50) NOT NULL,
    land_use            VARCHAR(100),
    notes               TEXT,
    attributes          JSONB NOT NULL DEFAULT '{}'::jsonb,
    boundary            geometry(MultiPolygon, 4326) NOT NULL,
    area_m2             NUMERIC(18, 2) NOT NULL,
    verification_status VARCHAR(20) NOT NULL,
    change_reason       TEXT,
    changed_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT parcel_versions_number_check CHECK (version_number >= 1),
    CONSTRAINT parcel_versions_srid_check CHECK (ST_SRID(boundary) = 4326),
    CONSTRAINT parcel_versions_unique UNIQUE (parcel_id, version_number)
);

CREATE INDEX parcel_versions_parcel_idx
    ON parcel_versions (parcel_id, version_number DESC);
