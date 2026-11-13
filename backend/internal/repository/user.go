package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

// User is the minimal user projection needed by project membership.
type User struct {
	ID      string
	Name    string
	Email   string
	IsAdmin bool
}

// UserRepository reads users for membership and actor resolution.
type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// FindByEmail returns an active, non-deleted user.
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (User, error) {
	var user User
	err := r.pool.QueryRow(ctx, `
		SELECT u.id::text, u.name, u.email,
		       EXISTS (
		           SELECT 1
		           FROM user_roles ur
		           JOIN roles r ON r.id = ur.role_id
		           WHERE ur.user_id = u.id AND r.code = 'admin'
		       )
		FROM users u
		WHERE lower(u.email) = lower($1)
		  AND u.deleted_at IS NULL
		  AND u.is_active
	`, email).Scan(&user.ID, &user.Name, &user.Email, &user.IsAdmin)

	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, domain.ErrNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("find user by email: %w", err)
	}
	return user, nil
}

// FindByID returns an active, non-deleted user.
func (r *UserRepository) FindByID(ctx context.Context, id string) (User, error) {
	var user User
	err := r.pool.QueryRow(ctx, `
		SELECT u.id::text, u.name, u.email,
		       EXISTS (
		           SELECT 1
		           FROM user_roles ur
		           JOIN roles r ON r.id = ur.role_id
		           WHERE ur.user_id = u.id AND r.code = 'admin'
		       )
		FROM users u
		WHERE u.id = $1::uuid
		  AND u.deleted_at IS NULL
		  AND u.is_active
	`, id).Scan(&user.ID, &user.Name, &user.Email, &user.IsAdmin)

	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, domain.ErrNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("find user by id: %w", err)
	}
	return user, nil
}
