package api

import "net/http"

type healthResponse struct {
	Status     string `json:"status"`
	InstanceID string `json:"instance_id"`
}

func handleHealth(instanceID string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, healthResponse{
			Status:     "ok",
			InstanceID: instanceID,
		})
	}
}
