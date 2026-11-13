# ISMW — Integrated Survey & Mapping Web GIS

Web GIS untuk manajemen survei dan pemetaan: proyek, kegiatan survei, titik
koordinat, bidang tanah, validasi geometri, dokumentasi lapangan, dan pelaporan.

> **Status:** Sprint 1 (Project Foundation), Sprint 2 (GIS Map Viewer), dan
> Sprint 3A (Project Management) selesai. Sprint 3B (Survey Management) berikutnya.
> Lihat [Roadmap](#roadmap) dan
> [ADR-0001](docs/architecture/decisions/0001-crs-strategy.md).

## Stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | React 19 + TypeScript + Tailwind CSS 4 (Vite) |
| Mapping | OpenLayers 10 |
| Backend | Go 1.22 + Gin |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| DB access | pgx v5 (SQL eksplisit, tanpa ORM) |
| Migration | golang-migrate (embedded, `cmd/migrate`) |
| Container | Docker Compose |

## Prasyarat

- Go **1.22+**
- Node.js **20.19+ / 22 LTS** dan npm
- Docker Desktop (untuk database PostGIS)

## Struktur repository

```
backend/        REST API (Go + Gin), migration SQL, Dockerfile
frontend/       Aplikasi web (React + Vite), layer dummy di public/data/
database/       Seed data dummy
docs/           Arsitektur (ADR), referensi API dan database
storage/        File upload lokal (kosong sampai Sprint 6)
```

## Setup dari nol

```bash
# 1. Konfigurasi lokal
cp .env.example .env          # Windows: copy .env.example .env

# 2. Database PostGIS
docker compose up -d --wait db

# 3. Migration + seed dummy
npm run db:migrate            # atau: cd backend && go run ./cmd/migrate up
npm run db:seed

# 4. Dependensi frontend + task runner root
npm install                   # root (concurrently)
npm run install:web

# 5. Jalankan API dan web sekaligus
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:8080> (lihat catatan port di bawah)

Menjalankan terpisah:

```bash
cd backend && go run ./cmd/api
cd frontend && npm run dev
```

## Konfigurasi

Semua variabel dibaca dari environment; `.env` di root hanya untuk development
dan **tidak boleh di-commit**.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `APP_ENV` | `development` | `production` mengaktifkan mode rilis Gin |
| `HTTP_PORT` | `8080` | Port API |
| `DATABASE_URL` | — | Wajib. DSN PostgreSQL |
| `DB_MAX_CONNS` | `10` | Ukuran pool pgx |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Daftar origin dipisah koma |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `AUTO_MIGRATE` | `false` | `true` hanya untuk development |
| `DEV_USER_EMAIL` | `admin@example.local` | Aktor development selama auth belum ada; diabaikan saat production |
| `POSTGRES_DB` | `ismw_db` | Nama database container |
| `POSTGRES_USER` | `ismw` | User database container |
| `POSTGRES_PASSWORD` | `ismw_dev_password` | Password development |
| `DB_PORT` | `5432` | Port host yang dipublikasikan Compose |
| `VITE_API_BASE_URL` | `/api/v1` | Base path API di frontend |
| `VITE_PROXY_TARGET` | `http://localhost:8080` | Target proxy Vite |
| `VITE_BASEMAP_TILE_URL` | tile OSM standar | Override URL tile basemap |
| `VITE_BASEMAP_ATTRIBUTION` | atribusi OSM | Teks atribusi basemap |

### Jika port bentrok

Port host sering sudah dipakai proyek lain. Ubah di `.env` (bukan di
`docker-compose.yml`), lalu sesuaikan frontend:

```ini
HTTP_PORT=8081
DB_PORT=55432
DATABASE_URL=postgres://ismw:ismw_dev_password@localhost:55432/ismw_db?sslmode=disable
```

dan di `frontend/.env.local`:

```ini
VITE_PROXY_TARGET=http://localhost:8081
```

`DB_PORT` dan port pada `DATABASE_URL` harus sama.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | API + web bersamaan |
| `npm run db:up` / `db:down` | Nyalakan / hentikan container database |
| `npm run db:migrate` | Terapkan migration |
| `npm run db:rollback` | Rollback seluruh migration |
| `npm run db:seed` | Muat seed dummy |
| `npm run lint:web` | ESLint |
| `npm run build:web` | Typecheck + build produksi |
| `npm run test:api` | Test backend |

Migration lain:

```bash
cd backend
go run ./cmd/migrate version   # versi saat ini + status dirty
go run ./cmd/migrate down      # rollback semua
go run ./cmd/migrate up
```

## Health endpoint

```
GET /healthz          liveness, tanpa database
GET /api/v1/health    readiness, termasuk ping database
```

`200` saat database terhubung, `503` saat tidak:

```json
{
  "data": {
    "status": "ok",
    "version": "dev",
    "uptime_seconds": 42,
    "checks": { "database": { "status": "ok", "latency_ms": 3 } },
    "timestamp": "2026-11-13T10:00:00Z"
  }
}
```

Endpoint lain belum tersedia. Detail format respons dan error:
[docs/api/README.md](docs/api/README.md).

## Proyek (Sprint 3A)

Halaman `/projects` menyediakan:

- Daftar proyek dengan pencarian, filter status, dan pagination.
- Form proyek (nama, deskripsi, lokasi, status, jadwal, CRS).
- CRS dipilih dari preset UTM 46N–54N / 46S–54S atau EPSG manual; hanya CRS
  proyeksi metrik yang diterima backend.
- Detail proyek dengan tab Ringkasan dan Anggota.
- Anggota proyek ditambahkan lewat email, dengan peran `manager`, `surveyor`,
  `gis_analyst`, `supervisor`, atau `viewer`.
- Setiap mutasi tercatat di `audit_logs` (aktor, entitas, before/after, request id).

Endpoint:

```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id            (soft delete)
GET    /api/v1/projects/:id/members
POST   /api/v1/projects/:id/members
PUT    /api/v1/projects/:id/members/:userId
DELETE /api/v1/projects/:id/members/:userId
```

**Aktor development:** selama autentikasi belum ada (Sprint 7), backend memakai
`DEV_USER_EMAIL`. Endpoint domain **menolak semua request dengan 401** bila
`APP_ENV=production`. Otorisasi tetap dicek: admin global boleh semuanya,
`manager` mengelola proyeknya, `surveyor` hanya baca pada Sprint 3A, dan
non-anggota mendapat 403.

## Peta (Sprint 2)

Halaman `/map` menampilkan:

- Basemap OpenStreetMap (standar, humanitarian, atau tanpa basemap) dengan
  atribusi yang terlihat.
- Tiga layer dummy: area kerja, bidang tanah, dan titik survei, dimuat dari
  `frontend/public/data/*.geojson`.
- Panel layer: visibilitas, opasitas, urutan (z-index), legenda status bidang,
  dan info CRS.
- Popup atribut fitur saat diklik.
- Koordinat kursor dalam derajat (EPSG:4326) dan UTM 49S (EPSG:32749).
- Alat ukur jarak dan luas. Hasil dihitung di CRS proyek metrik
  (`EPSG:32749`), bukan dari derajat. Gambar dengan klik, akhiri dengan klik
  dua kali, lalu "Hapus" untuk membersihkan.
- Tombol fokus ke area kerja.

Catatan:

- Semua fitur adalah **data dummy** di sekitar Sleman, Yogyakarta. Bukan data
  pertanahan resmi.
- Geometri GeoJSON selalu EPSG:4326. CRS proyek untuk perhitungan metrik
  mengikuti [ADR-0001](docs/architecture/decisions/0001-crs-strategy.md).
- Basemap memakai layanan tile publik OSM. Untuk produksi, gunakan penyedia
  tile yang sesuai dengan kebijakan penggunaannya (mis. layanan berlangganan
  atau tile server sendiri) melalui `VITE_BASEMAP_TILE_URL`, dan tetap
  tampilkan atribusi.

## Database

- Skema saat ini: `users`, `roles`, `permissions`, `role_permissions`,
  `user_roles`, `projects`, `project_members`, `audit_logs`.
- `projects` memiliki `updated_by` dan mendukung soft delete.
- Tabel spasial (`surveys`, `survey_areas`, `survey_points`, `parcels`, ...)
  menyusul di Sprint 3B–4.
- Semua geometri nantinya disimpan pada **EPSG:4326**; luas metrik dihitung
  backend memakai `projects.crs_epsg`. Baca
  [ADR-0001](docs/architecture/decisions/0001-crs-strategy.md).

Detail workflow migration dan konvensi: [docs/database/README.md](docs/database/README.md).

## Keamanan

- Tidak ada secret di repository; `.env` dan `.env.local` di-ignore.
- Seed hanya berisi data dummy, termasuk akun dengan hash placeholder yang
  tidak bisa login (`admin@example.local`, `surveyor@example.local`,
  `analyst@example.local`, `supervisor@example.local`).
- Autentikasi dan RBAC **belum aktif** (Sprint 7); `DEV_USER_EMAIL` hanya untuk
  development. Jangan mengekspos API ini ke internet pada kondisi saat ini.
- Jangan memakai data pertanahan internal/rahasia tanpa otorisasi tertulis.

## Roadmap

| Sprint | Fokus | Status |
| --- | --- | --- |
| 1 | Project foundation | Selesai |
| 2 | GIS map viewer (OpenLayers) | Selesai |
| 3 | Project & survey management | 3A selesai, 3B berikutnya |
| 4 | Parcel management | Belum |
| 5 | Spatial validation | Belum |
| 6 | Geotagging & reporting | Belum |
| 7 | Security & production readiness | Belum |

## Troubleshooting

- **`failed to connect to the docker API`** — Docker Desktop belum berjalan.
- **`Bind for 0.0.0.0:PORT failed`** — port dipakai proses lain; ubah `DB_PORT`
  atau `HTTP_PORT` seperti di atas.
- **`password authentication failed`** — pastikan `DB_PORT` mengarah ke container
  ISMW (bukan PostgreSQL native), dan `DATABASE_URL` memakai port yang sama.
- **Health 503 setelah `docker compose stop db`** — perilaku benar; jalankan
  `docker compose start db`, backend pulih tanpa restart.
- **Basemap tidak muncul** — periksa koneksi internet dan `VITE_BASEMAP_TILE_URL`;
  layer dummy tetap tampil tanpa basemap.
- **Reset database** — `docker compose down -v && docker compose up -d --wait db`,
  lalu migration dan seed ulang. Perintah ini **menghapus seluruh data lokal**.
