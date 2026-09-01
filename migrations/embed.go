// Package migrations exposes the versioned database migrations embedded in the
// server binary. Keeping SQL as normal files also allows DBAs to inspect or run
// them with standard MySQL tooling.
package migrations

import "embed"

// FS contains every *.sql migration in this directory.
//
//go:embed *.sql
var FS embed.FS
