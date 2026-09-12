package store

import (
	"context"
	"log/slog"
	"time"

	"github.com/muonsoft/clog"
)

// ProgressionReconciler drives pending reconciliation generations without
// ever publishing historical unlocks. It is intentionally small: all cursor
// and idempotency guarantees live in Store.
type ProgressionReconciler struct {
	store     *Store
	batchSize int
	interval  time.Duration
}

// NewProgressionReconciler creates the process registered during bootstrap.
func NewProgressionReconciler(s *Store) *ProgressionReconciler {
	return &ProgressionReconciler{store: s, batchSize: defaultProgressionReconciliationBatchSize, interval: 5 * time.Second}
}

// Run blocks until shutdown, promptly processing a requested generation and
// using a cancellation-aware delay when there is no work.
func (r *ProgressionReconciler) Run(ctx context.Context) error {
	clog.Info(ctx, "progression reconciler started")
	defer clog.Info(ctx, "progression reconciler stopped")
	for {
		if ctx.Err() != nil {
			return nil
		}
		status, err := r.store.GetProgressionReconciliationStatus()
		if err != nil {
			clog.Errorf(ctx, "read progression reconciliation status: %w", err)
		} else if status.CompletedGeneration < status.RequestedGeneration {
			clog.Info(ctx, "progression reconciliation started", slog.Int("generation", status.RequestedGeneration))
			if err := r.store.ReconcileProgression(ctx, r.batchSize); err != nil {
				clog.Errorf(ctx, "run progression reconciliation: %w", err)
			} else if ctx.Err() == nil {
				clog.Info(ctx, "progression reconciliation completed", slog.Int("generation", status.RequestedGeneration))
				continue
			}
		}
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(r.interval):
		}
	}
}
