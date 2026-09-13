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
	// ErrInvalidAwardName is returned when an award-event snapshot is empty.
	ErrInvalidAwardName = errors.New("invalid award name")
	// ErrInvalidRewardHistoryLimit is returned for a history page outside its supported bounds.
	ErrInvalidRewardHistoryLimit = errors.New("invalid reward history limit")
	// ErrInvalidRewardHistoryCursor is returned for malformed or unsupported history cursors.
	ErrInvalidRewardHistoryCursor = errors.New("invalid reward history cursor")
	// ErrViewerContractNotFound is returned when a contract id is unknown.
	ErrViewerContractNotFound = errors.New("viewer contract not found")
	// ErrViewerContractConflict is returned when a lifecycle action no longer targets the active contract.
	ErrViewerContractConflict = errors.New("viewer contract conflict")
	// ErrInvalidViewerContract is returned for invalid contract input.
	ErrInvalidViewerContract = errors.New("invalid viewer contract")
	// ErrGreetingNotFound is returned when a reserved greeting definition is missing.
	ErrGreetingNotFound = errors.New("greeting definition not found")
	// ErrProgressionLevelNotFound is returned when a level id is unknown.
	ErrProgressionLevelNotFound = errors.New("progression level not found")
	// ErrAchievementNotFound is returned when an achievement id is unknown.
	ErrAchievementNotFound = errors.New("achievement not found")
	// ErrProgressionValidation is returned for a bounded progression catalog value.
	ErrProgressionValidation = errors.New("invalid progression value")
	// ErrBaselineLevel is returned when an operation would remove or move the zero-XP level.
	ErrBaselineLevel = errors.New("baseline progression level is protected")

	// ErrSessionNotFound is returned when a stream session id is unknown.
	ErrSessionNotFound = errors.New("session not found")
	// ErrInvalidSessionListLimit is returned for a session page outside its supported bounds.
	ErrInvalidSessionListLimit = errors.New("invalid session list limit")
	// ErrInvalidSessionCursor is returned for a malformed or unsupported session cursor.
	ErrInvalidSessionCursor = errors.New("invalid session list cursor")
	// ErrRecapSessionConflict is returned when Show targets a stale or non-current session.
	ErrRecapSessionConflict = errors.New("recap session conflict")
	// ErrRecapPayloadInvalid is returned when a recap snapshot fails validation.
	ErrRecapPayloadInvalid = errors.New("recap payload invalid")
	// ErrRecapNotFound is returned when a session has no stored recap snapshot.
	ErrRecapNotFound = errors.New("stream recap not found")
)
