package api

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/observability"
	"github.com/mechastrider/comm-relay/internal/recap"
)

func TestHub_BroadcastStreamRecapState_WhenClientBufferFull_ExpectDropCounter(t *testing.T) {
	t.Parallel()

	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	controller := recap.NewController(func(state recap.State) {
		hub.BroadcastStreamRecapState(state)
	})
	hub.SetStreamRecapController(controller)

	slow := &wsClient{hub: hub, send: make(chan []byte, 1), ctx: context.Background()}
	slow.send <- []byte("filled")
	hub.mu.Lock()
	hub.clients[slow] = struct{}{}
	hub.mu.Unlock()

	before := observability.Default.Snapshot().WebSocketDrops[wireStreamRecapStateType]
	controller.Show(&recap.Snapshot{
		Version:           recap.Version,
		ID:                "recap-id",
		SessionID:         "session-id",
		StartedAt:         "2026-09-12T12:00:00.000000000Z",
		CapturedAt:        "2026-09-12T12:00:00.000000000Z",
		Totals:            recap.Totals{},
		Ranking:           []recap.RankingEntry{},
		AchievementGroups: []recap.AchievementGroup{},
	})

	after := observability.Default.Snapshot().WebSocketDrops[wireStreamRecapStateType]
	require.GreaterOrEqual(t, after, before+1)
}
