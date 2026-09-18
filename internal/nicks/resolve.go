package nicks

import (
	"strings"
	"unicode"
	"unicode/utf8"

	"golang.org/x/text/cases"
	"golang.org/x/text/unicode/norm"
)

// Candidate is one session-visible viewer and normalized lookup keys.
type Candidate struct {
	ViewerID  string
	Keys      []string
	Platforms map[string]struct{}
}

// ResolveReason is a nick pipeline rejection reason.
type ResolveReason string

const (
	// ResolveOK means a unique session viewer was selected.
	ResolveOK ResolveReason = ""
	// ResolveNotFound means no candidate matched the query.
	ResolveNotFound ResolveReason = "not_found"
	// ResolveAmbiguous means more than one candidate matched.
	ResolveAmbiguous ResolveReason = "ambiguous"
)

// PrepareRemainder trims the social command payload and strips one leading @.
func PrepareRemainder(remainder string) string {
	remainder = strings.TrimSpace(remainder)
	if strings.HasPrefix(remainder, "@") {
		remainder = strings.TrimSpace(remainder[1:])
	}
	return remainder
}

// NormalizeKey applies NFKC, casefold, and keeps letters and digits only.
func NormalizeKey(raw string) string {
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(raw, "@") {
		raw = strings.TrimSpace(raw[1:])
	}
	raw = norm.NFKC.String(raw)
	raw = cases.Fold().String(raw)
	var b strings.Builder
	for _, r := range raw {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Resolve picks a unique session viewer for a nick query on a command platform.
func Resolve(query, commandPlatform string, candidates []Candidate, distance func(a, b string) int) (viewerID string, reason ResolveReason) {
	normalized := NormalizeKey(query)
	if utf8.RuneCountInString(normalized) < 2 {
		return "", ResolveNotFound
	}

	exact := matchCandidates(normalized, candidates, false, distance)
	if len(exact) == 1 {
		return exact[0], ResolveOK
	}
	if len(exact) > 1 {
		if winner := samePlatformWinner(exact, candidates, commandPlatform); winner != "" {
			return winner, ResolveOK
		}
		return "", ResolveAmbiguous
	}

	if utf8.RuneCountInString(normalized) < 4 {
		return "", ResolveNotFound
	}

	fuzzy := matchCandidates(normalized, candidates, true, distance)
	if len(fuzzy) == 1 {
		return fuzzy[0], ResolveOK
	}
	if len(fuzzy) > 1 {
		return "", ResolveAmbiguous
	}
	return "", ResolveNotFound
}

func matchCandidates(normalized string, candidates []Candidate, fuzzy bool, distance func(a, b string) int) []string {
	seen := make(map[string]struct{})
	var ids []string
	for _, candidate := range candidates {
		matched := false
		for _, key := range candidate.Keys {
			if key == "" {
				continue
			}
			if fuzzy {
				if distance(normalized, key) <= 1 {
					matched = true
					break
				}
			} else if key == normalized {
				matched = true
				break
			}
		}
		if !matched {
			continue
		}
		if _, ok := seen[candidate.ViewerID]; ok {
			continue
		}
		seen[candidate.ViewerID] = struct{}{}
		ids = append(ids, candidate.ViewerID)
	}
	return ids
}

func samePlatformWinner(viewerIDs []string, candidates []Candidate, platform string) string {
	platform = strings.ToLower(strings.TrimSpace(platform))
	if platform == "" {
		return ""
	}
	var winner string
	for _, id := range viewerIDs {
		for _, candidate := range candidates {
			if candidate.ViewerID != id {
				continue
			}
			if _, ok := candidate.Platforms[platform]; ok {
				if winner != "" && winner != id {
					return ""
				}
				winner = id
			}
		}
	}
	return winner
}
