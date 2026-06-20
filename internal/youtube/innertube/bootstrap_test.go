package innertube

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestExtractInitialData_WhenPopoutPage_ExpectJSON(t *testing.T) {
	t.Parallel()

	html := `<html><script>window["ytInitialData"] = {"contents":{"liveChatRenderer":{"emojis":[]}}};</script></html>`
	data, err := ExtractInitialData(html)
	require.NoError(t, err)
	require.JSONEq(t, `{"contents":{"liveChatRenderer":{"emojis":[]}}}`, string(data))
}

func TestParsePageBootstrap_WhenLiveChatContinuationPresent_ExpectBootstrap(t *testing.T) {
	t.Parallel()

	html := `<html>
<script>window["ytInitialData"] = {
  "contents": {
    "liveChatRenderer": {
      "continuations": [{
        "liveChatContinuationData": {
          "continuation": "CONT_TOKEN_123"
        }
      }]
    }
  }
};</script>
<script>var ytcfg = {"INNERTUBE_API_KEY":"test-api-key","INNERTUBE_CLIENT_VERSION":"2.20250101.00.00"};</script>
</html>`

	bootstrap, err := ParsePageBootstrap(html)
	require.NoError(t, err)
	require.Equal(t, "CONT_TOKEN_123", bootstrap.Continuation)
	require.Equal(t, "test-api-key", bootstrap.APIKey)
	require.Equal(t, "2.20250101.00.00", bootstrap.ClientVersion)
}

func TestParsePageBootstrap_WhenAPIKeyMissing_ExpectError(t *testing.T) {
	t.Parallel()

	html := `<html><script>window["ytInitialData"] = {
	  "contents": {"liveChatRenderer": {"continuations": [{"liveChatContinuationData": {"continuation": "token"}}]}}
	};</script></html>`

	_, err := ParsePageBootstrap(html)
	require.Error(t, err)
}
