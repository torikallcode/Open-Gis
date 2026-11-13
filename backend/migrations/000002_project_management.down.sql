DROP INDEX IF EXISTS projects_created_at_idx;
DROP INDEX IF EXISTS projects_name_lower_idx;

ALTER TABLE projects
    DROP COLUMN IF EXISTS updated_by;
