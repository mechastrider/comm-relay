package avatarcache

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/store"
)

const (
	defaultQueueCapacity = 64
	defaultFetchTimeout  = 15 * time.Second
)

type cacheJob struct {
	platform string
	userID   string
}

// Worker asynchronously caches connector-supplied avatar URLs.
type Worker struct {
	store     *store.Store
	assetsDir string
	queue     chan cacheJob
	inflight  map[string]struct{}
	pending   map[string]bool
	client    *http.Client
	mu        sync.Mutex
}

// NewWorker creates an avatar cache worker for the given overlay-assets directory.
func NewWorker(viewerStore *store.Store, assetsDir string) *Worker {
	return NewWorkerWithHTTPClient(viewerStore, assetsDir, NewHTTPClient(defaultFetchTimeout))
}

// NewWorkerWithHTTPClient creates a worker that uses the provided HTTP client.
func NewWorkerWithHTTPClient(viewerStore *store.Store, assetsDir string, client *http.Client) *Worker {
	return &Worker{
		store:     viewerStore,
		assetsDir: assetsDir,
		queue:     make(chan cacheJob, defaultQueueCapacity),
		inflight:  make(map[string]struct{}),
		pending:   make(map[string]bool),
		client:    client,
	}
}

// Enqueue schedules a cache fetch when the identity still needs a local portrait.
func (w *Worker) Enqueue(platform, userID string) {
	if w == nil || w.store == nil || strings.TrimSpace(platform) == "" || strings.TrimSpace(userID) == "" {
		return
	}

	remoteURL, ok, err := w.store.AvatarFetchCandidate(platform, userID)
	if err != nil {
		clog.Warn(context.Background(), "avatar fetch candidate lookup failed",
			slog.String("platform", platform),
			slog.String("user_id", userID),
			slog.Any("error", err),
		)
		return
	}
	if !ok || remoteURL == "" {
		return
	}

	key := identityKey(platform, userID)
	w.mu.Lock()
	if _, inflight := w.inflight[key]; inflight {
		w.pending[key] = true
		w.mu.Unlock()
		return
	}
	w.mu.Unlock()

	w.pushJob(cacheJob{platform: platform, userID: userID})
}

// DeleteOrphanedCache removes a replaced cache file when the remote URL rotated.
func (w *Worker) DeleteOrphanedCache(filename string) {
	if w == nil || strings.TrimSpace(filename) == "" {
		return
	}

	if err := overlayassets.Delete(w.assetsDir, filename); err != nil {
		clog.Warn(context.Background(), "delete orphaned avatar cache file failed",
			slog.String("filename", filename),
			slog.Any("error", err),
		)
	}
}

// Run processes queued avatar fetches until the context is cancelled.
func (w *Worker) Run(ctx context.Context) {
	if w == nil {
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case item, ok := <-w.queue:
			if !ok {
				return
			}
			w.process(ctx, item)
		}
	}
}

func (w *Worker) pushJob(item cacheJob) {
	select {
	case w.queue <- item:
	default:
	}
}

func (w *Worker) process(ctx context.Context, item cacheJob) {
	key := identityKey(item.platform, item.userID)

	w.mu.Lock()
	if _, inflight := w.inflight[key]; inflight {
		w.pending[key] = true
		w.mu.Unlock()
		return
	}
	w.inflight[key] = struct{}{}
	w.mu.Unlock()

	for {
		w.processCandidate(ctx, item)
		if !w.continuePendingOrFinish(item) {
			return
		}
	}
}

func (w *Worker) processCandidate(ctx context.Context, item cacheJob) {
	for {
		remoteURL, ok, err := w.store.AvatarFetchCandidate(item.platform, item.userID)
		if err != nil {
			clog.Warn(ctx, "avatar fetch candidate lookup failed",
				slog.String("platform", item.platform),
				slog.String("user_id", item.userID),
				slog.Any("error", err),
			)
			return
		}
		if !ok || remoteURL == "" {
			return
		}

		expectedURL := remoteURL
		host := fetchURLHost(expectedURL)
		data, err := Fetch(ctx, w.client, expectedURL)
		if err != nil {
			clog.Warn(ctx, "avatar fetch failed",
				slog.String("platform", item.platform),
				slog.String("user_id", item.userID),
				slog.String("host", host),
				slog.Any("error", err),
			)
			return
		}

		oldCache, err := w.store.PortraitCacheFilename(item.platform, item.userID)
		if err != nil {
			clog.Warn(ctx, "load avatar cache filename before write",
				slog.String("platform", item.platform),
				slog.String("user_id", item.userID),
				slog.Any("error", err),
			)
		}

		filename, err := overlayassets.Save(w.assetsDir, overlayassets.KindViewerAvatar, data)
		if err != nil {
			clog.Warn(ctx, "save avatar cache file failed",
				slog.String("platform", item.platform),
				slog.String("user_id", item.userID),
				slog.String("host", host),
				slog.Any("error", err),
			)
			return
		}

		committed, err := w.store.SetAvatarCacheIfRemoteURL(item.platform, item.userID, expectedURL, filename)
		if err != nil {
			clog.Warn(ctx, "record avatar cache filename failed",
				slog.String("platform", item.platform),
				slog.String("user_id", item.userID),
				slog.Any("error", err),
			)
			_ = overlayassets.Delete(w.assetsDir, filename)
			return
		}
		if !committed {
			_ = overlayassets.Delete(w.assetsDir, filename)
			continue
		}

		if oldCache != "" && oldCache != filename {
			if deleteErr := overlayassets.Delete(w.assetsDir, oldCache); deleteErr != nil {
				clog.Warn(ctx, "delete replaced avatar cache file failed",
					slog.String("platform", item.platform),
					slog.String("user_id", item.userID),
					slog.Any("error", deleteErr),
				)
			}
		}

		remoteURL, ok, err = w.store.AvatarFetchCandidate(item.platform, item.userID)
		if err != nil {
			clog.Warn(ctx, "avatar fetch candidate lookup failed",
				slog.String("platform", item.platform),
				slog.String("user_id", item.userID),
				slog.Any("error", err),
			)
			return
		}
		if ok && remoteURL != "" {
			continue
		}

		return
	}
}

func (w *Worker) continuePendingOrFinish(item cacheJob) bool {
	key := identityKey(item.platform, item.userID)

	w.mu.Lock()
	defer w.mu.Unlock()

	if w.pending[key] {
		delete(w.pending, key)
		return true
	}

	delete(w.inflight, key)
	return false
}

func identityKey(platform, userID string) string {
	return platform + "\x00" + userID
}

func fetchURLHost(rawURL string) string {
	parsed, ok := parseHTTPSURL(rawURL)
	if !ok || parsed == nil {
		return ""
	}
	return parsed.Hostname()
}
