// Package aimessage prepares moderated viewer messages without blocking chat ingestion.
package aimessage

import (
	"encoding/json"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

// Domain errors distinguish invalid input, stale actions and unavailable service.
var (
	// ErrInvalid indicates invalid input or provider output.
	ErrInvalid     = errors.New("invalid AI message")
	ErrConflict    = errors.New("AI message state conflict")
	ErrUnavailable = errors.New("AI messages unavailable")
	ErrNotFound    = errors.New("AI message not found")
)

// Segment separates spoken text from a semantic delivery direction.
type Segment struct {
	Text     string `json:"text"`
	Delivery string `json:"delivery"`
}

// Verdict is a three-way moderation result.
type Verdict struct {
	Decision   string `json:"decision"`
	ReasonCode string `json:"reason_code"`
	Reason     string `json:"reason"`
}

// Prepared is a validated candidate, not an executable model action.
type Prepared struct {
	DisplayText   string    `json:"display_text"`
	Segments      []Segment `json:"segments"`
	CharacterID   string    `json:"character_id"`
	ImageID       string    `json:"image_id"`
	InputDecision string    `json:"input_decision"`
	ReasonCode    string    `json:"reason_code"`
	Reason        string    `json:"reason"`
}

// SpokenText joins the spoken segments without provider tags.
func (p Prepared) SpokenText() string {
	var b strings.Builder
	for i, s := range p.Segments {
		if i > 0 {
			b.WriteByte(' ')
		}
		b.WriteString(s.Text)
	}
	return b.String()
}

// Presentation snapshots operator-owned media and voice bindings.
type Presentation struct {
	ImageAsset   string `json:"image_asset"`
	Layout       string `json:"layout"`
	ImageFit     string `json:"image_fit"`
	ImageSizePct int    `json:"image_size_pct"`
	SoundVolume  int    `json:"sound_volume"`
	CommandID    string `json:"command_id"`
	VoiceID      string `json:"voice_id"`
}

// Job is the versioned local audit representation of one request.
type Job struct {
	ID              string            `json:"id"`
	Revision        int               `json:"revision"`
	State           string            `json:"state"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	ExpiresAt       time.Time         `json:"expires_at"`
	ReviewExpiresAt *time.Time        `json:"review_expires_at,omitempty"`
	Platform        string            `json:"platform"`
	MessageID       string            `json:"message_id"`
	ViewerID        string            `json:"viewer_id"`
	Name            string            `json:"name"`
	OriginalText    string            `json:"original_text"`
	Prepared        *Prepared         `json:"prepared,omitempty"`
	Decision        string            `json:"decision,omitempty"`
	ReasonCode      string            `json:"reason_code,omitempty"`
	Reason          string            `json:"reason,omitempty"`
	ErrorCode       string            `json:"error_code,omitempty"`
	Presentation    Presentation      `json:"presentation"`
	AudioAsset      string            `json:"audio_asset,omitempty"`
	AudioDurationMS int               `json:"audio_duration_ms,omitempty"`
	Usage           []json.RawMessage `json:"usage"`
	StageTimings    map[string]int64  `json:"stage_timings"`
	ConfigRevision  string            `json:"config_revision"`
	Approved        bool              `json:"approved"`
}

func terminal(state string) bool {
	switch state {
	case "rejected", "expired", "canceled", "failed", "dispatched":
		return true
	}
	return false
}

// Parse recognizes only the exact !m token; payload is never interpreted as parameters.
func Parse(line string) (string, bool) {
	line = strings.TrimSpace(line)
	i := strings.IndexFunc(line, unicode.IsSpace)
	if i < 0 {
		return "", strings.EqualFold(line, "!m")
	}
	return strings.TrimSpace(line[i:]), strings.EqualFold(line[:i], "!m")
}
func validText(s string, limit int) bool {
	if strings.TrimSpace(s) == "" || !utf8.ValidString(s) || utf8.RuneCountInString(s) > limit {
		return false
	}
	for _, r := range s {
		if unicode.IsControl(r) || unicode.In(r, unicode.Cf) {
			return false
		}
	}
	return true
}
func validDecision(s string) bool { return s == "allow" || s == "reject" || s == "review" }
func validatePrepared(p Prepared, c config.AIMessages) error {
	if !validDecision(p.InputDecision) || len(p.Reason) > 2000 || len(p.ReasonCode) > 100 {
		return ErrInvalid
	}
	if p.InputDecision == "reject" {
		return nil
	}
	if !validText(p.DisplayText, 600) || len(p.Segments) == 0 || len(p.Segments) > 30 || !validText(p.SpokenText(), c.Limits.SpeechMaxChars) {
		return ErrInvalid
	}
	for _, s := range p.Segments {
		if !validText(s.Text, c.Limits.SpeechMaxChars) || !config.ValidAIDelivery(s.Delivery) || strings.ContainsAny(s.Text, "[]<>") {
			return ErrInvalid
		}
	}
	for _, ch := range c.Characters {
		if ch.ID == p.CharacterID {
			for _, im := range ch.Images {
				if im.ID == p.ImageID {
					return nil
				}
			}
		}
	}
	return ErrInvalid
}
