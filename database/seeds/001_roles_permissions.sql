-- Dummy seed data for local development only.
-- Idempotent: safe to run repeatedly. Never use in production.

INSERT INTO roles (code, name, description, is_system) VALUES
    ('admin',       'Administrator', 'Full system configuration and user management', TRUE),
    ('surveyor',    'Surveyor',      'Field survey, points, and parcel digitisation', TRUE),
    ('gis_analyst', 'GIS Analyst',   'Layer management, spatial analysis, and validation', TRUE),
    ('supervisor',  'Supervisor',    'Review and verification of survey results', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
    ('project.read',            'View projects'),
    ('project.write',           'Create and update projects'),
    ('project.manage_members',  'Manage project membership'),
    ('survey.read',             'View survey activities'),
    ('survey.write',            'Create and update survey activities'),
    ('parcel.read',             'View parcels'),
    ('parcel.write',            'Create and update parcels'),
    ('parcel.verify',           'Approve or reject parcels'),
    ('validation.run',          'Run spatial validation'),
    ('report.read',             'View and export reports'),
    ('user.manage',             'Manage users and roles'),
    ('audit.read',              'Read audit logs')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'project.read', 'survey.read', 'survey.write', 'parcel.read', 'parcel.write'
)
WHERE r.code = 'surveyor'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'project.read', 'survey.read', 'parcel.read', 'parcel.write', 'validation.run'
)
WHERE r.code = 'gis_analyst'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'project.read', 'survey.read', 'parcel.read', 'parcel.verify', 'report.read', 'audit.read'
)
WHERE r.code = 'supervisor'
ON CONFLICT DO NOTHING;

-- Dummy account. The hash is a placeholder and cannot authenticate; real
-- credentials arrive with authentication in Sprint 7.
INSERT INTO users (name, email, password_hash)
VALUES ('Dummy Administrator', 'admin@example.local', 'DUMMY_PLACEHOLDER_NOT_A_VALID_HASH')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'admin'
WHERE u.email = 'admin@example.local'
ON CONFLICT DO NOTHING;
