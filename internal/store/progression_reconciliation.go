package store

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

const defaultProgressionReconciliationBatchSize = 100

// RequestProgressionReconciliation schedules a full, silent pass. A new
// generation discards only the cursor; immutable unlock uniqueness makes a
// replay safe.
func (s *Store) RequestProgressionReconciliation(now time.Time) (*ProgressionReconciliationStatus, error) {
	if now.IsZero() {
		now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, errors.Errorf("begin progression reconciliation request: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := requestProgressionReconciliationLocked(tx, now); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit progression reconciliation request: %w", err)
	}
	return s.getProgressionReconciliationStatusLocked()
}

func requestProgressionReconciliationLocked(tx *sql.Tx, now time.Time) error {
	result, err := tx.Exec(`UPDATE progression_reconciliation
		SET requested_generation = requested_generation + 1,
			status = 'pending', last_viewer_id = NULL, updated_at = ?
		WHERE id = 1`, formatTime(now))
	if err != nil {
		return errors.Errorf("request progression reconciliation: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return errors.Errorf("count progression reconciliation request: %w", err)
	}
	if affected == 0 {
		return errors.New("progression reconciliation state is missing")
	}
	return nil
}

// ReconcileProgression silently evaluates every visible viewer in stable,
// bounded batches. It stores the checkpoint with each committed batch and
// returns nil on cancellation so a runnable can shut down cleanly.
func (s *Store) ReconcileProgression(ctx context.Context, batchSize int) error {
	if batchSize <= 0 {
		batchSize = defaultProgressionReconciliationBatchSize
	}
	for {
		if ctx.Err() != nil {
			s.pauseProgressionReconciliation()
			return nil
		}
		done, err := s.reconcileProgressionBatch(ctx, batchSize, time.Now())
		if err != nil {
			return err
		}
		if done {
			return nil
		}
	}
}

func (s *Store) reconcileProgressionBatch(ctx context.Context, batchSize int, now time.Time) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return false, errors.Errorf("begin progression reconciliation batch: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	status, err := scanProgressionReconciliationStatus(tx.QueryRow(`SELECT bootstrap_state, requested_generation, completed_generation, status, last_viewer_id, created_at, updated_at FROM progression_reconciliation WHERE id = 1`))
	if errors.Is(err, sql.ErrNoRows) {
		return true, nil
	}
	if err != nil {
		return false, errors.Errorf("load progression reconciliation status: %w", err)
	}
	if status.CompletedGeneration >= status.RequestedGeneration {
		if status.Status != "idle" {
			if _, settleErr := tx.Exec(`UPDATE progression_reconciliation SET status = 'idle', last_viewer_id = NULL, updated_at = ? WHERE id = 1`, formatTime(now)); settleErr != nil {
				return false, errors.Errorf("settle progression reconciliation status: %w", settleErr)
			}
			if commitErr := tx.Commit(); commitErr != nil {
				return false, errors.Errorf("commit settled progression reconciliation status: %w", commitErr)
			}
		}
		return true, nil
	}
	if _, runningErr := tx.Exec(`UPDATE progression_reconciliation SET status = 'running', updated_at = ? WHERE id = 1`, formatTime(now)); runningErr != nil {
		return false, errors.Errorf("mark progression reconciliation running: %w", runningErr)
	}
	rows, err := tx.Query(`SELECT id FROM viewers WHERE hidden = 0 AND id > ? ORDER BY id LIMIT ?`, strings.TrimSpace(status.LastViewerID), batchSize)
	if err != nil {
		return false, errors.Errorf("list progression reconciliation viewers: %w", err)
	}
	viewerIDs := make([]string, 0, batchSize)
	for rows.Next() {
		var viewerID string
		if err := rows.Scan(&viewerID); err != nil {
			_ = rows.Close()
			return false, errors.Errorf("scan progression reconciliation viewer: %w", err)
		}
		viewerIDs = append(viewerIDs, viewerID)
	}
	if err := rows.Close(); err != nil {
		return false, errors.Errorf("close progression reconciliation viewers: %w", err)
	}
	if err := rows.Err(); err != nil {
		return false, errors.Errorf("iterate progression reconciliation viewers: %w", err)
	}
	if len(viewerIDs) == 0 {
		if _, err := tx.Exec(`UPDATE progression_reconciliation SET completed_generation = requested_generation, status = 'idle', last_viewer_id = NULL, updated_at = ? WHERE id = 1`, formatTime(now)); err != nil {
			return false, errors.Errorf("complete progression reconciliation: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return false, errors.Errorf("commit completed progression reconciliation: %w", err)
		}
		return true, nil
	}
	for _, viewerID := range viewerIDs {
		if ctx.Err() != nil {
			return false, nil
		}
		for _, metric := range []ProgressionMetric{
			ProgressionMetricMessageCount,
			ProgressionMetricXP,
			ProgressionMetricAwardCount,
			ProgressionMetricCommandCount,
			ProgressionMetricSessionCount,
			ProgressionMetricContractWinCount,
		} {
			if _, err := s.evaluateProgressionLocked(tx, ProgressionEvaluationInput{ViewerID: viewerID, CauseMetric: metric, Backfilled: true, Now: now}); err != nil {
				return false, errors.Errorf("evaluate progression reconciliation viewer: %w", err)
			}
		}
	}
	if _, err := tx.Exec(`UPDATE progression_reconciliation SET last_viewer_id = ?, status = 'running', updated_at = ? WHERE id = 1`, viewerIDs[len(viewerIDs)-1], formatTime(now)); err != nil {
		return false, errors.Errorf("checkpoint progression reconciliation: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return false, errors.Errorf("commit progression reconciliation batch: %w", err)
	}
	return false, nil
}

func (s *Store) pauseProgressionReconciliation() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, err := s.db.Exec(`UPDATE progression_reconciliation SET status = 'paused', updated_at = ? WHERE id = 1 AND completed_generation < requested_generation`, formatTime(time.Now())); err != nil {
		return
	}
}
