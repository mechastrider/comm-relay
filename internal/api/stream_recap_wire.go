package api

import (
	"encoding/json"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/recap"
)

const wireStreamRecapStateType = "stream_recap_state"

type wireStreamRecapState struct {
	Type     string          `json:"type"`
	Visible  bool            `json:"visible"`
	Snapshot *recap.Snapshot `json:"snapshot"`
}

func streamRecapStateWirePayload(state recap.State) ([]byte, error) {
	var snapshot *recap.Snapshot
	if state.Visible {
		snapshot = state.Snapshot
	}
	payload, err := json.Marshal(wireStreamRecapState{
		Type:     wireStreamRecapStateType,
		Visible:  state.Visible,
		Snapshot: snapshot,
	})
	if err != nil {
		return nil, errors.Errorf("marshal stream recap state: %w", err)
	}
	return payload, nil
}
