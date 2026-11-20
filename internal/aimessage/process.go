package aimessage

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/overlayassets"
)

func (s *Service) stage(ctx context.Context, id, state string) (Job, config.AIMessages, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.syncLocked(ctx)
	j := s.jobs[id]
	c := s.cfg.Snapshot()
	if j == nil || terminal(j.State) || ctx.Err() != nil || s.paused != "" || !c.Features.ExperimentalAIMessages || j.ConfigRevision != s.revision || !s.now().Before(j.ExpiresAt) {
		return Job{}, c.AIMessages, false
	}
	if err := s.ValidateConfig(c); err != nil {
		j.State = "failed"
		j.ErrorCode = "configuration"
		if saveErr := s.saveLocked(ctx, j); saveErr != nil {
			clog.Errorf(ctx, "save invalid AI configuration: %w", saveErr)
		}
		return Job{}, c.AIMessages, false
	}
	j.State = state
	if err := s.saveLocked(ctx, j); err != nil {
		clog.Errorf(ctx, "save AI stage: %w", err)
		return Job{}, c.AIMessages, false
	}
	return cloneJob(j), c.AIMessages, true
}
func (s *Service) finish(ctx context.Context, id, state, code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	j := s.jobs[id]
	if j == nil || terminal(j.State) {
		return
	}
	j.State = state
	j.ErrorCode = code
	if err := s.saveLocked(context.WithoutCancel(ctx), j); err != nil {
		clog.Errorf(ctx, "finish AI job: %w", err)
	}
}
func (s *Service) fail(ctx context.Context, id string, err error) {
	code := "invalid_result"
	s.mu.Lock()
	if p, ok := errors.As[*ProviderError](err); ok {
		code = p.Code
		if p.Pause {
			s.paused = p.Code
		}
		if p.RetryAfter > 0 {
			s.backoff = s.now().Add(p.RetryAfter)
		}
	}
	s.mu.Unlock()
	if ctx.Err() != nil {
		code = "canceled_or_timeout"
	}
	s.finish(ctx, id, "failed", code)
}
func (s *Service) updateResult(ctx context.Context, id string, p Prepared, usage json.RawMessage, stage string, started time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	j := s.jobs[id]
	if j == nil || terminal(j.State) || ctx.Err() != nil {
		return false
	}
	j.Prepared = &p
	j.Decision = p.InputDecision
	j.Reason = p.Reason
	j.ReasonCode = p.ReasonCode
	if len(usage) > 0 {
		j.Usage = append(j.Usage, usage)
	}
	j.StageTimings[stage] = s.now().Sub(started).Milliseconds()
	if err := s.saveLocked(ctx, j); err != nil {
		clog.Errorf(ctx, "save AI result: %w", err)
		return false
	}
	return true
}
func (s *Service) process(ctx context.Context, id string) {
	job, c, ok := s.stage(ctx, id, "preparing")
	if !ok {
		return
	}
	if !job.Approved {
		started := s.now()
		p, usage, err := s.llm.Prepare(ctx, c, job.OriginalText)
		if err != nil {
			s.fail(ctx, id, err)
			return
		}
		if !s.updateResult(ctx, id, p, usage, "prepare", started) {
			return
		}
		if p.InputDecision == "reject" {
			s.finish(ctx, id, "rejected", "")
			return
		}
		if _, _, ok = s.stage(ctx, id, "verifying"); !ok {
			return
		}
		started = s.now()
		verdict, usage, err := s.llm.Verify(ctx, c, job.OriginalText, p)
		if err != nil {
			s.fail(ctx, id, err)
			return
		}
		if verdict.Decision == "reject" || verdict.Decision == "review" && p.InputDecision == "allow" {
			p.InputDecision = verdict.Decision
			p.ReasonCode = verdict.ReasonCode
			p.Reason = verdict.Reason
		}
		if !s.updateResult(ctx, id, p, usage, "verify", started) {
			return
		}
		if p.InputDecision == "reject" {
			s.finish(ctx, id, "rejected", "")
			return
		}
		if p.InputDecision == "review" {
			s.review(ctx, id, c)
			return
		}
	}
	job, c, ok = s.stage(ctx, id, "synthesizing")
	if !ok {
		return
	}
	if job.Prepared == nil {
		s.fail(ctx, id, ErrInvalid)
		return
	}
	for _, word := range c.Denylist {
		if strings.Contains(strings.ToLower(job.Prepared.DisplayText+" "+job.Prepared.SpokenText()), strings.ToLower(word)) {
			s.finish(ctx, id, "rejected", "denylist")
			return
		}
	}
	presentation, err := s.presentation(c, *job.Prepared)
	if err != nil {
		s.fail(ctx, id, err)
		return
	}
	if job.Approved && presentation != job.Presentation {
		s.finish(ctx, id, "canceled", "catalog_changed")
		return
	}
	started := s.now()
	audio, err := s.speech.Synthesize(ctx, c, *job.Prepared, presentation.VoiceID)
	if err != nil {
		s.fail(ctx, id, err)
		return
	}
	seconds, err := overlayassets.AudioDurationSeconds(audio)
	if err != nil || seconds <= 0 || seconds > float64(c.Limits.AudioMaxSeconds) {
		s.finish(ctx, id, "failed", "audio_duration")
		return
	}
	if ctx.Err() != nil {
		s.finish(ctx, id, "expired", "")
		return
	}
	filename, err := s.writeAudio(job.ID, audio)
	if err != nil {
		s.finish(ctx, id, "failed", "audio_storage")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.syncLocked(ctx)
	current := s.jobs[id]
	if current == nil || terminal(current.State) || ctx.Err() != nil || current.ConfigRevision != s.revision || !s.now().Before(current.ExpiresAt) {
		s.removeAudio(filename)
		return
	}
	check, err := s.presentation(c, *job.Prepared)
	if err != nil || check != presentation {
		s.removeAudio(filename)
		current.State = "canceled"
		current.ErrorCode = "catalog_changed"
		if saveErr := s.saveLocked(ctx, current); saveErr != nil {
			clog.Errorf(ctx, "cancel changed AI catalog: %w", saveErr)
		}
		return
	}
	current.Presentation = presentation
	current.AudioAsset = filename
	current.AudioDurationMS = int(seconds * 1000)
	current.StageTimings["synthesize"] = s.now().Sub(started).Milliseconds()
	current.State = "ready"
	if err = s.saveLocked(ctx, current); err != nil {
		s.removeAudio(filename)
		clog.Errorf(ctx, "save ready AI job: %w", err)
		return
	}
	current.State = "dispatched"
	if err = s.saveLocked(ctx, current); err != nil {
		clog.Errorf(ctx, "record AI dispatch: %w", err)
		return
	}
	s.emit(map[string]any{"type": "alert", "points": 0, "source": "ai_message", "job_id": id, "expires_at": current.ExpiresAt.UTC().Format(time.RFC3339Nano), "text": current.Prepared.DisplayText, "name": current.Name, "image_asset": presentation.ImageAsset, "sound_file": filename, "sound_volume": presentation.SoundVolume, "layout": presentation.Layout, "image_fit": presentation.ImageFit, "image_size_pct": presentation.ImageSizePct, "duration_ms": current.AudioDurationMS + 1000, "timestamp": s.now().UTC().Format(time.RFC3339Nano)})
}
func (s *Service) review(ctx context.Context, id string, c config.AIMessages) {
	s.mu.Lock()
	defer s.mu.Unlock()
	j := s.jobs[id]
	if j == nil || terminal(j.State) || ctx.Err() != nil {
		return
	}
	count := 0
	for _, other := range s.jobs {
		if other.State == "review_pending" {
			count++
		}
	}
	if count >= c.Limits.ReviewCapacity {
		j.State = "failed"
		j.ErrorCode = "review_full"
	} else {
		p, err := s.presentation(c, *j.Prepared)
		if err != nil {
			j.State = "failed"
			j.ErrorCode = "catalog_changed"
		} else {
			j.Presentation = p
			j.State = "review_pending"
			deadline := s.now().Add(time.Duration(c.Limits.ReviewTTLSeconds) * time.Second)
			j.ReviewExpiresAt = &deadline
		}
	}
	if err := s.saveLocked(ctx, j); err != nil {
		clog.Errorf(ctx, "save AI review: %w", err)
	}
}

// Action applies an operator decision to one exact job revision.
func (s *Service) Action(ctx context.Context, id string, revision int, action string) (Job, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.syncLocked(ctx)
	s.expireLocked(ctx)
	j := s.jobs[id]
	if j == nil {
		return Job{}, ErrNotFound
	}
	if j.Revision != revision || terminal(j.State) {
		return Job{}, ErrConflict
	}
	switch action {
	case "approve":
		if j.State != "review_pending" || j.Prepared == nil {
			return Job{}, ErrConflict
		}
		c := s.cfg.Snapshot()
		if !c.Features.ExperimentalAIMessages || s.paused != "" || s.now().Before(s.backoff) {
			return Job{}, ErrUnavailable
		}
		if len(s.queue) >= c.AIMessages.Limits.QueueCapacity {
			return Job{}, ErrConflict
		}
		if err := s.ValidateConfig(c); err != nil {
			return Job{}, err
		}
		p, err := s.presentation(c.AIMessages, *j.Prepared)
		if err != nil || p != j.Presentation {
			return Job{}, ErrConflict
		}
		j.Approved = true
		j.State = "queued"
		j.ExpiresAt = s.now().Add(time.Duration(c.AIMessages.Limits.LifetimeSeconds) * time.Second)
		j.ReviewExpiresAt = nil
		if err = s.saveLocked(ctx, j); err != nil {
			return Job{}, err
		}
		s.queue = append(s.queue, id)
	case "reject":
		if j.State != "review_pending" {
			return Job{}, ErrConflict
		}
		j.State = "rejected"
		j.Decision = "reject"
		if err := s.saveLocked(ctx, j); err != nil {
			return Job{}, err
		}
	case "cancel":
		j.State = "canceled"
		if id == s.active && s.cancel != nil {
			s.cancel()
		}
		if err := s.saveLocked(ctx, j); err != nil {
			return Job{}, err
		}
		s.emit(map[string]any{"type": "ai_message_cancel", "job_ids": []string{id}})
	default:
		return Job{}, ErrInvalid
	}
	return cloneJob(j), nil
}

// Resume clears a provider pause after local configuration checks.
func (s *Service) Resume(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.syncLocked(ctx)
	if s.paused == "storage_error" {
		return ErrUnavailable
	}
	if err := s.ValidateConfig(s.cfg.Snapshot()); err != nil {
		return err
	}
	s.paused = ""
	s.backoff = time.Time{}
	return nil
}

func (s *Service) writeAudio(id string, data []byte) (string, error) {
	if len(data) > 10<<20 {
		return "", ErrInvalid
	}
	if err := os.MkdirAll(s.dir, 0o700); err != nil {
		return "", errors.Errorf("create AI audio directory: %w", err)
	}
	name := "ai_" + id + ".mp3"
	f, err := os.CreateTemp(s.dir, ".ai-*.tmp")
	if err != nil {
		return "", errors.Errorf("create AI audio temporary: %w", err)
	}
	tmp := f.Name()
	defer func() {
		if removeErr := os.Remove(tmp); removeErr != nil && !os.IsNotExist(removeErr) {
			clog.Errorf(context.Background(), "remove AI temporary: %w", removeErr)
		}
	}()
	if _, err = f.Write(data); err != nil {
		if closeErr := f.Close(); closeErr != nil {
			clog.Errorf(context.Background(), "close failed AI audio: %w", closeErr)
		}
		return "", errors.Errorf("write AI audio: %w", err)
	}
	if err = f.Close(); err != nil {
		return "", errors.Errorf("close AI audio: %w", err)
	}
	if err = os.Rename(tmp, filepath.Join(s.dir, name)); err != nil {
		return "", errors.Errorf("publish AI audio: %w", err)
	}
	return name, nil
}
func (s *Service) removeAudio(name string) {
	if !strings.HasPrefix(name, "ai_") || !config.ValidOverlayAssetName(name) {
		return
	}
	if err := os.Remove(filepath.Join(s.dir, name)); err != nil && !os.IsNotExist(err) {
		clog.Errorf(context.Background(), "remove AI audio: %w", err)
	}
}

// Test is explicitly paid and never produces a production alert.
func (s *Service) Test(ctx context.Context, profile string) (map[string]any, error) {
	s.mu.Lock()
	if s.active != "" {
		s.mu.Unlock()
		return nil, ErrConflict
	}
	ctx, cancel := context.WithCancel(ctx)
	s.cancel = cancel
	s.active = "test"
	s.mu.Unlock()
	defer func() { cancel(); s.mu.Lock(); s.active = ""; s.cancel = nil; s.mu.Unlock() }()
	c := s.cfg.Snapshot().AIMessages
	started := s.now()
	switch profile {
	case "llm":
		p, usage, err := s.llm.Prepare(ctx, c, "Проверка связи.")
		if err != nil {
			s.fail(ctx, "", err)
			return nil, err
		}
		return map[string]any{"profile": profile, "decision": p.InputDecision, "usage": usage, "elapsed_ms": s.now().Sub(started).Milliseconds()}, nil
	case "tts":
		if len(c.Characters) == 0 {
			return nil, ErrInvalid
		}
		audio, err := s.speech.Synthesize(ctx, c, Prepared{Segments: []Segment{{Text: "Проверка связи.", Delivery: "neutral"}}}, c.Characters[0].VoiceID)
		if err != nil {
			s.fail(ctx, "", err)
			return nil, err
		}
		duration, err := overlayassets.AudioDurationSeconds(audio)
		if err != nil {
			return nil, err
		}
		return map[string]any{"profile": profile, "duration_seconds": duration, "elapsed_ms": s.now().Sub(started).Milliseconds()}, nil
	default:
		return nil, ErrInvalid
	}
}

// Referenced protects media used by pending jobs and recent playback.
func (s *Service) Referenced(name string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.HasPrefix(name, "ai_") && config.ValidOverlayAssetName(name) {
		if info, err := os.Stat(filepath.Join(s.dir, name)); err == nil && s.now().Sub(info.ModTime()) < 2*time.Minute {
			return true
		}
	}
	for _, j := range s.jobs {
		if !terminal(j.State) && (j.Presentation.ImageAsset == name || j.AudioAsset == name) {
			return true
		}
		if j.AudioAsset == name && s.now().Sub(j.UpdatedAt) < 2*time.Minute {
			return true
		}
	}
	return false
}
