package version

// Overridable at build time, e.g.:
//
//	go build -ldflags "-X .../internal/version.Version=1.0.0"
var (
	Version   = "dev"
	Commit    = "none"
	BuildDate = "unknown"
)
