package avatarcache_test

import (
	"context"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/avatarcache"
	"github.com/mechastrider/comm-relay/internal/store"
)

func tinyPNG() []byte {
	data, err := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
	if err != nil {
		panic(err)
	}
	return data
}

func TestValidateFetchURL_WhenPrivateIP_ExpectRejected(t *testing.T) {
	t.Parallel()

	assert.False(t, avatarcache.ValidateFetchURL("https://127.0.0.1/avatar.png"))
	assert.False(t, avatarcache.ValidateFetchURL("https://localhost/avatar.png"))
}

func TestFetch_WhenRemoteUnavailable_ExpectError(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	client := avatarcache.NewHTTPClient(2 * time.Second)
	_, err := avatarcache.Fetch(ctx, client, "https://example.com/does-not-exist-avatar.png")
	require.Error(t, err)
}

func TestWorker_Enqueue_WhenPrivateURL_ExpectNoCacheWrite(t *testing.T) {
	s, assetsDir := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC-private",
		AvatarURL: "https://127.0.0.1/avatar.png",
	}, store.ActivitySettings{}, 6, now))

	worker := avatarcache.NewWorker(s, assetsDir)
	startTestWorker(t, worker)

	worker.Enqueue("youtube", "UC-private")
	time.Sleep(50 * time.Millisecond)

	cache, err := s.PortraitCacheFilename("youtube", "UC-private")
	require.NoError(t, err)
	assert.Empty(t, cache)
}

func TestWorker_Enqueue_WhenFetchSucceeds_ExpectCachedPortrait(t *testing.T) {
	s, assetsDir := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	remote := "https://yt3.ggpht.com/avatars/test.png"
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC-cache",
		AvatarURL: remote,
	}, store.ActivitySettings{}, 6, now))

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(tinyPNG())
	}))
	defer server.Close()

	client := avatarcache.NewHTTPClient(5 * time.Second)
	client.Transport = localTransport(server)

	worker := avatarcache.NewWorkerWithHTTPClient(s, assetsDir, client)
	startTestWorker(t, worker)

	worker.Enqueue("youtube", "UC-cache")
	require.Eventually(t, func() bool {
		cache, err := s.PortraitCacheFilename("youtube", "UC-cache")
		return err == nil && cache != ""
	}, time.Second, 10*time.Millisecond)

	resolved, err := s.ResolveIdentityPortraitURL("youtube", "UC-cache")
	require.NoError(t, err)
	assert.Contains(t, resolved, "/overlay/assets/asset_")
}

func TestWorker_Enqueue_WhenFetchFails_ExpectRemotePreserved(t *testing.T) {
	s, assetsDir := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	remote := "https://yt3.ggpht.com/avatars/fail.png"
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC-fail",
		AvatarURL: remote,
	}, store.ActivitySettings{}, 6, now))

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	client := avatarcache.NewHTTPClient(5 * time.Second)
	client.Transport = localTransport(server)

	worker := avatarcache.NewWorkerWithHTTPClient(s, assetsDir, client)
	startTestWorker(t, worker)

	worker.Enqueue("youtube", "UC-fail")
	time.Sleep(100 * time.Millisecond)

	resolved, err := s.ResolveIdentityPortraitURL("youtube", "UC-fail")
	require.NoError(t, err)
	assert.Equal(t, remote, resolved)
}

func TestWorker_Enqueue_WhenURLRotatesDuringFetch_ExpectCurrentURLCached(t *testing.T) {
	s, assetsDir := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	urlA := "https://yt3.ggpht.com/avatars/a.png"
	urlB := "https://yt3.ggpht.com/avatars/b.png"

	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC-rotate",
		AvatarURL: urlA,
	}, store.ActivitySettings{}, 6, now))

	fetchAStarted := make(chan struct{})
	fetchARelease := make(chan struct{})
	var fetchAOnce sync.Once
	var fetchBCount int
	var fetchBCountMu sync.Mutex

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/avatars/a.png":
			fetchAOnce.Do(func() { close(fetchAStarted) })
			<-fetchARelease
			_, _ = w.Write(tinyPNG())
		case "/avatars/b.png":
			fetchBCountMu.Lock()
			fetchBCount++
			fetchBCountMu.Unlock()
			_, _ = w.Write(tinyPNG())
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := avatarcache.NewHTTPClient(5 * time.Second)
	client.Transport = localTransport(server)

	worker := avatarcache.NewWorkerWithHTTPClient(s, assetsDir, client)
	startTestWorker(t, worker)

	worker.Enqueue("youtube", "UC-rotate")

	select {
	case <-fetchAStarted:
	case <-time.After(time.Second):
		t.Fatal("fetch for URL A did not start")
	}

	_, err := s.ApplyChatResult(store.ChatIdentity{
		Platform:  "youtube",
		UserID:    "UC-rotate",
		AvatarURL: urlB,
	}, store.ActivitySettings{}, 6, now.Add(time.Minute))
	require.NoError(t, err)

	worker.Enqueue("youtube", "UC-rotate")

	close(fetchARelease)

	require.Eventually(t, func() bool {
		cache, cacheErr := s.PortraitCacheFilename("youtube", "UC-rotate")
		return cacheErr == nil && cache != ""
	}, time.Second, 10*time.Millisecond)

	fetchBCountMu.Lock()
	count := fetchBCount
	fetchBCountMu.Unlock()
	require.GreaterOrEqual(t, count, 1, "expected worker to fetch rotated URL B")

	_, ok, err := s.AvatarFetchCandidate("youtube", "UC-rotate")
	require.NoError(t, err)
	assert.False(t, ok)
}

type localRoundTripper struct {
	server *httptest.Server
}

func (rt *localRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	localReq, err := http.NewRequestWithContext(req.Context(), req.Method, rt.server.URL+req.URL.Path, nil)
	if err != nil {
		return nil, err
	}
	return http.DefaultTransport.RoundTrip(localReq)
}

func localTransport(server *httptest.Server) *localRoundTripper {
	return &localRoundTripper{server: server}
}

func startTestWorker(t *testing.T, worker *avatarcache.Worker) {
	t.Helper()

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		worker.Run(ctx)
		close(done)
	}()

	t.Cleanup(func() {
		cancel()
		select {
		case <-done:
		case <-time.After(2 * time.Second):
			t.Fatal("timed out waiting for avatar worker to stop")
		}
	})
}

func openTestStore(t *testing.T) (*store.Store, string) {
	t.Helper()

	dir := t.TempDir()
	path := dir + "/comm-relay.db"
	s, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	return s, dir + "/overlay-assets"
}
