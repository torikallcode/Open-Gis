-- Dummy users for testing project membership and authorization.
-- Password hashes are placeholders and cannot authenticate (auth lands in Sprint 7).

INSERT INTO users (name, email, password_hash) VALUES
    ('Dummy Surveyor', 'surveyor@example.local', 'DUMMY_PLACEHOLDER_NOT_A_VALID_HASH'),
    ('Dummy GIS Analyst', 'analyst@example.local', 'DUMMY_PLACEHOLDER_NOT_A_VALID_HASH'),
    ('Dummy Supervisor', 'supervisor@example.local', 'DUMMY_PLACEHOLDER_NOT_A_VALID_HASH')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'surveyor'
WHERE u.email = 'surveyor@example.local'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'gis_analyst'
WHERE u.email = 'analyst@example.local'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'supervisor'
WHERE u.email = 'supervisor@example.local'
ON CONFLICT DO NOTHING;
