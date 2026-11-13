-- Roll back the Sprint 1 foundation schema.
-- PostGIS/pgcrypto extensions are intentionally left installed.

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

DROP FUNCTION IF EXISTS set_updated_at();
