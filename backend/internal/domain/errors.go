package domain

import (
	"fmt"
	"strings"
)

// FieldError describes one invalid field.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationError carries per-field validation failures.
type ValidationError struct {
	Fields []FieldError
}

func (e *ValidationError) Error() string {
	parts := make([]string, 0, len(e.Fields))
	for _, field := range e.Fields {
		parts = append(parts, fmt.Sprintf("%s: %s", field.Field, field.Message))
	}
	return strings.Join(parts, "; ")
}

// Add appends a field error.
func (e *ValidationError) Add(field, message string) {
	e.Fields = append(e.Fields, FieldError{Field: field, Message: message})
}

// HasErrors reports whether any field error was collected.
func (e *ValidationError) HasErrors() bool {
	return len(e.Fields) > 0
}

// NewValidationError creates an empty validation error.
func NewValidationError() *ValidationError {
	return &ValidationError{}
}
