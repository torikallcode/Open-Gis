package service

import (
	"testing"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

func fieldSet(err error) map[string]bool {
	fields := map[string]bool{}
	if validation, ok := err.(*domain.ValidationError); ok {
		for _, field := range validation.Fields {
			fields[field.Field] = true
		}
	}
	return fields
}

func TestValidateProjectInput(t *testing.T) {
	tests := []struct {
		name       string
		input      domain.CreateProjectInput
		wantFields []string
	}{
		{
			name: "valid input",
			input: domain.CreateProjectInput{
				Name:      "Survei Sleman",
				CRSEPSG:   32749,
				Status:    domain.ProjectStatusActive,
				StartDate: "2026-01-01",
				EndDate:   "2026-02-01",
			},
		},
		{
			name:  "defaults status to planning",
			input: domain.CreateProjectInput{Name: "Proyek", CRSEPSG: 32749},
		},
		{
			name:       "missing name and crs",
			input:      domain.CreateProjectInput{},
			wantFields: []string{"name", "crs_epsg"},
		},
		{
			name:       "invalid status",
			input:      domain.CreateProjectInput{Name: "Proyek", CRSEPSG: 32749, Status: "unknown"},
			wantFields: []string{"status"},
		},
		{
			name:       "invalid start date",
			input:      domain.CreateProjectInput{Name: "Proyek", CRSEPSG: 32749, StartDate: "01-01-2026"},
			wantFields: []string{"start_date"},
		},
		{
			name: "end before start",
			input: domain.CreateProjectInput{
				Name:      "Proyek",
				CRSEPSG:   32749,
				StartDate: "2026-03-01",
				EndDate:   "2026-02-01",
			},
			wantFields: []string{"end_date"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := tt.input
			err := validateProjectInput(&input)

			if len(tt.wantFields) == 0 {
				if err != nil {
					t.Fatalf("expected valid input, got %v", err)
				}
				if input.Status == "" {
					t.Fatal("expected status to be defaulted")
				}
				return
			}

			if err == nil {
				t.Fatal("expected validation error")
			}

			fields := fieldSet(err)
			for _, field := range tt.wantFields {
				if !fields[field] {
					t.Errorf("expected field error for %q, got %v", field, fields)
				}
			}
		})
	}
}

func TestValidateMemberInput(t *testing.T) {
	input := domain.AddMemberInput{Email: "Surveyor <surveyor@example.local>", ProjectRole: "surveyor"}
	email, err := validateMemberInput(&input)
	if err != nil {
		t.Fatalf("expected valid member input, got %v", err)
	}
	if email != "surveyor@example.local" {
		t.Fatalf("unexpected parsed email %q", email)
	}

	bad := domain.AddMemberInput{Email: "not-an-email", ProjectRole: "unknown"}
	_, err = validateMemberInput(&bad)
	if err == nil {
		t.Fatal("expected validation error")
	}

	fields := fieldSet(err)
	if !fields["email"] || !fields["project_role"] {
		t.Fatalf("expected email and project_role errors, got %v", fields)
	}
}

func TestValidateUUID(t *testing.T) {
	if err := validateUUID("11111111-1111-4111-8111-111111111111", "id"); err != nil {
		t.Fatalf("expected valid uuid, got %v", err)
	}

	for _, invalid := range []string{"", "123", "zzzzzzzz-1111-4111-8111-111111111111"} {
		if err := validateUUID(invalid, "id"); err == nil {
			t.Errorf("expected invalid uuid for %q", invalid)
		}
	}
}
