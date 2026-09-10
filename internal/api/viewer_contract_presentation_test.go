package api

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestViewerContractPresentation_WhenActivatedUpdatedAndCleared_ExpectBoundedRuntimeState(t *testing.T) {
	t.Parallel()
	presentation, err := newViewerContractPresentation(nil)
	require.NoError(t, err)
	contract := &store.ViewerContract{
		ID: "contract-1", Title: "Find loot", Objective: "Mark it",
		RewardID: "joke", RewardName: "Joke", RewardPoints: 10, AnnouncedAt: time.Now(),
	}

	activated := presentation.Activate(contract)
	require.Equal(t, contractContentContract, activated.Content)
	require.True(t, activated.Visible)

	updated, ok := presentation.Update(contract.ID, contractContentLeaderboard, false)
	require.True(t, ok)
	require.Equal(t, contractContentLeaderboard, updated.Content)
	require.False(t, updated.Visible)

	_, ok = presentation.Update("stale", contractContentContract, true)
	require.False(t, ok)
	require.Equal(t, contractContentLeaderboard, presentation.Current().Content)

	cleared := presentation.Clear(contract.ID)
	require.Nil(t, cleared.Contract)
	require.False(t, cleared.Visible)
}

func TestViewerContractStateWirePayload_WhenActive_ExpectPublicSnakeCaseSnapshot(t *testing.T) {
	t.Parallel()
	snapshot := viewerContractPresentationSnapshot{
		Type: wireViewerContractStateType,
		Contract: &viewerContractResponse{
			ID: "contract-1", Title: "Find <loot>", Objective: "Mark & defend",
			RewardID: "joke", RewardName: "Joke", RewardPoints: 10,
			AnnouncedAt: "2026-09-09T10:00:00Z",
		},
		Content: contractContentContract,
		Visible: true,
	}

	payload, err := viewerContractStateWirePayload(snapshot)
	require.NoError(t, err)
	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))
	require.Equal(t, wireViewerContractStateType, decoded["type"])
	require.Equal(t, contractContentContract, decoded["content"])
	require.Equal(t, true, decoded["visible"])
	require.Equal(t, "Find <loot>", decoded["contract"].(map[string]any)["title"])
}
