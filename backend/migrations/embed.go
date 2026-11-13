package migrations

import "embed"

// FS contains the SQL migration files applied by cmd/migrate.
//
//go:embed *.sql
var FS embed.FS
