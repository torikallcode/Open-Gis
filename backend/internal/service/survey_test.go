package service

import (
	"encoding/json"
	"testing"

	"github.com/ismw-project/ismw/backend/internal/domain"
)

func TestValidateSurveyInput(t *testing.T) {
	tests := []struct {
		name       string
		input      domain.CreateSurveyInput
		wantFields []string
	}{
		{
			name: "valid",
			input: domain.CreateSurveyInput{
				ProjectID:  "11111111-1111-4111-8111-111111111111",
				Name:       "Survei Blok A",
				Status:     domain.SurveyStatusInProgress,
				SurveyDate: "2026-11-10",
			},
		},
		{
			name:  "defaults draft",
			input: domain.CreateSurveyInput{ProjectID: "11111111-1111-4111-8111-111111111111", Name: "Survei"},
		},
		{
			name:       "missing name",
			input:      domain.CreateSurveyInput{ProjectID: "11111111-1111-4111-8111-111111111111"},
			wantFields: []string{"name"},
		},
		{
			name:       "invalid status",
			input:      domain.CreateSurveyInput{ProjectID: "11111111-1111-4111-8111-111111111111", Name: "S", Status: "done"},
			wantFields: []string{"status"},
		},
		{
			name:       "invalid date",
			input:      domain.CreateSurveyInput{ProjectID: "11111111-1111-4111-8111-111111111111", Name: "S", SurveyDate: "10/11/2026"},
			wantFields: []string{"survey_date"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := tt.input
			err := validateSurveyInput(&input)

			if len(tt.wantFields) == 0 {
				if err != nil {
					t.Fatalf("expected valid input, got %v", err)
				}
				if input.Status == "" {
					t.Fatal("expected status default")
				}
				return
			}

			fields := fieldSet(err)
			for _, field := range tt.wantFields {
				if !fields[field] {
					t.Errorf("expected error for %q, got %v", field, fields)
				}
			}
		})
	}
}

func TestValidateAreaInput(t *testing.T) {
	validPolygon := json.RawMessage(`{"type":"Polygon","coordinates":[[[110.36,-7.80],[110.36,-7.801],[110.361,-7.801],[110.36,-7.80]]]}`)

	input := domain.CreateAreaInput{Name: "Area Sleman", Boundary: validPolygon}
	if err := validateAreaInput(&input); err != nil {
		t.Fatalf("expected valid area input, got %v", err)
	}

	tests := []struct {
		name       string
		input      domain.CreateAreaInput
		wantFields []string
	}{
		{"missing name", domain.CreateAreaInput{Boundary: validPolygon}, []string{"name"}},
		{"invalid json", domain.CreateAreaInput{Name: "A", Boundary: json.RawMessage(`{`)}, []string{"boundary"}},
		{"wrong type", domain.CreateAreaInput{Name: "A", Boundary: json.RawMessage(`{"type":"Point","coordinates":[0,0]}`)}, []string{"boundary"}},
		{"empty boundary", domain.CreateAreaInput{Name: "A"}, []string{"boundary"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			caseInput := tt.input
			fields := fieldSet(validateAreaInput(&caseInput))
			for _, field := range tt.wantFields {
				if !fields[field] {
					t.Errorf("expected error for %q, got %v", field, fields)
				}
			}
		})
	}
}

func TestValidatePointInput(t *testing.T) {
	accuracy := 0.03
	negative := -1.0
	elevation := 120.5

	valid := domain.CreatePointInput{
		PointCode: "PT-001",
		Location:  domain.GeoPoint{Type: "Point", Coordinates: [2]float64{110.36, -7.8}},
		AccuracyM: &accuracy, ElevationM: &elevation, RecordedAt: "2026-11-10T08:30:00Z",
	}
	if err := validatePointInput(&valid); err != nil {
		t.Fatalf("expected valid point, got %v", err)
	}

	tests := []struct {
		name       string
		input      domain.CreatePointInput
		wantFields []string
	}{
		{"missing code", domain.CreatePointInput{Location: domain.GeoPoint{Type: "Point", Coordinates: [2]float64{110, -7}}}, []string{"point_code"}},
		{"wrong geometry", domain.CreatePointInput{PointCode: "P1", Location: domain.GeoPoint{Type: "Polygon"}}, []string{"location"}},
		{"longitude out of range", domain.CreatePointInput{PointCode: "P1", Location: domain.GeoPoint{Type: "Point", Coordinates: [2]float64{200, -7}}}, []string{"location"}},
		{"latitude out of range", domain.CreatePointInput{PointCode: "P1", Location: domain.GeoPoint{Type: "Point", Coordinates: [2]float64{110, -99}}}, []string{"location"}},
		{"negative accuracy", domain.CreatePointInput{PointCode: "P1", Location: domain.GeoPoint{Type: "Point", Coordinates: [2]float64{110, -7}}, AccuracyM: &negative}, []string{"accuracy_m"}},
		{"bad time", domain.CreatePointInput{PointCode: "P1", Location: domain.GeoPoint{Type: "Point", Coordinates: [2]float64{110, -7}}, RecordedAt: "kemarin"}, []string{"recorded_at"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fields := fieldSet(validatePointInput(&tt.input))
			for _, field := range tt.wantFields {
				if !fields[field] {
					t.Errorf("expected error for %q, got %v", field, fields)
				}
			}
		})
	}
}
