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

## Survei, area kerja, dan titik (Sprint 3B)

| Method | Path | Akses |
| --- | --- | --- |
| GET | `/surveys` | anggota proyek/admin |
| POST | `/surveys` | surveyor/manager/admin |
| GET | `/surveys/:id` | anggota proyek/admin |
| PUT | `/surveys/:id` | surveyor pemilik, manager, admin |
| DELETE | `/surveys/:id` | manager/admin (soft delete) |
| GET | `/projects/:id/survey-areas` | anggota/admin |
| POST | `/projects/:id/survey-areas` | manager/admin |
| DELETE | `/survey-areas/:areaId` | manager/admin (soft delete) |
| GET | `/surveys/:id/points` | anggota/admin |
| POST | `/surveys/:id/points` | surveyor/manager/admin |
| PUT | `/surveys/:id/points/:pointId` | surveyor/manager/admin |
| DELETE | `/surveys/:id/points/:pointId` | surveyor/manager/admin |

Filter list survei: `project_id`, `status`, `q`, `from`, `to`, `page`,
`per_page`, `sort` (`created_at`, `updated_at`, `survey_date`, `name`,
`status`), `order`.

Body survei:

```json
{
  "project_id": "07051d99-baf7-4955-ab7c-c201254c2b6a",
  "name": "Survei Bidang A",
  "survey_date": "2026-11-15",
  "method": "Total Station",
  "status": "in_progress",
  "notes": "Pengukuran blok A"
}
```

`status` ∈ `draft`, `in_progress`, `completed`, `cancelled`. `survey_date`
berformat `YYYY-MM-DD`. `surveyor_id` opsional; default adalah aktor.

Body area kerja:

```json
{
  "name": "Area Blok A",
  "boundary": {
    "type": "Polygon",
    "coordinates": [[[110.3592, -7.7992], [110.3592, -7.8028], [110.3638, -7.8028], [110.3638, -7.7992], [110.3592, -7.7992]]]
  }
}
```

`boundary` harus GeoJSON Polygon/MultiPolygon valid dan tidak kosong. Backend
menormalkan ke MultiPolygon EPSG:4326, menghitung `area_m2` memakai
`projects.crs_epsg`, dan mengabaikan nilai luas dari klien.

Body titik:

```json
{
  "point_code": "PT-001",
  "location": { "type": "Point", "coordinates": [110.3602, -7.8002] },
  "accuracy_m": 0.02,
  "elevation_m": 120.5,
  "source": "Total Station",
  "recorded_at": "2026-11-15T08:30:00Z"
}
```

`point_code` unik per survei (duplikat → 409). Longitude ∈ [-180, 180],
latitude ∈ [-90, 90], `accuracy_m` ≥ 0. `accuracy_m`, `elevation_m`, `source`,
dan `recorded_at` opsional.

## Bidang tanah (Sprint 4)

| Method | Path | Akses |
| --- | --- | --- |
| GET | `/parcels` | anggota proyek/admin |
| POST | `/parcels` | surveyor/manager/admin |
| GET | `/parcels/:id` | anggota proyek/admin |
| PUT | `/parcels/:id` | surveyor/manager/admin (status draft/rejected) |
| DELETE | `/parcels/:id` | manager/admin (soft delete) |
| PUT | `/parcels/:id/geometry` | surveyor/manager/admin (status draft/rejected) |
| PUT | `/parcels/:id/status` | sesuai matriks transisi |
| GET | `/parcels/:id/versions` | anggota proyek/admin |
| GET | `/projects/:id/features` | anggota proyek/admin |

Filter list: `project_id`, `survey_id`, `status`, `q`, `page`, `per_page`,
`sort` (`created_at`, `updated_at`, `parcel_code`, `status`, `area_m2`), `order`.

Body create:

```json
{
  "project_id": "07051d99-baf7-4955-ab7c-c201254c2b6a",
  "survey_id": null,
  "parcel_code": "PAR-001",
  "land_use": "Permukiman",
  "notes": "Bidang contoh",
  "attributes": { "pemilik": "Dummy", "tahun": 2026 },
  "boundary": {
    "type": "Polygon",
    "coordinates": [[[110.36, -7.80], [110.36, -7.801], [110.3615, -7.801], [110.3615, -7.80], [110.36, -7.80]]]
  }
}
```

Aturan:

- `parcel_code` unik case-insensitive per proyek (duplikat → 409).
- `attributes` harus objek JSON, maksimum 32 KB.
- `boundary` Polygon/MultiPolygon valid; backend menormalkan ke MultiPolygon
  4326 dan menghitung `area_m2` memakai `projects.crs_epsg`.
- `PUT /parcels/:id` tidak mengubah geometri maupun status.
- `PUT /parcels/:id/geometry` menerima `{ "boundary": …, "change_reason": "…" }`.
- `PUT /parcels/:id/status` menerima `{ "status": "...", "note": "..." }`.

Transisi status:

| Dari | Ke | Peran |
| --- | --- | --- |
| `draft` | `submitted` | surveyor/manager/admin |
| `submitted` | `under_review` | supervisor/manager/admin |
| `under_review` | `approved`/`rejected` | supervisor/manager/admin |
| `rejected` | `draft` | surveyor/manager/admin |
| `approved` | — | final |

Geometri dan atribut terkunci saat status `submitted`, `under_review`, atau
`approved`. Setiap mutasi (create, atribut, geometri, status) menambah satu
snapshot immutable di `parcel_versions` dan menaikkan `current_version`.

`GET /projects/:id/features` mengembalikan GeoJSON FeatureCollection bidang
aktif dengan properti `id`, `parcel_code`, `land_use`, `verification_status`,
`survey_id`.

## Belum tersedia

Endpoint validasi spasial, media, dan laporan menyusul pada Sprint 5–6.
Kontraknya akan ditambahkan bersamaan dengan sprint terkait.

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
