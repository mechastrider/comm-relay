package api

import "encoding/json"

func wireFrameType(payload []byte) string {
	var probe struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(payload, &probe); err != nil || probe.Type == "" {
		return "other"
	}
	return probe.Type
}
