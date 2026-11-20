package aimessage

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/muonsoft/clog"
)

// ClearHistory removes terminal history while retaining deduplication protection.
func (s *Service) ClearHistory(ctx context.Context) int { return s.maintain(ctx, true) }
func (s *Service) maintain(ctx context.Context, clearHistory bool) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()
	deleted := 0
	if err := s.db.PruneAIDedupe(ctx, now); err != nil {
		s.paused = "storage_error"
		clog.Errorf(ctx, "prune AI tombstones: %w", err)
	}
	jobs := make([]*Job, 0, len(s.jobs))
	for _, j := range s.jobs {
		if terminal(j.State) {
			jobs = append(jobs, j)
		}
	}
	sort.Slice(jobs, func(i, j int) bool { return jobs[i].CreatedAt.After(jobs[j].CreatedAt) })
	keep := map[string]bool{}
	for index, j := range jobs {
		grace := now.Sub(j.UpdatedAt) < 2*time.Minute
		remove := clearHistory || index >= 1000 || now.Sub(j.CreatedAt) > 7*24*time.Hour
		if remove {
			if err := s.db.DeleteAIRecord(ctx, j.ID); err != nil {
				s.paused = "storage_error"
				clog.Errorf(ctx, "delete AI history: %w", err)
				continue
			}
			if !grace {
				s.removeAudio(j.AudioAsset)
			}
			delete(s.jobs, j.ID)
			deleted++
			continue
		}
		if j.AudioAsset != "" {
			if !grace && now.Sub(j.UpdatedAt) > 24*time.Hour {
				s.removeAudio(j.AudioAsset)
			} else {
				keep[j.AudioAsset] = true
			}
		}
	}
	for _, j := range s.jobs {
		if !terminal(j.State) && j.AudioAsset != "" {
			keep[j.AudioAsset] = true
		}
	}
	entries, err := os.ReadDir(s.dir)
	if err != nil && !os.IsNotExist(err) {
		clog.Errorf(ctx, "list AI media: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasPrefix(name, "ai_") && !strings.HasPrefix(name, ".ai-") {
			continue
		}
		info, infoErr := entry.Info()
		if infoErr != nil {
			clog.Errorf(ctx, "stat AI media: %w", infoErr)
			continue
		}
		if keep[name] || now.Sub(info.ModTime()) < 2*time.Minute {
			continue
		}
		if strings.HasPrefix(name, ".ai-") {
			if err = os.Remove(filepath.Join(s.dir, name)); err != nil && !os.IsNotExist(err) {
				clog.Errorf(ctx, "remove orphan AI temporary: %w", err)
			}
		} else {
			s.removeAudio(name)
		}
	}
	return deleted
}

// trimHistoryLocked bounds completed audit records even during rapid local rejections.
// Young audio remains on disk for the playback grace period and is later collected.
func (s *Service) trimHistoryLocked(ctx context.Context) {
	var completed []*Job
	for _, j := range s.jobs {
		if terminal(j.State) {
			completed = append(completed, j)
		}
	}
	if len(completed) <= 1000 {
		return
	}
	sort.Slice(completed, func(i, j int) bool { return completed[i].CreatedAt.Before(completed[j].CreatedAt) })
	for _, j := range completed[:len(completed)-1000] {
		if err := s.db.DeleteAIRecord(ctx, j.ID); err != nil {
			s.paused = "storage_error"
			clog.Errorf(ctx, "bound AI history: %w", err)
			return
		}
		if s.now().Sub(j.UpdatedAt) >= 2*time.Minute {
			s.removeAudio(j.AudioAsset)
		}
		delete(s.jobs, j.ID)
	}
}
