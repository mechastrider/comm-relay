package aimessage

import (
	"context"
	"log/slog"
	"time"

	"github.com/muonsoft/clog"
)

// Failure describes a technical failure without recording viewer or upstream content.
type Failure struct {
	Stage       string `json:"stage"`
	Queue       string `json:"queue"`
	WaitSeconds int    `json:"wait_seconds,omitempty"`
	Field       string `json:"field,omitempty"`
	Rule        string `json:"rule,omitempty"`
}

func transientFailure(code string) bool {
	switch code {
	case "network_or_timeout", "network_error", "provider_timeout", "read_response", "rate_limited", "http_408", "http_500", "http_502", "http_503", "http_504", "invalid_json", "schema_mismatch", "invalid_envelope", "output_truncated", "incomplete_response":
		return true
	}
	return false
}

func (s *Service) canRetry(j *Job) bool {
	return j.State == "failed" && j.ConfigRevision == s.revision && transientFailure(j.ErrorCode)
}

func (s *Service) markFailedLocked(ctx context.Context, j *Job, code string, p *ProviderError) {
	d := &Failure{Stage: j.State, Queue: "running"}
	if s.paused != "" {
		d.Queue = "paused"
	} else if wait := s.backoff.Sub(s.now()); wait > 0 {
		d.Queue = "waiting"
		d.WaitSeconds = int((wait + time.Second - 1) / time.Second)
	}
	c := s.cfg.Snapshot().AIMessages
	provider := c.LLM
	if j.State == "synthesizing" {
		provider = c.TTS
	}
	elapsed := s.now().Sub(j.UpdatedAt).Milliseconds()
	attrs := []slog.Attr{
		slog.String("job_id", j.ID), slog.String("stage", d.Stage),
		slog.String("provider", provider.Preset), slog.String("model", provider.Model),
		slog.Int64("elapsed_ms", elapsed), slog.String("cause", code), slog.String("queue", d.Queue),
	}
	if d.WaitSeconds > 0 {
		attrs = append(attrs, slog.Int("wait_seconds", d.WaitSeconds))
	}
	if p != nil {
		d.Field, d.Rule = p.Field, p.Rule
		if p.FinishReason != "" {
			attrs = append(attrs, slog.String("finish_reason", p.FinishReason))
		}
		if p.Status != 0 {
			attrs = append(attrs, slog.Int("http_status", p.Status))
		}
		if p.RequestID != "" {
			attrs = append(attrs, slog.String("request_id", p.RequestID))
		}
		if d.Rule != "" {
			attrs = append(attrs, slog.String("field", d.Field), slog.String("rule", d.Rule))
		}
	}
	clog.LogAttrs(ctx, slog.LevelWarn, "AI message failed", attrs...)
	j.State, j.ErrorCode, j.Failure = "failed", code, d
}
