package vk

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type staticHTTPClient struct {
	body       string
	statusCode int
}

func (c *staticHTTPClient) Do(req *http.Request) (*http.Response, error) {
	return &http.Response{
		StatusCode: c.statusCode,
		Body:       io.NopCloser(strings.NewReader(c.body)),
		Header:     make(http.Header),
		Request:    req,
	}, nil
}

func TestFetchWebSocketToken_WhenAppConfigScriptHasTypePlain_ExpectToken(t *testing.T) {
	t.Parallel()

	const token = "test-ws-token"
	html := `<!DOCTYPE html><html><body>` +
		`<script type="text/plain" id="app-config">{"websocket":{"token":"` + token + `"}}</script>` +
		`</body></html>`

	client := &defaultClient{
		httpClient: &staticHTTPClient{body: html, statusCode: http.StatusOK},
	}

	got, err := client.fetchWebSocketToken(context.Background())
	require.NoError(t, err)
	require.Equal(t, token, got)
}

func TestFetchWebSocketToken_WhenAppConfigMissing_ExpectErrNoWebSocketToken(t *testing.T) {
	t.Parallel()

	client := &defaultClient{
		httpClient: &staticHTTPClient{body: "<html></html>", statusCode: http.StatusOK},
	}

	_, err := client.fetchWebSocketToken(context.Background())
	require.ErrorIs(t, err, errNoWebSocketToken)
}
