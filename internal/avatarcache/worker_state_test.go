package avatarcache

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestWorker_PushJob_WhenQueueIsFull_ExpectNoOrphanedPendingEntry(t *testing.T) {
	worker := &Worker{
		queue:    make(chan cacheJob, 1),
		inflight: make(map[string]struct{}),
		pending:  make(map[string]bool),
	}
	queued := cacheJob{platform: "youtube", userID: "queued"}
	dropped := cacheJob{platform: "youtube", userID: "dropped"}

	worker.pushJob(queued)
	worker.pushJob(dropped)

	require.Len(t, worker.queue, 1)
	assert.Empty(t, worker.pending)
}

func TestWorker_Enqueue_WhenURLRotatesAfterCommitWhileInflight_ExpectOwnerContinues(t *testing.T) {
	dir := t.TempDir()
	viewerStore, err := store.Open(filepath.Join(dir, "comm-relay.db"), store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, viewerStore.Close())
	})

	item := cacheJob{platform: "youtube", userID: "UC-after-commit"}
	key := identityKey(item.platform, item.userID)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	urlA := "https://yt3.ggpht.com/avatars/a.png"
	urlB := "https://yt3.ggpht.com/avatars/b.png"
	require.NoError(t, viewerStore.ApplyChat(store.ChatIdentity{
		Platform:  item.platform,
		UserID:    item.userID,
		AvatarURL: urlA,
	}, store.ActivitySettings{}, 6, now))
	committed, err := viewerStore.SetAvatarCacheIfRemoteURL(item.platform, item.userID, urlA, "cached-a.png")
	require.NoError(t, err)
	require.True(t, committed)

	worker := NewWorker(viewerStore, filepath.Join(dir, "overlay-assets"))
	worker.inflight[key] = struct{}{}
	_, err = viewerStore.ApplyChatResult(store.ChatIdentity{
		Platform:  item.platform,
		UserID:    item.userID,
		AvatarURL: urlB,
	}, store.ActivitySettings{}, 6, now.Add(time.Minute))
	require.NoError(t, err)

	worker.Enqueue(item.platform, item.userID)

	require.True(t, worker.continuePendingOrFinish(item))
	assert.Contains(t, worker.inflight, key)
	assert.NotContains(t, worker.pending, key)

	require.False(t, worker.continuePendingOrFinish(item))
	assert.NotContains(t, worker.inflight, key)
}
