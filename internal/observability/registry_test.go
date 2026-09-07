package observability_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/observability"
)

func TestRegistry_WhenBusDrop_ExpectSnapshotIncrements(t *testing.T) {
	t.Parallel()

	reg := observability.NewRegistry()
	reg.RecordBusDrop("websocket-hub", "ChatMessageReceived")
	reg.RecordBusDrop("websocket-hub", "ChatMessageReceived")

	snap := reg.Snapshot()
	require.Equal(t, uint64(2), snap.BusDrops["websocket-hub"])
}

func TestRegistry_WhenWebSocketDrop_ExpectSnapshotIncrements(t *testing.T) {
	t.Parallel()

	reg := observability.NewRegistry()
	reg.RecordWebSocketDrop("alert")
	reg.RecordWebSocketDrop("message")

	snap := reg.Snapshot()
	assert.Equal(t, uint64(1), snap.WebSocketDrops["alert"])
	assert.Equal(t, uint64(1), snap.WebSocketDrops["message"])
}

func TestRegistry_WhenCommandAndAward_ExpectTotals(t *testing.T) {
	t.Parallel()

	reg := observability.NewRegistry()
	reg.RecordCommandFired()
	reg.RecordCommandSuppressed("cooldown")
	reg.RecordCommandSuppressed("empty_identity")
	reg.RecordAwardGranted()

	snap := reg.Snapshot()
	require.Equal(t, uint64(1), snap.CommandsFired)
	require.Equal(t, uint64(1), snap.CommandsSuppressed["cooldown"])
	require.Equal(t, uint64(1), snap.CommandsSuppressed["empty_identity"])
	require.Equal(t, uint64(1), snap.AwardsGranted)
}

func TestRegistry_WhenNilReceiver_ExpectNoPanic(t *testing.T) {
	t.Parallel()

	var reg *observability.Registry
	reg.RecordBusDrop("x", "y")
	reg.RecordWebSocketDrop("alert")
	reg.RecordCommandSuppressed("cooldown")
	reg.RecordCommandFired()
	reg.RecordAwardGranted()

	snap := reg.Snapshot()
	assert.Empty(t, snap.BusDrops)
}
