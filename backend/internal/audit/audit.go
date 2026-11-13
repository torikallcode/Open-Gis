package audit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// Entry describes one auditable action.
type Entry struct {
	ActorID    string
	ActorEmail string
	ProjectID  string
	Action     string
	EntityType string
	EntityID   string
	Before     any
	After      any
	IPAddress  string
	UserAgent  string
	RequestID  string
}

// Record appends an audit row inside the caller's transaction.
func Record(ctx context.Context, tx pgx.Tx, entry Entry) error {
	before, err := marshal(entry.Before)
	if err != nil {
		return fmt.Errorf("marshal audit before: %w", err)
	}

	after, err := marshal(entry.After)
	if err != nil {
		return fmt.Errorf("marshal audit after: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO audit_logs (
			user_id, actor_email, project_id, action, entity_type, entity_id,
			before_data, after_data, ip_address, user_agent, request_id
		) VALUES (
			NULLIF($1, '')::uuid, NULLIF($2, ''), NULLIF($3, '')::uuid,
			$4, NULLIF($5, ''), NULLIF($6, '')::uuid,
			$7, $8, NULLIF($9, '')::inet, NULLIF($10, ''), NULLIF($11, '')
		)
	`,
		entry.ActorID,
		entry.ActorEmail,
		entry.ProjectID,
		entry.Action,
		entry.EntityType,
		entry.EntityID,
		before,
		after,
		entry.IPAddress,
		entry.UserAgent,
		entry.RequestID,
	)
	if err != nil {
		return fmt.Errorf("insert audit log: %w", err)
	}

	return nil
}

func marshal(value any) ([]byte, error) {
	if value == nil {
		return nil, nil
	}
	return json.Marshal(value)
}
