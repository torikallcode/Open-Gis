# Referensi API

Base path: `/api/v1`. Semua respons JSON memakai UTF-8.

## Format respons

Sukses (list menyertakan `meta`):

```json
{ "data": [], "meta": { "page": 1, "per_page": 20, "total": 0, "total_pages": 0 } }
```

Error validasi:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Data tidak valid.",
    "details": [{ "field": "crs_epsg", "message": "CRS harus berupa CRS proyeksi metrik." }],
    "request_id": "5f0c..."
  }
}
```

Setiap respons menyertakan header `X-Request-ID`; nilai yang dikirim klien
dipakai kembali, sehingga log dapat dikorelasikan.

## Autentikasi development

Autentikasi belum diimplementasikan (Sprint 7). Selama `APP_ENV != production`,
backend memakai aktor dari `DEV_USER_EMAIL` (default `admin@example.local`).
Aktor harus ada, aktif, dan tidak dihapus.

Bila `APP_ENV=production`, seluruh endpoint domain mengembalikan **401**.
Endpoint health tetap publik.

## Pagination dan filter

Parameter list: `page` (default 1), `per_page` (default 20, maksimum 100),
`sort`, `order` (`asc`/`desc`). Nilai `sort` dibatasi allowlist per resource.

Response list: `data` berisi array, `meta` berisi `page`, `per_page`, `total`,
`total_pages`.

## Health

### `GET /healthz`

Liveness tanpa dependensi. Selalu `200` bila proses hidup.

```json
{ "status": "ok" }
```

### `GET /api/v1/health`

Readiness, termasuk ping database (timeout 2 detik).

| Kondisi | HTTP | `status` |
| --- | --- | --- |
| Database terhubung | 200 | `ok` |
| Database tidak tersedia | 503 | `degraded` |

```json
{
  "data": {
    "status": "ok",
    "version": "dev",
    "uptime_seconds": 42,
    "checks": {
      "database": { "status": "ok", "latency_ms": 3 }
    },
    "timestamp": "2026-11-13T10:00:00Z"
  }
}
```

## Proyek (Sprint 3A)

| Method | Path | Akses |
| --- | --- | --- |
| GET | `/projects` | admin: semua; lainnya: proyek yang diikuti |
| POST | `/projects` | admin |
| GET | `/projects/:id` | anggota/admin |
| PUT | `/projects/:id` | manager proyek/admin |
| DELETE | `/projects/:id` | admin (soft delete) |
| GET | `/projects/:id/members` | anggota/admin |
| POST | `/projects/:id/members` | manager/admin |
| PUT | `/projects/:id/members/:userId` | manager/admin |
| DELETE | `/projects/:id/members/:userId` | manager/admin |

Filter list proyek: `q`, `status`, `page`, `per_page`, `sort`
(`created_at`, `updated_at`, `name`, `status`, `start_date`), `order`.

Body proyek:

```json
{
  "name": "Survei Sleman 2026",
  "description": "Proyek contoh",
  "location": "Sleman, DI Yogyakarta",
  "crs_epsg": 32749,
  "status": "active",
  "start_date": "2026-11-01",
  "end_date": "2026-12-31"
}
```

Aturan penting:

- `crs_epsg` wajib dan harus CRS proyeksi metrik yang dikenal PostGIS
  (EPSG:4326 ditolak).
- `status` ∈ `planning`, `active`, `on_hold`, `completed`, `archived`.
- `start_date`/`end_date` berformat `YYYY-MM-DD`; `end_date` tidak boleh lebih
  awal dari `start_date`.
- Anggota ditambahkan dengan `{ "email": "...", "project_role": "surveyor" }`.
  Peran: `manager`, `surveyor`, `gis_analyst`, `supervisor`, `viewer`.
- Email duplikat → 409; pengguna tidak ditemukan → 422 dengan field `email`.

## Belum tersedia

Endpoint survei, area kerja, titik koordinat, parsel, validasi, media, dan
laporan menyusul pada Sprint 3B–6. Kontraknya akan ditambahkan bersamaan
dengan sprint terkait.

## Kode error

| `code` | HTTP | Arti |
| --- | --- | --- |
| `validation_error` | 422 | Input tidak valid; lihat `details[].field` |
| `forbidden` | 403 | Aktor tidak memiliki akses |
| `not_found` | 404 | Resource/route tidak ditemukan |
| `conflict` | 409 | Duplikat atau konflik data |
| `unauthenticated` | 401 | Aktor tidak tersedia / auth belum aktif |
| `internal_error` | 500 | Panic/kesalahan tak terduga |
| `network_error` | — | Hanya di klien: server tidak dapat dihubungi |
