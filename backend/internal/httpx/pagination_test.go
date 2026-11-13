package httpx

import "testing"

func TestParsePaginationDefaultsAndLimits(t *testing.T) {
	tests := []struct {
		page        string
		perPage     string
		wantPage    int
		wantPerPage int
	}{
		{"", "", 1, 20},
		{"3", "50", 3, 50},
		{"0", "-5", 1, 20},
		{"abc", "abc", 1, 20},
		{"1", "500", 1, 100},
	}

	for _, tt := range tests {
		got := Pagination{Page: parsePositiveInt(tt.page, 1), PerPage: parsePositiveInt(tt.perPage, 20)}
		if got.PerPage > 100 {
			got.PerPage = 100
		}
		if got.Page != tt.wantPage || got.PerPage != tt.wantPerPage {
			t.Errorf("page=%q per_page=%q => %+v, want %d/%d", tt.page, tt.perPage, got, tt.wantPage, tt.wantPerPage)
		}
	}
}

func TestBuildMeta(t *testing.T) {
	meta := BuildMeta(Pagination{Page: 2, PerPage: 20}, 45)
	if meta.TotalPages != 3 || meta.Total != 45 || meta.Page != 2 {
		t.Fatalf("unexpected meta: %+v", meta)
	}

	empty := BuildMeta(Pagination{Page: 1, PerPage: 20}, 0)
	if empty.TotalPages != 0 {
		t.Fatalf("expected 0 total pages, got %+v", empty)
	}
}
