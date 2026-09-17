package recap

import "time"

const (
	// WindowSession is the runtime window for a captured session recap.
	WindowSession = "session"
	// WindowAll is the runtime window for ephemeral all-time status.
	WindowAll = "all"
)

// Presentation is the bounded public all-time recap status (never persisted).
type Presentation struct {
	GeneratedAt string         `json:"generated_at"`
	Totals      Totals         `json:"totals"`
	Ranking     []RankingEntry `json:"ranking"`
}

// NewPresentation builds an all-time presentation from normalized aggregates.
func NewPresentation(generatedAt time.Time, totals Totals, ranking []RankingEntry) *Presentation {
	return &Presentation{
		GeneratedAt: formatRFC3339(generatedAt),
		Totals:      totals,
		Ranking:     ranking,
	}
}
