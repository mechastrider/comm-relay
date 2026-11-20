package aimessage

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/observability"
	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/store"
)

// Service owns serialized state transitions; provider work never holds its mutex.
type Service struct {
	mu            sync.Mutex
	cfg           *config.Store
	db            *store.Store
	provider      *Provider
	llm           LanguageModel
	speech        SpeechEngine
	broadcast     func([]byte)
	dir           string
	jobs          map[string]*Job
	queue         []string
	cooldowns     map[string]time.Time
	lastAdmission time.Time
	revision      string
	active        string
	cancel        context.CancelFunc
	paused        string
	backoff       time.Time
	now           func() time.Time
	workers       sync.WaitGroup
}

// New restores the audit and cancels interrupted jobs without replay.
func New(cfg *config.Store, db *store.Store, broadcast func([]byte), adapters ...Adapters) (*Service, error) {
	s := &Service{cfg: cfg, db: db, provider: NewProvider(), broadcast: broadcast, dir: overlayassets.DirForConfig(cfg.Path()), jobs: map[string]*Job{}, cooldowns: map[string]time.Time{}, now: time.Now}
	s.llm, s.speech = s.provider, s.provider
	if len(adapters) > 0 {
		if adapters[0].LLM != nil {
			s.llm = adapters[0].LLM
		}
		if adapters[0].TTS != nil {
			s.speech = adapters[0].TTS
		}
	}
	records, err := db.AIRecords(context.Background())
	if err != nil {
		s.paused = "storage_error"
		clog.Errorf(context.Background(), "load AI audit: %w", err)
	}
	for _, record := range records {
		var job Job
		if err = json.Unmarshal(record.Payload, &job); err != nil {
			s.paused = "storage_error"
			clog.Errorf(context.Background(), "decode stored AI job: %w", err)
			continue
		}
		s.jobs[job.ID] = &job
		if !terminal(job.State) {
			job.State = "canceled"
			job.ErrorCode = "restart"
			if err = s.saveLocked(context.Background(), &job); err != nil {
				clog.Errorf(context.Background(), "cancel interrupted AI job: %w", err)
			}
		}
	}
	s.revision = configRevision(cfg.Snapshot())
	if s.paused == "" {
		if err := s.ValidateConfig(cfg.Snapshot()); err != nil {
			s.paused = "configuration"
			clog.Warn(context.Background(), "AI messages paused: check provider credentials and catalog configuration")
		}
	}
	return s, nil
}
func configRevision(c config.Config) string {
	data, _ := json.Marshal(struct {
		Enabled  bool
		Settings config.AIMessages
	}{c.Features.ExperimentalAIMessages, c.AIMessages})
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}
func cloneJob(j *Job) Job {
	data, _ := json.Marshal(j)
	var out Job
	if err := json.Unmarshal(data, &out); err != nil {
		return Job{ID: j.ID, State: "failed", ErrorCode: "invalid_record"}
	}
	return out
}
func record(j *Job) (store.AIRecord, error) {
	data, err := json.Marshal(j)
	if err != nil {
		return store.AIRecord{}, errors.Errorf("encode AI job: %w", err)
	}
	return store.AIRecord{ID: j.ID, Revision: j.Revision, State: j.State, CreatedAt: j.CreatedAt, UpdatedAt: j.UpdatedAt, Payload: data}, nil
}
func (s *Service) saveLocked(ctx context.Context, j *Job) error {
	previous := j.Revision
	j.Revision++
	j.UpdatedAt = s.now()
	r, err := record(j)
	if err == nil {
		err = s.db.UpdateAIRecord(ctx, r, previous)
	}
	if err != nil {
		j.Revision = previous
		j.State = "failed"
		j.ErrorCode = "storage_error"
		s.paused = "storage_error"
		return errors.Errorf("persist AI job: %w", err)
	}
	s.trimHistoryLocked(ctx)
	s.emitStatus(j)
	observability.Default.RecordAIMessage(j.State)
	clog.Debug(ctx, "AI message transitioned", slog.String("job_id", j.ID), slog.String("state", j.State), slog.String("error_code", j.ErrorCode))
	return nil
}

// ValidateConfig performs runtime checks without contacting any paid provider.
func (s *Service) ValidateConfig(c config.Config) error {
	if !c.Features.ExperimentalAIMessages {
		return nil
	}
	if err := c.Validate(); err != nil {
		return err
	}
	for _, p := range []config.AIProvider{c.AIMessages.LLM, c.AIMessages.TTS} {
		if os.Getenv(p.APIKeyEnv) == "" {
			return errors.Errorf("%w: missing credential environment variable %s", ErrInvalid, p.APIKeyEnv)
		}
	}
	commands, err := s.db.ListCommands()
	if err != nil {
		return err
	}
	for _, cmd := range commands {
		if cmd.Trigger == "m" {
			return errors.Errorf("%w: catalog trigger m is reserved while enabled", ErrInvalid)
		}
		for _, a := range cmd.Aliases {
			if a == "m" {
				return errors.Errorf("%w: catalog alias m is reserved while enabled", ErrInvalid)
			}
		}
	}
	for _, ch := range c.AIMessages.Characters {
		for _, im := range ch.Images {
			if _, err = s.resolve(ch, im); err != nil {
				return err
			}
		}
	}
	return nil
}
func (s *Service) resolve(ch config.AICharacter, im config.AIImage) (Presentation, error) {
	cmd, err := s.db.GetCommand(im.CommandID)
	if err != nil {
		return Presentation{}, errors.Errorf("%w: image command missing", ErrInvalid)
	}
	if !cmd.Enabled || cmd.Action != store.CommandActionAlert || !overlayassets.FileExists(s.dir, cmd.ImageAsset) {
		return Presentation{}, errors.Errorf("%w: select an enabled alert command with an existing image", ErrInvalid)
	}
	return Presentation{CommandID: cmd.ID, ImageAsset: cmd.ImageAsset, Layout: cmd.Layout, ImageFit: cmd.ImageFit, ImageSizePct: cmd.ImageSizePct, SoundVolume: cmd.SoundVolume, VoiceID: ch.VoiceID}, nil
}
func (s *Service) presentation(c config.AIMessages, p Prepared) (Presentation, error) {
	for _, ch := range c.Characters {
		if ch.ID == p.CharacterID {
			for _, im := range ch.Images {
				if im.ID == p.ImageID {
					return s.resolve(ch, im)
				}
			}
		}
	}
	return Presentation{}, ErrInvalid
}

// Admit runs local checks and reserves capacity before any provider call.
func (s *Service) Admit(ctx context.Context, platform, messageID, viewerID, name, text string) (Job, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.syncLocked(ctx)
	c := s.cfg.Snapshot()
	now := s.now()
	if !c.Features.ExperimentalAIMessages || s.paused != "" || now.Before(s.backoff) {
		return Job{}, ErrUnavailable
	}
	if viewerID == "" || !validText(text, c.AIMessages.Limits.InputMaxChars) {
		observability.Default.RecordAIMessage("invalid")
		return Job{}, ErrInvalid
	}
	if now.Before(s.cooldowns[viewerID]) || (!s.lastAdmission.IsZero() && now.Sub(s.lastAdmission) < time.Duration(c.AIMessages.Limits.GlobalIntervalSeconds)*time.Second) {
		observability.Default.RecordAIMessage("rate_limited")
		return Job{}, errors.Errorf("%w: cooldown", ErrConflict)
	}
	if len(s.queue) >= c.AIMessages.Limits.QueueCapacity {
		observability.Default.RecordAIMessage("queue_full")
		return Job{}, errors.Errorf("%w: queue full", ErrConflict)
	}
	sourceKey := platform + ":" + messageID
	if messageID == "" {
		sourceKey = "ephemeral:" + uuid.NewString()
	}
	job := &Job{ID: uuid.NewString(), Revision: 1, State: "queued", CreatedAt: now, UpdatedAt: now, ExpiresAt: now.Add(time.Duration(c.AIMessages.Limits.LifetimeSeconds) * time.Second), Platform: platform, MessageID: messageID, ViewerID: viewerID, Name: name, OriginalText: text, ConfigRevision: s.revision, StageTimings: map[string]int64{}, Usage: []json.RawMessage{}}
	for _, word := range c.AIMessages.Denylist {
		if strings.Contains(strings.ToLower(text), strings.ToLower(word)) {
			job.State = "rejected"
			job.Decision = "reject"
			job.ReasonCode = "denylist"
			job.Reason = "Matched the operator denylist."
			break
		}
	}
	r, err := record(job)
	if err != nil {
		return Job{}, err
	}
	if err = s.db.CreateAIRecord(ctx, r, sourceKey); err != nil {
		if errors.Is(err, store.ErrAIConflict) {
			return Job{}, ErrConflict
		}
		s.paused = "storage_error"
		return Job{}, err
	}
	s.jobs[job.ID] = job
	s.trimHistoryLocked(ctx)
	s.emitStatus(job)
	if job.State == "queued" {
		s.queue = append(s.queue, job.ID)
	}
	s.cooldowns[viewerID] = now.Add(time.Duration(c.AIMessages.Limits.ViewerCooldownSeconds) * time.Second)
	s.lastAdmission = now
	observability.Default.RecordAIMessage("accepted")
	if job.State == "rejected" {
		observability.Default.RecordAIMessage("rejected")
	}
	return cloneJob(job), nil
}

func (s *Service) syncLocked(ctx context.Context) {
	revision := configRevision(s.cfg.Snapshot())
	if revision == s.revision {
		return
	}
	s.cancelLocked(ctx, "settings_changed")
	s.revision = revision
	s.backoff = time.Time{}
}
func (s *Service) cancelLocked(ctx context.Context, reason string) {
	if s.cancel != nil {
		s.cancel()
	}
	s.queue = nil
	for _, job := range s.jobs {
		if !terminal(job.State) {
			job.State = "canceled"
			job.ErrorCode = reason
			if err := s.saveLocked(ctx, job); err != nil {
				clog.Errorf(ctx, "cancel AI job: %w", err)
			}
		}
	}
	s.emit(map[string]any{"type": "ai_message_cancel", "all": true})
}

// CancelAll invalidates pending work and stops AI playback only.
func (s *Service) CancelAll(ctx context.Context, reason string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cancelLocked(ctx, reason)
}

// Sync applies config revision changes and invalidates stale jobs.
func (s *Service) Sync(ctx context.Context) { s.mu.Lock(); defer s.mu.Unlock(); s.syncLocked(ctx) }
func (s *Service) emit(body any) {
	data, err := json.Marshal(body)
	if err != nil {
		clog.Errorf(context.Background(), "encode AI frame: %w", err)
		return
	}
	if s.broadcast != nil {
		s.broadcast(data)
	}
}

// Run schedules one worker while keeping maintenance and cancellation responsive.
func (s *Service) Run(ctx context.Context) error {
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()
	maintenance := time.NewTicker(time.Minute)
	defer maintenance.Stop()
	defer s.workers.Wait()
	for {
		select {
		case <-ctx.Done():
			s.CancelAll(context.Background(), "shutdown")
			return nil
		case <-maintenance.C:
			s.maintain(ctx, false)
		case <-ticker.C:
			s.mu.Lock()
			s.syncLocked(ctx)
			s.expireLocked(ctx)
			if s.active == "" && s.paused == "" && !s.now().Before(s.backoff) && len(s.queue) > 0 {
				id := s.queue[0]
				s.queue = s.queue[1:]
				job := s.jobs[id]
				if job != nil && !terminal(job.State) {
					workCtx, cancel := context.WithDeadline(ctx, job.ExpiresAt)
					s.active = id
					s.cancel = cancel
					s.workers.Add(1)
					go func() {
						defer s.workers.Done()
						defer cancel()
						s.process(workCtx, id)
						s.mu.Lock()
						s.active = ""
						s.cancel = nil
						s.mu.Unlock()
					}()
				}
			}
			s.mu.Unlock()
		}
	}
}
func (s *Service) expireLocked(ctx context.Context) {
	now := s.now()
	for _, j := range s.jobs {
		if terminal(j.State) {
			continue
		}
		deadline := j.ExpiresAt
		if j.State == "review_pending" && j.ReviewExpiresAt != nil {
			deadline = *j.ReviewExpiresAt
		}
		if !now.Before(deadline) {
			j.State = "expired"
			if s.active == j.ID && s.cancel != nil {
				s.cancel()
			}
			if err := s.saveLocked(ctx, j); err != nil {
				clog.Errorf(ctx, "expire AI job: %w", err)
			}
		}
	}
	q := s.queue[:0]
	for _, id := range s.queue {
		if j := s.jobs[id]; j != nil && !terminal(j.State) {
			q = append(q, id)
		}
	}
	s.queue = q
	for k, expiry := range s.cooldowns {
		if !now.Before(expiry) {
			delete(s.cooldowns, k)
		}
	}
}

// Page is a bounded operator-only history response.
type Page struct {
	Items        []Job           `json:"items"`
	NextCursor   string          `json:"next_cursor,omitempty"`
	ServiceState string          `json:"service_state"`
	Credentials  map[string]bool `json:"credentials"`
}

// List returns recent audit entries without exposing credentials.
func (s *Service) List(ctx context.Context, state, before string, limit int) Page {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.syncLocked(ctx)
	s.expireLocked(ctx)
	c := s.cfg.Snapshot()
	page := Page{Items: []Job{}, ServiceState: "ready", Credentials: map[string]bool{"llm": os.Getenv(c.AIMessages.LLM.APIKeyEnv) != "", "tts": os.Getenv(c.AIMessages.TTS.APIKeyEnv) != ""}}
	if !c.Features.ExperimentalAIMessages {
		page.ServiceState = "disabled"
	} else if s.paused != "" {
		page.ServiceState = s.paused
	} else if s.now().Before(s.backoff) {
		page.ServiceState = "rate_limited"
	}
	jobs := make([]*Job, 0, len(s.jobs))
	for _, j := range s.jobs {
		if state == "" || j.State == state {
			jobs = append(jobs, j)
		}
	}
	sort.Slice(jobs, func(i, j int) bool {
		if jobs[i].CreatedAt.Equal(jobs[j].CreatedAt) {
			return jobs[i].ID > jobs[j].ID
		}
		return jobs[i].CreatedAt.After(jobs[j].CreatedAt)
	})
	started := before == ""
	for _, j := range jobs {
		if !started {
			if j.ID == before {
				started = true
			}
			continue
		}
		if len(page.Items) == limit {
			page.NextCursor = page.Items[len(page.Items)-1].ID
			break
		}
		page.Items = append(page.Items, cloneJob(j))
	}
	return page
}

func (s *Service) emitStatus(j *Job) {
	frame := map[string]any{"type": "ai_message_status", "message_platform": j.Platform, "message_id": j.MessageID, "state": j.State}
	if j.State == "dispatched" && j.Prepared != nil {
		frame["display_text"] = j.Prepared.DisplayText
		frame["name"] = j.Name
	}
	s.emit(frame)
}

// MessageState returns only the safe status used by operator chat rows.
func (s *Service) MessageState(platform, id string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, j := range s.jobs {
		if j.Platform == platform && j.MessageID == id {
			return j.State
		}
	}
	return "not_accepted"
}

// ReportAdmission reports a safe row state even when admission was declined.
func (s *Service) ReportAdmission(platform, id string) {
	s.emit(map[string]any{"type": "ai_message_status", "message_platform": platform, "message_id": id, "state": s.MessageState(platform, id)})
}

// PublishedText returns only approved display content for chat history rendering.
func (s *Service) PublishedText(platform, id string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, j := range s.jobs {
		if j.Platform == platform && j.MessageID == id && j.State == "dispatched" && j.Prepared != nil {
			return j.Prepared.DisplayText
		}
	}
	return ""
}
