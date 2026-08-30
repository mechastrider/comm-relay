package bootstrap

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestWaitHTTPReady_WhenInstanceMatches_ExpectReady(t *testing.T) {
	t.Parallel()

	const instanceID = "test-instance-1"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(healthPayload{
			Status:     "ok",
			InstanceID: instanceID,
		})
	}))
	t.Cleanup(srv.Close)

	err := waitHTTPReady(context.Background(), srv.URL, instanceID, 2*time.Second)
	require.NoError(t, err)
}

func TestWaitHTTPReady_WhenForeignInstance_ExpectTimeout(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(healthPayload{
			Status:     "ok",
			InstanceID: "foreign",
		})
	}))
	t.Cleanup(srv.Close)

	err := waitHTTPReady(context.Background(), srv.URL, "expected", 500*time.Millisecond)
	require.Error(t, err)
	require.Contains(t, err.Error(), "another CommRelay instance")
}
