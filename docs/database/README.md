# Database

PostgreSQL 16 + PostGIS 3.4, database `ismw_db`.

## Migration

Migration adalah sumber kebenaran skema. File SQL berada di
`backend/migrations/` dan di-embed ke binary, sehingga `cmd/migrate` tidak
bergantung pada working directory.

Aturan:

- Nama file: `NNNNNN_nama.up.sql` / `NNNNNN_nama.down.sql`.
- Satu migration = satu perubahan logis; selalu sediakan `down` yang benar.
- Jangan mengubah migration yang sudah pernah dijalankan; buat migration baru.
- Jangan menyimpan data operasional di migration; gunakan `database/seeds/`.
- Migration dijalankan manual (`npm run db:migrate`), bukan otomatis saat
  startup. `AUTO_MIGRATE=true` hanya untuk development.

```bash
cd backend
go run ./cmd/migrate up
go run ./cmd/migrate version   # versi + flag dirty
go run ./cmd/migrate down
```

Jika versi berstatus `dirty`, perbaiki database secara manual lalu set versi
dengan tool golang-migrate sebelum melanjutkan.

Riwayat migration:

| Versi | Isi |
| --- | --- |
| `000001` | Ekstensi PostGIS, identity/RBAC, projects, project_members, audit_logs |
| `000002` | `projects.updated_by` + index pencarian/urut proyek |
| `000003` | `surveys`, `survey_areas`, `survey_points` + index spasial |
| `000004` | `parcels`, `parcel_versions` + index spasial dan unique kode |

## Skema saat ini (Sprint 4)

| Tabel | Fungsi |
| --- | --- |
| `users` | Akun pengguna (soft delete via `deleted_at`) |
| `roles` | Role global sistem |
| `permissions` | Hak akses granular |
| `role_permissions` | Pemetaan role → permission |
| `user_roles` | Role global per pengguna |
| `projects` | Proyek survei + `crs_epsg` metrik + `updated_by`, soft delete |
| `project_members` | Peran pengguna per proyek |
| `audit_logs` | Catatan aktivitas append-only |
| `surveys` | Kegiatan survei per proyek, soft delete |
| `survey_areas` | Area kerja proyek (`MultiPolygon` 4326) + luas metrik |
| `survey_points` | Titik survei (`Point` 4326), unik per survei |
| `parcels` | Bidang tanah (`MultiPolygon` 4326), atribut JSONB, status, versi aktif |
| `parcel_versions` | Snapshot immutable setiap perubahan bidang |

Tabel spasial dan operasional lain (`validation_results`, media, dsb.)
ditambahkan pada Sprint 5–6.

## Konvensi

- Primary key `UUID DEFAULT gen_random_uuid()`.
- Timestamp `TIMESTAMPTZ`, disimpan UTC; `updated_at` diperbarui trigger.
- Status memakai `VARCHAR + CHECK`, bukan PostgreSQL ENUM, agar penambahan
  status tidak memaksa migrasi tipe.
- Email unik case-insensitive melalui `UNIQUE INDEX ON users (lower(email))`.
- Foreign key eksplisit; index pada FK dan kolom filter yang sering dipakai.
- Soft delete hanya pada entitas yang membutuhkan retensi
  (`users.deleted_at`, `projects.deleted_at`).
- `audit_logs` memakai `ON DELETE SET NULL` + snapshot (`actor_email`,
  `entity_type`, `entity_id`) agar jejak tidak ikut terhapus.
- `projects.crs_epsg` mereferensikan `spatial_ref_sys` dan wajib CRS proyeksi.
  Lihat [ADR-0001](../architecture/decisions/0001-crs-strategy.md).
- Geometri disimpan EPSG:4326 dengan `CHECK (ST_SRID(...) = 4326)`, GiST index,
  dan `CHECK (ST_IsValid(...))` untuk area. Area dihitung backend dengan
  `ST_Area(ST_Transform(boundary, projects.crs_epsg))`.
- `survey_points` unik pada `(survey_id, point_code)`; akurasi tidak boleh
  negatif.
- `parcels` memakai partial unique index `(project_id, lower(parcel_code))`
  `WHERE deleted_at IS NULL`, sehingga kode unik per proyek dan dapat dipakai
  lagi setelah soft delete.
- `parcel_versions` menyimpan snapshot penuh setiap perubahan; versi 1 dibuat
  saat create. `parcels.current_version` menunjuk versi terbaru. Lihat
  [ADR-0002](../architecture/decisions/0002-parcel-versioning.md).

## Seed

Seed dijalankan berurutan oleh `scripts/seed.mjs` (portabel di Windows/Linux)
dan hanya untuk development:

- `001_roles_permissions.sql` — 4 role, 12 permission, pemetaan role-permission,
  akun `admin@example.local`.
- `002_dummy_users.sql` — akun dummy `surveyor@example.local`,
  `analyst@example.local`, `supervisor@example.local` beserta role global.

Semua password hash adalah placeholder yang tidak dapat login (auth hadir di
Sprint 7). Seed idempotent dan aman dijalankan berulang.

```bash
npm run db:seed
```

## Reset lokal

```bash
docker compose down -v
docker compose up -d --wait db
cd backend && go run ./cmd/migrate up
npm run db:seed
```

`down -v` menghapus volume data lokal secara permanen.
