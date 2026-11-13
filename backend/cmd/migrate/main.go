package main

import (
	"fmt"
	"os"

	"github.com/ismw-project/ismw/backend/internal/config"
	"github.com/ismw-project/ismw/backend/internal/migration"
)

const usage = `usage: migrate <command>

commands:
  up        apply all pending migrations
  down      roll back all applied migrations
  version   print the current migration version
`

func main() {
	os.Exit(run())
}

func run() int {
	if len(os.Args) != 2 {
		fmt.Fprint(os.Stderr, usage)
		return 2
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "migrate: %v\n", err)
		return 1
	}

	switch os.Args[1] {
	case "up":
		applied, err := migration.Up(cfg.DatabaseURL)
		if err != nil {
			fmt.Fprintf(os.Stderr, "migrate up: %v\n", err)
			return 1
		}
		if !applied {
			fmt.Println("no pending migrations")
		} else {
			fmt.Println("migrations applied")
		}
	case "down":
		rolledBack, err := migration.Down(cfg.DatabaseURL)
		if err != nil {
			fmt.Fprintf(os.Stderr, "migrate down: %v\n", err)
			return 1
		}
		if !rolledBack {
			fmt.Println("no migrations to roll back")
		} else {
			fmt.Println("migrations rolled back")
		}
	case "version":
		v, dirty, err := migration.Version(cfg.DatabaseURL)
		if err != nil {
			fmt.Fprintf(os.Stderr, "migrate version: %v\n", err)
			return 1
		}
		fmt.Printf("version: %d dirty: %t\n", v, dirty)
	default:
		fmt.Fprint(os.Stderr, usage)
		return 2
	}

	return 0
}
