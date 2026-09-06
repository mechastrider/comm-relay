package store

import "github.com/muonsoft/errors"

var (
	// ErrNotFound is returned when a viewer id is missing or hidden.
	ErrNotFound = errors.New("viewer not found")
	// ErrSelfMerge is returned when merge source and target are the same viewer.
	ErrSelfMerge = errors.New("cannot merge viewer into itself")
	// ErrCommandNotFound is returned when a command id is missing.
	ErrCommandNotFound = errors.New("command not found")
	// ErrAwardNotFound is returned when an award type id is missing.
	ErrAwardNotFound = errors.New("award not found")
	// ErrDuplicateTrigger is returned when a command trigger already exists.
	ErrDuplicateTrigger = errors.New("duplicate trigger")
	// ErrInvalidTrigger is returned when a command trigger fails slug validation.
	ErrInvalidTrigger = errors.New("invalid trigger")
	// ErrInvalidCommandAction is returned when a command action is unsupported.
	ErrInvalidCommandAction = errors.New("invalid command action")
	// ErrInvalidPoints is returned when award points are below one.
	ErrInvalidPoints = errors.New("invalid points")
	// ErrInvalidIdentity is returned when platform or user_id is empty for award grants.
	ErrInvalidIdentity = errors.New("invalid identity")
)
