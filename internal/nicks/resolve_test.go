package nicks_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/nicks"
)

func TestResolveNick_WhenUniqueExact_ExpectViewer(t *testing.T) {
	t.Parallel()

	candidates := []nicks.Candidate{{
		ViewerID:  "bob-id",
		Keys:      []string{"bob"},
		Platforms: map[string]struct{}{"twitch": {}},
	}}
	id, reason := nicks.ResolveNick("Bob", "twitch", candidates)
	require.Equal(t, nicks.ResolveOK, reason)
	require.Equal(t, "bob-id", id)
}

func TestResolveNick_WhenSamePlatformDisambiguates_ExpectTwitchBob(t *testing.T) {
	t.Parallel()

	candidates := []nicks.Candidate{
		{ViewerID: "twitch-bob", Keys: []string{"bob"}, Platforms: map[string]struct{}{"twitch": {}}},
		{ViewerID: "yt-bob", Keys: []string{"bob"}, Platforms: map[string]struct{}{"youtube": {}}},
	}
	id, reason := nicks.ResolveNick("bob", "twitch", candidates)
	require.Equal(t, nicks.ResolveOK, reason)
	require.Equal(t, "twitch-bob", id)
}

func TestResolveNick_WhenAmbiguousExact_ExpectAmbiguous(t *testing.T) {
	t.Parallel()

	candidates := []nicks.Candidate{
		{ViewerID: "a1", Keys: []string{"alice"}, Platforms: map[string]struct{}{"youtube": {}}},
		{ViewerID: "a2", Keys: []string{"alice"}, Platforms: map[string]struct{}{"youtube": {}}},
	}
	_, reason := nicks.ResolveNick("alice", "youtube", candidates)
	require.Equal(t, nicks.ResolveAmbiguous, reason)
}

func TestResolveNick_WhenUniqueTypo_ExpectMatch(t *testing.T) {
	t.Parallel()

	candidates := []nicks.Candidate{{
		ViewerID:  "alice-id",
		Keys:      []string{"alice"},
		Platforms: map[string]struct{}{"twitch": {}},
	}}
	id, reason := nicks.ResolveNick("alicx", "twitch", candidates)
	require.Equal(t, nicks.ResolveOK, reason)
	require.Equal(t, "alice-id", id)
}

func TestResolveNick_WhenTwoFuzzyMatchesInBand_ExpectAmbiguous(t *testing.T) {
	t.Parallel()

	// alice and alicy are both Damerau distance 1 from alicx (one substitution).
	candidates := []nicks.Candidate{
		{ViewerID: "alice-id", Keys: []string{"alice"}, Platforms: map[string]struct{}{"twitch": {}}},
		{ViewerID: "alicy-id", Keys: []string{"alicy"}, Platforms: map[string]struct{}{"twitch": {}}},
	}
	_, reason := nicks.ResolveNick("alicx", "twitch", candidates)
	require.Equal(t, nicks.ResolveAmbiguous, reason)
}

func TestResolveNick_WhenCyrillicUniqueTypo_ExpectMatch(t *testing.T) {
	t.Parallel()

	candidates := []nicks.Candidate{{
		ViewerID:  "alice-id",
		Keys:      []string{"алиса"},
		Platforms: map[string]struct{}{"twitch": {}},
	}}
	id, reason := nicks.ResolveNick("алисх", "twitch", candidates)
	require.Equal(t, nicks.ResolveOK, reason)
	require.Equal(t, "alice-id", id)
}

func TestResolveNick_WhenOneRuneQuery_ExpectNotFound(t *testing.T) {
	t.Parallel()

	candidates := []nicks.Candidate{{
		ViewerID: "a-id", Keys: []string{"ab"}, Platforms: map[string]struct{}{"twitch": {}},
	}}
	_, reason := nicks.ResolveNick("a", "twitch", candidates)
	require.Equal(t, nicks.ResolveNotFound, reason)
}

func TestResolveNick_WhenTwoRuneQuery_ExpectNoFuzzy(t *testing.T) {
	t.Parallel()

	candidates := []nicks.Candidate{{
		ViewerID: "long-id", Keys: []string{"abcd"}, Platforms: map[string]struct{}{"twitch": {}},
	}}
	_, reason := nicks.ResolveNick("ab", "twitch", candidates)
	require.Equal(t, nicks.ResolveNotFound, reason)
}

func TestResolveNick_WhenCyrillicCaseExact_ExpectMatch(t *testing.T) {
	t.Parallel()

	candidates := []nicks.Candidate{{
		ViewerID: "alice-id", Keys: []string{"алиса"}, Platforms: map[string]struct{}{"twitch": {}},
	}}
	id, reason := nicks.ResolveNick("Алиса", "twitch", candidates)
	require.Equal(t, nicks.ResolveOK, reason)
	require.Equal(t, "alice-id", id)
}
