package aimessage

import (
	"context"
	"encoding/json"

	"github.com/mechastrider/comm-relay/internal/config"
)

// LanguageModel prepares a candidate and returns an independent final verdict.
// Implementations must not retry paid work or execute instructions from viewer data.
type LanguageModel interface {
	Prepare(context.Context, config.AIMessages, string) (Prepared, json.RawMessage, error)
	Verify(context.Context, config.AIMessages, string, Prepared) (Verdict, json.RawMessage, error)
}

// SpeechEngine renders validated semantic segments using an operator-owned voice.
type SpeechEngine interface {
	Synthesize(context.Context, config.AIMessages, Prepared, string) ([]byte, error)
}

var _ LanguageModel = (*Provider)(nil)
var _ SpeechEngine = (*Provider)(nil)

// Adapters optionally replaces either provider contract at bootstrap.
type Adapters struct {
	LLM LanguageModel
	TTS SpeechEngine
}
