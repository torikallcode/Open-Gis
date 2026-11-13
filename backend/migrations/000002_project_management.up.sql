-- Project management support (Sprint 3A).

ALTER TABLE projects
    ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX projects_name_lower_idx ON projects (lower(name));
CREATE INDEX projects_created_at_idx ON projects (created_at DESC);
