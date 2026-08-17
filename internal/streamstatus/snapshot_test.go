package streamstatus

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/connector/status"
)

func TestRedactError_WhenSignedURL_ExpectQueryStripped(t *testing.T) {
	t.Parallel()

	msg := "fetch failed https://example.com/live.m3u8?token=secret&expires=123"
	redacted := RedactError(msg)
	require.NotContains(t, redacted, "token=secret")
	require.NotContains(t, redacted, "?")
	require.Contains(t, redacted, "https://example.com/live.m3u8")
}

func TestRedactError_WhenOAuthToken_ExpectSanitized(t *testing.T) {
	t.Parallel()

	msg := "oauth failed access_token=supersecret12345"
	redacted := RedactError(msg)
	require.Contains(t, redacted, "access_token=[redacted]")
	require.NotContains(t, redacted, "supersecret12345")
}

func TestSnapshot_WhenMarshaled_ExpectNoSignedURLsOrTokens(t *testing.T) {
	t.Parallel()

	errText := "probe https://cdn.example.com/stream.m3u8?sig=abc&access_token=leak"
	snap := Snapshot{
		Platform:     status.PlatformTwitch,
		Mode:         "none",
		Capabilities: []string{CapChatHealth},
		State:        StateUnknown,
		SampledAt:    time.Date(2026, 8, 17, 12, 0, 0, 0, time.UTC),
		Probe: Probe{
			Source:              "test",
			ConsecutiveFailures: 1,
			LastError:           &errText,
		},
		Ingest: Ingest{
			Issues: []IngestIssue{},
		},
	}

	redacted := redactSnapshot(snap)
	data, err := json.Marshal(redacted)
	require.NoError(t, err)
	body := string(data)
	require.NotContains(t, body, "access_token=leak")
	require.NotContains(t, body, "?sig=abc")
}

func TestSnapshot_WhenViewersNull_ExpectJSONNullNotOmitted(t *testing.T) {
	t.Parallel()

	snap := emptySnapshot(status.PlatformTwitch, time.Date(2026, 8, 17, 12, 0, 0, 0, time.UTC))
	data, err := json.Marshal(snap)
	require.NoError(t, err)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(data, &payload))

	viewers, ok := payload["viewers"].(map[string]any)
	require.True(t, ok)
	require.Contains(t, viewers, "current")
	require.Nil(t, viewers["current"])
}
