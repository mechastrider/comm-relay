package store

import "github.com/muonsoft/errors"

var (
	// ErrNotFound is returned when a viewer id is missing or hidden.
	ErrNotFound = errors.New("viewer not found")
	// ErrSelfMerge is returned when merge source and target are the same viewer.
	ErrSelfMerge = errors.New("cannot merge viewer into itself")
)
