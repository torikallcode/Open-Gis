package service

import (
	"encoding/json"
	"testing"

	"github.com/ismw-project/ismw/backend/internal/access"
	"github.com/ismw-project/ismw/backend/internal/domain"
)

func TestNormalizeParcelAttributes(t *testing.T) {
	if _, ok := normalizeParcelAttributes(nil); !ok {
		t.Fatal("expected empty attributes to be valid")
	}

	normalized, ok := normalizeParcelAttributes(json.RawMessage(`{"pemilik":"Dummy","tahun":2026}`))
	if !ok || len(normalized) == 0 {
		t.Fatalf("expected object attributes to be valid, got %s ok=%v", normalized, ok)
	}

	if _, ok := normalizeParcelAttributes(json.RawMessage(`[1,2,3]`)); ok {
		t.Fatal("expected array attributes to be rejected")
	}
	if _, ok := normalizeParcelAttributes(json.RawMessage(`"text"`)); ok {
		t.Fatal("expected scalar attributes to be rejected")
	}
	if _, ok := normalizeParcelAttributes(json.RawMessage(`{`)); ok {
		t.Fatal("expected invalid JSON to be rejected")
	}
}

func TestValidateParcelInput(t *testing.T) {
	validBoundary := json.RawMessage(`{"type":"Polygon","coordinates":[[[110.36,-7.80],[110.36,-7.801],[110.361,-7.801],[110.36,-7.80]]]}`)

	valid := domain.CreateParcelInput{
		ProjectID:  "11111111-1111-4111-8111-111111111111",
		ParcelCode: "PAR-001",
		LandUse:    "Permukiman",
		Attributes: json.RawMessage(`{"pemilik":"Dummy"}`),
		Boundary:   validBoundary,
	}
	if err := validateParcelCreateInput(&valid); err != nil {
		t.Fatalf("expected valid parcel input, got %v", err)
	}

	tests := []struct {
		name       string
		input      domain.CreateParcelInput
		wantFields []string
	}{
		{
			name:       "missing code",
			input:      domain.CreateParcelInput{Boundary: validBoundary},
			wantFields: []string{"parcel_code"},
		},
		{
			name:       "array attributes",
			input:      domain.CreateParcelInput{ParcelCode: "P1", Attributes: json.RawMessage(`[]`), Boundary: validBoundary},
			wantFields: []string{"attributes"},
		},
		{
			name:       "wrong geometry",
			input:      domain.CreateParcelInput{ParcelCode: "P1", Boundary: json.RawMessage(`{"type":"Point","coordinates":[0,0]}`)},
			wantFields: []string{"boundary"},
		},
		{
			name:       "missing boundary",
			input:      domain.CreateParcelInput{ParcelCode: "P1"},
			wantFields: []string{"boundary"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := tt.input
			fields := fieldSet(validateParcelCreateInput(&input))
			for _, field := range tt.wantFields {
				if !fields[field] {
					t.Errorf("expected error for %q, got %v", field, fields)
				}
			}
		})
	}
}

func TestCanTransitionParcel(t *testing.T) {
	admin := access.Actor{ID: "a", IsAdmin: true}
	manager := access.Actor{ID: "m"}
	surveyor := access.Actor{ID: "s"}
	supervisor := access.Actor{ID: "v"}
	analyst := access.Actor{ID: "g"}

	tests := []struct {
		name  string
		actor access.Actor
		role  string
		from  string
		to    string
		want  bool
	}{
		{"admin draft submit", admin, "admin", "draft", "submitted", true},
		{"surveyor draft submit", surveyor, "surveyor", "draft", "submitted", true},
		{"analyst draft submit", analyst, "gis_analyst", "draft", "submitted", false},
		{"supervisor draft approve", supervisor, "supervisor", "draft", "approved", false},
		{"manager submitted review", manager, "manager", "submitted", "under_review", true},
		{"supervisor submitted review", supervisor, "supervisor", "submitted", "under_review", true},
		{"surveyor submitted review", surveyor, "surveyor", "submitted", "under_review", false},
		{"supervisor approve", supervisor, "supervisor", "under_review", "approved", true},
		{"supervisor reject", supervisor, "supervisor", "under_review", "rejected", true},
		{"surveyor approve", surveyor, "surveyor", "under_review", "approved", false},
		{"surveyor rejected to draft", surveyor, "surveyor", "rejected", "draft", true},
		{"approved immutable", admin, "admin", "approved", "draft", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := canTransitionParcel(tt.actor, tt.role, tt.from, tt.to); got != tt.want {
				t.Errorf("canTransitionParcel(%s -> %s, role=%s) = %v, want %v", tt.from, tt.to, tt.role, got, tt.want)
			}
		})
	}
}
