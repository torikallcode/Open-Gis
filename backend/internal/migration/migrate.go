package migration

import (
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"github.com/ismw-project/ismw/backend/migrations"
)

func newMigrator(databaseURL string) (*migrate.Migrate, error) {
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return nil, fmt.Errorf("load embedded migrations: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", source, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("initialise migrator: %w", err)
	}

	return m, nil
}

// Up applies all pending migrations.
func Up(databaseURL string) (bool, error) {
	m, err := newMigrator(databaseURL)
	if err != nil {
		return false, err
	}
	defer m.Close()

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			return false, nil
		}
		return false, fmt.Errorf("apply migrations: %w", err)
	}
	return true, nil
}

// Down rolls back every applied migration.
func Down(databaseURL string) (bool, error) {
	m, err := newMigrator(databaseURL)
	if err != nil {
		return false, err
	}
	defer m.Close()

	if err := m.Down(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			return false, nil
		}
		return false, fmt.Errorf("roll back migrations: %w", err)
	}
	return true, nil
}

// Version reports the current migration version and dirty flag.
func Version(databaseURL string) (uint, bool, error) {
	m, err := newMigrator(databaseURL)
	if err != nil {
		return 0, false, err
	}
	defer m.Close()

	version, dirty, err := m.Version()
	if err != nil {
		if errors.Is(err, migrate.ErrNilVersion) {
			return 0, false, nil
		}
		return 0, false, fmt.Errorf("read migration version: %w", err)
	}
	return version, dirty, nil
}
