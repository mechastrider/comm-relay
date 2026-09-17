package command

import (
	"github.com/mechastrider/comm-relay/internal/store"
)

const (
	// MatchKindExact is a whole-line bang token equal to the canonical trigger.
	MatchKindExact = "exact"
	// MatchKindAlias is a whole-line bang token equal to a catalog alias.
	MatchKindAlias = "alias"
	// MatchKindFuzzy is a unique Damerau-Levenshtein distance ≤ 1 typo match.
	MatchKindFuzzy = "fuzzy"
)

// LookupMatch is the result of resolving a chat line to a catalog command.
type LookupMatch struct {
	Command       *store.Command
	Kind          string
	Token         string
	AmbiguousTypo bool
}
