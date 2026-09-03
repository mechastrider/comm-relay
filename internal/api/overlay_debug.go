package api

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/bus"
)

const (
	debugResetType      = "debug_reset"
	debugPlatform       = "debug"
	debugCommandSound   = "chime"
	debugAwardSound     = "alert"
	rewardedMessageWait = 700 * time.Millisecond
	alertBurstWait      = 200 * time.Millisecond
	debugAlertDuration  = 5_000
	// alertBurstDuration keeps the three synthetic queue items well within the
	// production command TTL. It is deliberately shorter than ordinary alerts:
	// this scenario is a compact queue exercise, not a five-second-per-item demo.
	alertBurstDuration = 1_200
)

type overlayDebugScenario string

const (
	debugScenarioMessage           overlayDebugScenario = "message"
	debugScenarioRewardedMessage   overlayDebugScenario = "rewarded_message"
	debugScenarioCommandAlert      overlayDebugScenario = "command_alert"
	debugScenarioLeaderboardUpdate overlayDebugScenario = "leaderboard_update"
	debugScenarioAlertBurst        overlayDebugScenario = "alert_burst"
)

type overlayDebugRequest struct {
	Scenario    overlayDebugScenario `json:"scenario"`
	DisplayName string               `json:"display_name"`
	Message     string               `json:"message"`
	Label       string               `json:"label"`
	Points      *int                 `json:"points"`
}

type overlayDebugStartedResponse struct {
	Status           string `json:"status"`
	RunID            string `json:"run_id"`
	DeliveredClients int    `json:"delivered_clients"`
}

type overlayDebugResetResponse struct {
	Status           string `json:"status"`
	DeliveredClients int    `json:"delivered_clients"`
}

type overlayDebugStep struct {
	delay   time.Duration
	payload []byte
}

// overlayDebugRunner owns the process-global, in-memory test run.
type overlayDebugRunner struct {
	mu         sync.Mutex
	hub        *Hub
	generation uint64
	cancel     context.CancelFunc
	now        func() time.Time
	wait       func(context.Context, time.Duration) bool
}

func newOverlayDebugRunner(hub *Hub) *overlayDebugRunner {
	return &overlayDebugRunner{
		hub: hub,
		now: time.Now,
		wait: func(ctx context.Context, delay time.Duration) bool {
			timer := time.NewTimer(delay)
			defer timer.Stop()
			select {
			case <-ctx.Done():
				return false
			case <-timer.C:
				return true
			}
		},
	}
}

func (r *overlayDebugRunner) fire(request overlayDebugRequest) (overlayDebugStartedResponse, error) {
	immediate, delayed, err := r.scenarioFrames(request)
	if err != nil {
		return overlayDebugStartedResponse{}, err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if r.cancel != nil {
		r.cancel()
		r.cancel = nil
	}
	r.generation++
	generation := r.generation
	runID := uuid.NewString()

	reset, err := json.Marshal(struct {
		Type string `json:"type"`
	}{Type: debugResetType})
	if err != nil {
		return overlayDebugStartedResponse{}, errors.Errorf("marshal debug reset: %w", err)
	}
	accepted := r.hub.BroadcastDebugBatch(append([][]byte{reset}, immediate...)...)
	if accepted > 0 && len(delayed) > 0 {
		ctx, cancel := context.WithCancel(context.Background())
		r.cancel = cancel
		go r.runDelayed(ctx, generation, delayed)
	}

	return overlayDebugStartedResponse{
		Status:           "started",
		RunID:            runID,
		DeliveredClients: accepted,
	}, nil
}

func (r *overlayDebugRunner) reset() overlayDebugResetResponse {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.cancel != nil {
		r.cancel()
		r.cancel = nil
	}
	r.generation++
	reset, err := json.Marshal(struct {
		Type string `json:"type"`
	}{Type: debugResetType})
	if err != nil {
		return overlayDebugResetResponse{Status: "reset"}
	}

	return overlayDebugResetResponse{
		Status:           "reset",
		DeliveredClients: r.hub.BroadcastDebug(reset),
	}
}

func (r *overlayDebugRunner) runDelayed(ctx context.Context, generation uint64, steps []overlayDebugStep) {
	for _, step := range steps {
		if !r.wait(ctx, step.delay) {
			return
		}

		r.mu.Lock()
		if generation != r.generation {
			r.mu.Unlock()
			return
		}
		r.hub.BroadcastDebug(step.payload)
		r.mu.Unlock()
	}

	r.mu.Lock()
	if generation == r.generation {
		r.cancel = nil
	}
	r.mu.Unlock()
}

func (r *overlayDebugRunner) scenarioFrames(request overlayDebugRequest) ([][]byte, []overlayDebugStep, error) {
	name := request.DisplayName
	if name == "" {
		name = "Studio Tester"
	}
	message := request.Message
	if message == "" {
		message = "Test overlay message"
	}
	label := request.Label
	if label == "" {
		label = "Test alert"
	}
	points := 100
	if request.Points != nil {
		points = *request.Points
	}
	messageID := "debug-" + uuid.NewString()
	now := r.now().UTC()

	messageFrame, err := chatMessageWirePayload(bus.ChatMessage{
		ID:          messageID,
		Platform:    debugPlatform,
		Username:    name,
		DisplayName: name,
		Message:     message,
		Timestamp:   now,
	}, false)
	if err != nil {
		return nil, nil, errors.Errorf("marshal debug message: %w", err)
	}
	commandFrame, err := debugCommandAlertPayload(name, label, now, debugAlertDuration)
	if err != nil {
		return nil, nil, err
	}
	awardFrame, err := debugAwardAlertPayload(name, label, message, messageID, points, now, debugAlertDuration)
	if err != nil {
		return nil, nil, err
	}
	leaderboardFrame, err := debugLeaderboardPayload(name, points)
	if err != nil {
		return nil, nil, err
	}

	switch request.Scenario {
	case debugScenarioMessage:
		return [][]byte{messageFrame}, nil, nil
	case debugScenarioRewardedMessage:
		return [][]byte{messageFrame}, []overlayDebugStep{{delay: rewardedMessageWait, payload: awardFrame}}, nil
	case debugScenarioCommandAlert:
		return [][]byte{commandFrame}, nil, nil
	case debugScenarioLeaderboardUpdate:
		return [][]byte{leaderboardFrame}, nil, nil
	case debugScenarioAlertBurst:
		firstCommand, burstErr := debugCommandAlertPayload(name, label, now, alertBurstDuration)
		if burstErr != nil {
			return nil, nil, burstErr
		}
		secondAt := now.Add(alertBurstWait)
		award, burstErr := debugAwardAlertPayload(name, label, message, messageID, points, secondAt, alertBurstDuration)
		if burstErr != nil {
			return nil, nil, burstErr
		}
		thirdAt := secondAt.Add(alertBurstWait)
		lastCommand, burstErr := debugCommandAlertPayload(name, label, thirdAt, alertBurstDuration)
		if burstErr != nil {
			return nil, nil, burstErr
		}
		return [][]byte{firstCommand}, []overlayDebugStep{
			{delay: alertBurstWait, payload: award},
			{delay: alertBurstWait, payload: lastCommand},
		}, nil
	default:
		return nil, nil, errors.New("unsupported debug scenario")
	}
}

func debugCommandAlertPayload(name, label string, now time.Time, durationMs int) ([]byte, error) {
	payload, err := json.Marshal(wireAlert{
		Type:       wireAlertType,
		Name:       name,
		Text:       fmt.Sprintf("%s: %s", label, name),
		Points:     0,
		Sound:      debugCommandSound,
		DurationMs: durationMs,
		Source:     "command",
		CreatedAt:  now.Format(time.RFC3339Nano),
		Trigger:    label,
	})
	if err != nil {
		return nil, errors.Errorf("marshal debug command alert: %w", err)
	}
	return payload, nil
}

func debugAwardAlertPayload(name, label, message, messageID string, points int, now time.Time, durationMs int) ([]byte, error) {
	payload, err := json.Marshal(wireAlert{
		Type:            wireAlertType,
		Name:            name,
		Text:            fmt.Sprintf("%s: %s", label, name),
		Points:          points,
		Sound:           debugAwardSound,
		DurationMs:      durationMs,
		Source:          "award",
		CreatedAt:       now.Format(time.RFC3339Nano),
		AwardID:         "debug-award",
		AwardName:       label,
		MessagePlatform: debugPlatform,
		MessageID:       messageID,
		MessageText:     message,
	})
	if err != nil {
		return nil, errors.Errorf("marshal debug award alert: %w", err)
	}
	return payload, nil
}

func debugLeaderboardPayload(name string, points int) ([]byte, error) {
	payload, err := json.Marshal(wireLeaderboard{
		Type:   wireLeaderboardType,
		Period: "session",
		Entries: []wireLeaderboardEntry{
			{Rank: 1, DisplayName: name, Score: points, MessageCount: 12},
			{Rank: 2, DisplayName: "Overlay Pilot", Score: 75, MessageCount: 9},
			{Rank: 3, DisplayName: "Chat Explorer", Score: 50, MessageCount: 6},
		},
	})
	if err != nil {
		return nil, errors.Errorf("marshal debug leaderboard: %w", err)
	}
	return payload, nil
}
