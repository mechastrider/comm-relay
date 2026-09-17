package api

import (
	"encoding/json"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/recap"
)

const wireStreamRecapStateType = "stream_recap_state"

type wireStreamRecapState struct {
	Type     string              `json:"type"`
	Visible  bool                `json:"visible"`
	Window   *string             `json:"window"`
	Snapshot *recap.Snapshot     `json:"snapshot"`
	AllTime  *recap.Presentation `json:"all_time"`
}

func streamRecapStateWirePayload(state recap.State) ([]byte, error) {
	var window *string
	var snapshot *recap.Snapshot
	var allTime *recap.Presentation
	if state.Visible {
		window = state.Window
		snapshot = state.Snapshot
		allTime = state.AllTime
	}
	payload, err := json.Marshal(wireStreamRecapState{
		Type:     wireStreamRecapStateType,
		Visible:  state.Visible,
		Window:   window,
		Snapshot: snapshot,
		AllTime:  allTime,
	})
	if err != nil {
		return nil, errors.Errorf("marshal stream recap state: %w", err)
	}
	return payload, nil
}
