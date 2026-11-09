package store

import (
	"context"
	"database/sql"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
)

// ErrAIConflict indicates a stale revision, duplicate source or full dedupe table.
var ErrAIConflict = errors.New("AI message state conflict")

// AIRecord stores versioned opaque service data without coupling storage to providers.
type AIRecord struct {
	ID        string
	Revision  int
	State     string
	CreatedAt time.Time
	UpdatedAt time.Time
	Payload   []byte
}

// CreateAIRecord atomically reserves a source identity and inserts a job.
func (s *Store) CreateAIRecord(ctx context.Context, r AIRecord, sourceKey string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return errors.Errorf("begin AI record: %w", err)
	}
	defer rollbackUnlessDone(tx)
	var count int
	if err = tx.QueryRowContext(ctx, "SELECT count(*) FROM ai_message_dedupe").Scan(&count); err != nil {
		return errors.Errorf("count AI dedupe: %w", err)
	}
	if count >= 100000 {
		return ErrAIConflict
	}
	result, err := tx.ExecContext(ctx, "INSERT OR IGNORE INTO ai_message_dedupe(source_key,created_at) VALUES (?,?)", sourceKey, r.CreatedAt.UTC().Format(time.RFC3339Nano))
	if err != nil {
		return errors.Errorf("insert AI dedupe: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return errors.Errorf("read AI dedupe count: %w", err)
	}
	if n == 0 {
		return ErrAIConflict
	}
	_, err = tx.ExecContext(ctx, "INSERT INTO ai_message_jobs(id,revision,state,created_at,updated_at,payload) VALUES (?,?,?,?,?,?)", r.ID, r.Revision, r.State, r.CreatedAt.UTC().Format(time.RFC3339Nano), r.UpdatedAt.UTC().Format(time.RFC3339Nano), string(r.Payload))
	if err != nil {
		return errors.Errorf("insert AI record: %w", err)
	}
	if err = tx.Commit(); err != nil {
		return errors.Errorf("commit AI record: %w", err)
	}
	return nil
}

// UpdateAIRecord commits a compare-and-swap state transition.
func (s *Store) UpdateAIRecord(ctx context.Context, r AIRecord, expected int) error {
	res, err := s.db.ExecContext(ctx, "UPDATE ai_message_jobs SET revision=?,state=?,updated_at=?,payload=? WHERE id=? AND revision=?", r.Revision, r.State, r.UpdatedAt.UTC().Format(time.RFC3339Nano), string(r.Payload), r.ID, expected)
	if err != nil {
		return errors.Errorf("update AI record: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return errors.Errorf("read AI update count: %w", err)
	}
	if n != 1 {
		return ErrAIConflict
	}
	return nil
}

// AIRecords loads the bounded local job audit in newest-first order.
func (s *Store) AIRecords(ctx context.Context) ([]AIRecord, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id,revision,state,created_at,updated_at,payload FROM ai_message_jobs ORDER BY created_at DESC,id DESC")
	if err != nil {
		return nil, errors.Errorf("list AI records: %w", err)
	}
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			clog.Errorf(ctx, "close AI rows: %w", closeErr)
		}
	}()
	records := []AIRecord{}
	for rows.Next() {
		var r AIRecord
		var created, updated string
		if err = rows.Scan(&r.ID, &r.Revision, &r.State, &created, &updated, &r.Payload); err != nil {
			return nil, errors.Errorf("scan AI record: %w", err)
		}
		r.CreatedAt, err = time.Parse(time.RFC3339Nano, created)
		if err != nil {
			return nil, errors.Errorf("parse AI created time: %w", err)
		}
		r.UpdatedAt, err = time.Parse(time.RFC3339Nano, updated)
		if err != nil {
			return nil, errors.Errorf("parse AI updated time: %w", err)
		}
		records = append(records, r)
	}
	if err = rows.Err(); err != nil {
		return nil, errors.Errorf("read AI records: %w", err)
	}
	return records, nil
}

// DeleteAIRecord removes only terminal job records.
func (s *Store) DeleteAIRecord(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM ai_message_jobs WHERE id=? AND state IN ('rejected','expired','canceled','failed','dispatched')", id)
	if err != nil {
		return errors.Errorf("delete AI record: %w", err)
	}
	return nil
}

// PruneAIDedupe expires source identities after the retention period.
func (s *Store) PruneAIDedupe(ctx context.Context, now time.Time) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM ai_message_dedupe WHERE created_at < ?", now.Add(-7*24*time.Hour).UTC().Format(time.RFC3339Nano))
	if err != nil {
		return errors.Errorf("prune AI dedupe: %w", err)
	}
	return nil
}

func rollbackUnlessDone(tx *sql.Tx) {
	if err := tx.Rollback(); err != nil && !errors.Is(err, sql.ErrTxDone) {
		clog.Errorf(context.Background(), "rollback AI transaction: %w", err)
	}
}
