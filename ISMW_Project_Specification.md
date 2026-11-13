# ISMW --- Integrated Survey & Mapping Web GIS

## Dokumen Spesifikasi Produk, Arsitektur, Database, API, dan Roadmap Implementasi

**Versi dokumen:** 1.0\
**Status:** Rancangan awal untuk ditinjau AI agent sebelum implementasi\
**Nama proyek:** ISMW (Integrated Survey & Mapping Web GIS)\
**Jenis aplikasi:** Web GIS untuk manajemen survei dan pemetaan\
**Pendekatan:** Build from scratch dengan memanfaatkan library dan
komponen open-source

------------------------------------------------------------------------

## 0. Instruksi penting untuk AI agent

Dokumen ini adalah **spesifikasi acuan utama** proyek. Sebelum menulis
atau mengubah kode:

1.  Baca seluruh dokumen ini terlebih dahulu.
2.  Periksa repository dan lingkungan kerja yang tersedia. Jangan
    mengasumsikan bahwa struktur, framework, atau kode yang disebutkan
    sudah ada.
3.  Buat ringkasan pemahaman tentang tujuan aplikasi, arsitektur, modul,
    model data, API, batasan, serta urutan implementasi.
4.  Identifikasi keputusan yang belum ditentukan dan potensi konflik
    teknis. Ajukan pertanyaan hanya jika keputusan tersebut benar-benar
    menghalangi implementasi.
5.  Buat rencana implementasi bertahap dan daftar file yang akan
    dibuat/diubah.
6.  Jangan langsung membangun seluruh sistem dalam satu langkah.
    Implementasikan per fase/sprint, jalankan pemeriksaan, dan laporkan
    hasil setiap fase.
7.  Jangan mengarang integrasi dengan sistem pemerintah atau layanan
    eksternal yang belum memiliki akses, dokumentasi, kredensial, dan
    izin.
8.  Gunakan data dummy atau data geospasial publik untuk pengembangan
    dan pengujian.
9.  Jangan menggunakan, mengunggah, atau menyalin data pertanahan
    internal/rahasia tanpa izin tertulis dan otorisasi yang sesuai.
10. Jika ada keputusan yang lebih baik daripada rancangan ini, jelaskan
    alasannya dan ajukan perubahan sebelum mengubah fondasi arsitektur.

**Tahap pertama yang diminta:** lakukan analisis repository dan
spesifikasi, lalu berikan *implementation plan*. Jangan mulai
implementasi fitur bisnis sebelum pemahaman dan rencana tersebut
disetujui.

------------------------------------------------------------------------

# 1. Ringkasan proyek

ISMW adalah aplikasi Web GIS terpadu untuk mendukung alur kerja survei
dan pemetaan. Aplikasi menggabungkan pengelolaan proyek survei,
pengumpulan titik koordinat, pengelolaan bidang tanah, visualisasi dan
editing data spasial, validasi geometri/topologi, dokumentasi foto
geotagging, serta pelaporan.

Aplikasi ini bukan sekadar peta interaktif dan bukan pengganti sistem
resmi pertanahan. ISMW merupakan sistem pendukung untuk data dan proses
kerja yang diotorisasi.

### 1.1 Tujuan utama

-   Mengelola proyek dan area kerja survei.
-   Mengelola kegiatan survei dan penugasan petugas.
-   Mengumpulkan dan menyimpan titik hasil pengukuran.
-   Menampilkan layer spasial pada peta interaktif.
-   Membuat dan mengedit geometri bidang tanah.
-   Mengelola atribut bidang tanah dan status verifikasi.
-   Menyimpan foto serta metadata geotagging.
-   Memeriksa kualitas geometri dan relasi spasial.
-   Menghasilkan laporan serta mengekspor data.

### 1.2 Pengguna dan peran

  -----------------------------------------------------------------------
  Peran                               Tanggung jawab
  ----------------------------------- -----------------------------------
  Administrator                       Mengelola pengguna, role,
                                      konfigurasi, dan seluruh proyek
                                      sesuai kewenangan

  Surveyor                            Mengelola kegiatan survei,
                                      memasukkan titik, geometri, dan
                                      dokumentasi lapangan

  GIS Analyst                         Mengelola layer, mengolah geometri,
                                      menjalankan validasi dan analisis
                                      spasial

  Supervisor                          Memantau pekerjaan, memeriksa
                                      hasil, dan melakukan
                                      verifikasi/approval
  -----------------------------------------------------------------------

Akses harus dibatasi berdasarkan role dan, jika relevan, keanggotaan
proyek. Role global tidak boleh otomatis memberikan akses ke semua data
proyek jika kebijakan proyek membatasi akses.

### 1.3 Prinsip domain dan status

-   Data hasil pengukuran, data yang telah diperiksa, dan data yang
    telah disetujui harus dibedakan.
-   Simpan sumber data, metode pengukuran, waktu pencatatan, dan akurasi
    jika tersedia.
-   Jangan menyatakan bahwa data yang dibuat aplikasi otomatis merupakan
    data pertanahan resmi.
-   Klasifikasi seperti KW 4, KW 5, dan KW 6 hanya boleh ditambahkan
    jika definisi, sumber, dan aturan resmi tersedia serta diotorisasi.
    Jangan menyimpulkan kategori tersebut hanya dari bentuk geometri.
-   Status verifikasi harus memiliki alur transisi yang jelas dan
    tercatat dalam audit log.

------------------------------------------------------------------------

# 2. Ruang lingkup produk

## 2.1 Modul utama

### Modul 01 --- Dashboard dan Project Management

Fitur: - Dashboard statistik proyek dan aktivitas. - CRUD proyek. -
Deskripsi, lokasi, CRS, status, tanggal mulai/selesai. - Pengelolaan
area kerja. - Penugasan anggota dan peran dalam proyek. - Ringkasan
progres survei dan hasil validasi. - Riwayat aktivitas proyek.

### Modul 02 --- GIS Map Viewer

Fitur: - Peta interaktif. - Basemap switching. - Pengelolaan layer
(tampil/sembunyi, urutan, opacity). - Menampilkan titik, garis, polygon,
dan GeoJSON. - Popup informasi fitur. - Pencarian koordinat dan fitur. -
Kontrol zoom dan extent. - Pengukuran jarak dan luas. - Legenda dan
informasi CRS. - Dukungan layer dari sumber yang diizinkan.

### Modul 03 --- Survey Management

Fitur: - CRUD kegiatan survei. - Hubungan survei dengan proyek dan
petugas. - Tanggal, metode, status, dan catatan survei. - Pengelolaan
area survei. - Pengumpulan titik koordinat. - Penyimpanan kode titik,
sumber pengukuran, akurasi, elevasi jika tersedia, dan waktu
pengukuran. - Dokumentasi hasil kegiatan.

Metode pengukuran dan informasi akurasi tidak boleh diasumsikan. Simpan
nilai sumber dan metadata sebagaimana benar-benar diberikan
perangkat/pengguna.

### Modul 04 --- Parcel Management

Fitur: - CRUD data bidang tanah. - Kode/nomor bidang dalam lingkup
proyek. - Atribut bidang yang dapat dikonfigurasi. - Digitasi polygon. -
Editing vertex/geometri. - Perhitungan luas dan keliling berdasarkan
CRS/metode yang ditentukan. - Status draft, submitted, reviewed,
approved, atau rejected. - Impor dan ekspor data spasial. - Riwayat
perubahan geometri dan atribut.

Jangan menganggap kode bidang bersifat unik secara global jika aturan
bisnis belum menetapkannya. Minimal, tentukan aturan keunikan dalam
lingkup proyek.

### Modul 05 --- Spatial Analysis dan Validation

Fitur: - Pemeriksaan validitas geometri. - Deteksi polygon yang
overlap. - Deteksi gap berdasarkan area kerja dan aturan topologi yang
didefinisikan. - Pemeriksaan geometri kosong atau tipe geometri yang
tidak sesuai. - Pemeriksaan atribut wajib. - Overlay antar-layer. -
Penyimpanan hasil validasi, aturan, tingkat keparahan, waktu, dan status
penyelesaian.

Penting: - Gap tidak selalu merupakan kesalahan. Gap harus diperiksa
terhadap cakupan area, aturan topologi, toleransi, dan konteks data. -
Overlap juga perlu aturan toleransi dan pengecualian yang eksplisit. -
Jangan otomatis mengubah geometri pengguna untuk "memperbaiki" data
tanpa konfirmasi dan penyimpanan versi sebelumnya. - Validasi awal dapat
menggunakan PostGIS; operasi yang lebih kompleks dapat memakai GDAL/OGR
atau pustaka yang sesuai.

### Modul 06 --- Media dan Geotagging

Fitur: - Upload foto lapangan. - Hubungan foto dengan proyek, survei,
titik, atau bidang. - Penyimpanan lokasi foto jika tersedia. - Waktu
pengambilan jika tersedia. - Deskripsi dan metadata sumber. - Validasi
jenis dan ukuran file. - Penyimpanan file di storage, bukan sebagai blob
besar di tabel utama.

Jangan mengklaim foto memiliki koordinat yang valid hanya karena
pengguna mengunggahnya. Bedakan koordinat dari EXIF, koordinat yang
diinput manual, dan lokasi yang diberikan perangkat. Pertahankan sumber
metadata.

### Modul 07 --- Reporting dan Export

Fitur: - Rekap kegiatan survei. - Rekap bidang tanah. - Rekap titik
koordinat. - Rekap hasil validasi. - Ekspor GeoJSON. - Ekspor CSV/XLSX
untuk data tabular. - Laporan PDF. - Filter berdasarkan proyek, survei,
tanggal, status, dan area jika tersedia.

### Modul 08 --- User dan System Management

Fitur: - Pengelolaan pengguna. - Role dan permission. - Keanggotaan
proyek. - Audit log. - Pengaturan CRS proyek. - Konfigurasi aplikasi. -
Kebijakan file dan backup.

------------------------------------------------------------------------

# 3. Arsitektur teknis

## 3.1 Keputusan arsitektur

Gunakan **modular monolith** untuk backend pada tahap awal. Jangan
memulai dengan microservices. Pisahkan domain melalui package/module
yang memiliki tanggung jawab jelas sehingga sistem dapat dikembangkan
tanpa kompleksitas operasional yang tidak perlu.

Gunakan pendekatan **vertical slice**: implementasikan satu alur fitur
dari frontend sampai database, lalu uji sebelum berpindah ke fitur
berikutnya.

## 3.2 Stack teknologi

  -----------------------------------------------------------------------
  Lapisan                 Teknologi               Tanggung jawab
  ----------------------- ----------------------- -----------------------
  Frontend                React + TypeScript      UI aplikasi

  Styling                 Tailwind CSS            Styling dan layout

  Mapping                 OpenLayers              Peta, layer, interaksi,
                                                  digitasi

  Backend                 Go + Gin                REST API dan business
                                                  logic

  Database                PostgreSQL              Data relasional

  Spatial database        PostGIS                 Geometri dan operasi
                                                  spasial

  Database access         pgx atau database/sql   Akses database dan
                                                  query SQL

  GIS processing          PostGIS, GDAL/OGR       Validasi, konversi,
                                                  analisis

  File storage            Local storage saat      Foto dan dokumen
                          development;            
                          S3-compatible bila      
                          diperlukan              

  Container               Docker Compose          Lingkungan development

  GIS server              GeoServer, opsional     WMS/WFS dan publikasi
                          tahap lanjut            layer

  Version control         Git                     Riwayat perubahan
                                                  source code
  -----------------------------------------------------------------------

### 3.3 Diagram arsitektur

``` mermaid
flowchart TB
    U[User: Admin / Surveyor / GIS Analyst / Supervisor]
    FE[React + TypeScript + Tailwind]
    MAP[OpenLayers Map Engine]
    API[Go + Gin REST API]
    AUTH[Authentication & RBAC]
    MOD[Project / Survey / Parcel / Validation / Reporting Modules]
    PG[(PostgreSQL + PostGIS)]
    FS[(File Storage)]
    GIS[GDAL / OGR]
    GS[GeoServer - Optional]

    U --> FE
    FE --> MAP
    FE <--> API
    API --> AUTH
    API --> MOD
    MOD <--> PG
    MOD <--> FS
    MOD --> GIS
    PG -. Optional map services .-> GS
    GS -. WMS / WFS .-> MAP
```

### 3.4 Prinsip komunikasi

1.  Frontend mengakses backend melalui REST API dengan HTTPS di
    production.
2.  Data fitur spasial dapat dikirim sebagai GeoJSON.
3.  GeoJSON menggunakan koordinat longitude/latitude sesuai RFC 7946
    (WGS 84 / CRS84).
4.  Database dapat menyimpan geometri pada CRS proyek yang ditetapkan.
5.  Backend bertanggung jawab memvalidasi input, melakukan transformasi
    CRS, menjalankan aturan bisnis, dan menghitung nilai spasial yang
    dipercaya.
6.  Frontend tidak menjadi sumber kebenaran untuk luas, status validasi,
    atau otorisasi.
7.  File disimpan di file storage; database menyimpan metadata dan
    referensi file.
8.  GeoServer tidak wajib untuk MVP. Tambahkan hanya jika kebutuhan
    layanan WMS/WFS atau pengelolaan layer memerlukannya.

------------------------------------------------------------------------

# 4. Struktur repository

Gunakan monorepo:

``` text
ismw/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   └── map/
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── surveys/
│   │   │   ├── parcels/
│   │   │   ├── validation/
│   │   │   ├── media/
│   │   │   ├── reports/
│   │   │   └── users/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── cmd/
│   │   └── api/
│   ├── internal/
│   │   ├── config/
│   │   ├── handler/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── middleware/
│   │   ├── domain/
│   │   └── spatial/
│   ├── migrations/
│   ├── pkg/
│   └── go.mod
│
├── database/
│   ├── seeds/
│   └── scripts/
├── storage/
├── docs/
│   ├── architecture/
│   ├── api/
│   └── database/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

Ketentuan: - Jangan membuat package kosong secara berlebihan. - Struktur
dapat disesuaikan jika framework/tooling membutuhkan pola lain, tetapi
pisahkan handler, service, repository, domain, dan spatial processing. -
Jangan menyimpan secret, password, token, atau kredensial dalam
repository. - Sediakan `.env.example` tanpa nilai rahasia. - Sertakan
instruksi setup dan development di README.

------------------------------------------------------------------------

# 5. Rancangan database

Nama database: `ismw_db`.

Gunakan UUID sebagai primary key untuk entitas utama. Gunakan foreign
key, constraint, index, dan migration yang eksplisit.

## 5.1 ERD konseptual

``` mermaid
erDiagram
    USERS ||--o{ PROJECT_MEMBERS : joins
    PROJECTS ||--o{ PROJECT_MEMBERS : has
    PROJECTS ||--o{ SURVEY_AREAS : defines
    PROJECTS ||--o{ SURVEYS : contains
    PROJECTS ||--o{ PARCELS : contains
    SURVEYS ||--o{ SURVEY_POINTS : collects
    SURVEYS ||--o{ PARCELS : produces
    PARCELS ||--o{ PARCEL_PHOTOS : has
    PARCELS ||--o{ PARCEL_DOCUMENTS : has
    PARCELS ||--o{ PARCEL_VERSIONS : tracks
    PARCELS ||--o{ VALIDATION_RESULTS : checked
    USERS ||--o{ AUDIT_LOGS : performs
    PROJECTS ||--o{ AUDIT_LOGS : records

    USERS {
        uuid id PK
        string name
        string email
        string password_hash
        timestamp created_at
    }
    PROJECTS {
        uuid id PK
        string name
        string description
        string location
        integer crs_epsg
        string status
    }
    PROJECT_MEMBERS {
        uuid project_id FK
        uuid user_id FK
        string project_role
    }
    SURVEY_AREAS {
        uuid id PK
        uuid project_id FK
        geometry boundary
    }
    SURVEYS {
        uuid id PK
        uuid project_id FK
        uuid surveyor_id FK
        date survey_date
        string method
        string status
    }
    SURVEY_POINTS {
        uuid id PK
        uuid survey_id FK
        string point_code
        geometry location
        numeric accuracy_m
        timestamp recorded_at
    }
    PARCELS {
        uuid id PK
        uuid project_id FK
        uuid survey_id FK
        string parcel_code
        geometry boundary
        string verification_status
    }
    PARCEL_PHOTOS {
        uuid id PK
        uuid parcel_id FK
        string file_path
        geometry location
        timestamp captured_at
    }
    PARCEL_DOCUMENTS {
        uuid id PK
        uuid parcel_id FK
        string file_path
        string document_type
    }
    PARCEL_VERSIONS {
        uuid id PK
        uuid parcel_id FK
        integer version_number
        geometry boundary
    }
    VALIDATION_RESULTS {
        uuid id PK
        uuid parcel_id FK
        string rule_code
        string severity
        string status
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        timestamp created_at
    }
```

ERD tersebut merupakan gambaran konseptual. AI agent harus menghasilkan
migration SQL yang lengkap, termasuk kolom audit, constraint, index, dan
relasi yang diperlukan.

## 5.2 Tabel inti

  Tabel                  Fungsi
  ---------------------- --------------------------------
  `users`                Akun pengguna
  `roles`                Role sistem
  `permissions`          Hak akses granular
  `user_roles`           Relasi pengguna dan role
  `projects`             Proyek survei
  `project_members`      Anggota dan peran per proyek
  `survey_areas`         Batas area kerja
  `surveys`              Kegiatan survei
  `survey_points`        Titik hasil pengukuran
  `parcels`              Bidang tanah
  `parcel_photos`        Foto bidang/lapangan
  `parcel_documents`     Dokumen pendukung
  `parcel_versions`      Riwayat versi geometri/atribut
  `validation_results`   Hasil pemeriksaan spasial
  `audit_logs`           Riwayat aktivitas pengguna

Tabel tambahan boleh dibuat untuk workflow approval, layer catalog,
import jobs, export jobs, dan konfigurasi atribut jika kebutuhan
implementasi sudah jelas.

## 5.3 Kolom utama yang direkomendasikan

### `projects`

-   `id UUID PRIMARY KEY`
-   `name VARCHAR NOT NULL`
-   `description TEXT`
-   `location VARCHAR`
-   `crs_epsg INTEGER NOT NULL`
-   `status VARCHAR NOT NULL`
-   `start_date DATE`
-   `end_date DATE`
-   `created_by UUID`
-   `created_at TIMESTAMPTZ`
-   `updated_at TIMESTAMPTZ`

### `surveys`

-   `id UUID PRIMARY KEY`
-   `project_id UUID NOT NULL`
-   `surveyor_id UUID`
-   `name VARCHAR NOT NULL`
-   `survey_date DATE`
-   `method VARCHAR`
-   `status VARCHAR NOT NULL`
-   `notes TEXT`
-   `created_at TIMESTAMPTZ`
-   `updated_at TIMESTAMPTZ`

### `survey_points`

-   `id UUID PRIMARY KEY`
-   `survey_id UUID NOT NULL`
-   `point_code VARCHAR NOT NULL`
-   `location geometry(Point, SRID)` --- SRID harus konsisten dengan
    kebijakan penyimpanan proyek atau ditangani melalui strategi CRS
    yang eksplisit.
-   `accuracy_m NUMERIC`
-   `elevation_m NUMERIC`
-   `source VARCHAR`
-   `recorded_at TIMESTAMPTZ`
-   `created_by UUID`

### `parcels`

-   `id UUID PRIMARY KEY`
-   `project_id UUID NOT NULL`
-   `survey_id UUID`
-   `parcel_code VARCHAR NOT NULL`
-   `land_use VARCHAR`
-   `area_m2 NUMERIC`
-   `boundary geometry(MultiPolygon, SRID)`
-   `verification_status VARCHAR NOT NULL`
-   `created_by UUID`
-   `updated_by UUID`
-   `created_at TIMESTAMPTZ`
-   `updated_at TIMESTAMPTZ`

Tentukan apakah geometri disimpan dalam CRS proyek atau CRS standar
internal. Jangan mencampur SRID pada kolom yang sama. Jika proyek dapat
memakai CRS berbeda, desain strategi penyimpanan secara
eksplisit---misalnya geometri disimpan pada CRS proyek per
dataset/layer, atau disimpan pada satu CRS internal yang disepakati
dengan metadata CRS sumber. Jangan mengasumsikan satu EPSG berlaku untuk
semua wilayah Indonesia.

### `parcel_photos`

-   `id UUID PRIMARY KEY`
-   `parcel_id UUID NOT NULL`
-   `file_path TEXT NOT NULL`
-   `mime_type VARCHAR`
-   `file_size_bytes BIGINT`
-   `location geometry(Point, SRID)` nullable
-   `location_source VARCHAR` nullable (EXIF, device, manual, atau
    sumber lain)
-   `captured_at TIMESTAMPTZ` nullable
-   `description TEXT`
-   `uploaded_by UUID`
-   `created_at TIMESTAMPTZ`

### `validation_results`

-   `id UUID PRIMARY KEY`
-   `parcel_id UUID`
-   `project_id UUID NOT NULL`
-   `rule_code VARCHAR NOT NULL`
-   `severity VARCHAR NOT NULL`
-   `status VARCHAR NOT NULL`
-   `message TEXT`
-   `details JSONB`
-   `checked_at TIMESTAMPTZ`
-   `checked_by UUID`

### `parcel_versions`

Simpan snapshot geometri dan atribut yang relevan, nomor versi, pengguna
yang mengubah, waktu perubahan, dan alasan perubahan. Riwayat versi
tidak boleh hanya mengganti geometri lama tanpa menyimpan snapshot
sebelumnya.

## 5.4 Index dan constraint spasial

-   Buat GiST index untuk kolom geometry yang sering digunakan dalam
    query spasial.
-   Buat index pada foreign key dan kolom pencarian/status.
-   Tambahkan unique constraint untuk `parcel_code` sesuai lingkup
    bisnis, minimal `(project_id, parcel_code)` jika memang aturan
    tersebut berlaku.
-   Pastikan SRID dan tipe geometri konsisten.
-   Gunakan constraint dan validasi aplikasi secara bersama-sama.
-   Pertimbangkan soft delete hanya jika kebutuhan audit dan kebijakan
    retensi memerlukannya; jangan menghapus data secara permanen tanpa
    aturan yang jelas.

Contoh SQL ilustratif (SRID harus disesuaikan dengan strategi proyek):

``` sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX IF NOT EXISTS idx_parcels_boundary
ON parcels USING GIST (boundary);

CREATE INDEX IF NOT EXISTS idx_survey_points_location
ON survey_points USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_parcels_project_id
ON parcels (project_id);

CREATE INDEX IF NOT EXISTS idx_parcels_status
ON parcels (verification_status);
```

## 5.5 CRS dan perhitungan spasial

Aturan wajib: - GeoJSON yang dikirim melalui API mengikuti RFC 7946 dan
koordinat WGS 84/CRS84 dalam urutan longitude, latitude. - Database
harus menyimpan geometri dengan SRID yang jelas dan konsisten. - Proyek
harus menyimpan metadata CRS. - Transformasi koordinat dilakukan secara
eksplisit menggunakan `ST_Transform()` atau library yang tepat. -
Perhitungan luas/jarak harus menggunakan CRS proyeksi yang sesuai atau
metode geodesik yang tepat. - Jangan menggunakan satu EPSG UTM untuk
seluruh Indonesia. - Jangan menghitung luas metrik langsung dari
longitude/latitude dalam derajat.

Contoh ilustratif:

``` sql
SELECT
    id,
    ST_IsValid(boundary) AS is_valid
FROM parcels;

-- Contoh saja: EPSG:32750 hanya cocok untuk wilayah/zona tertentu.
SELECT
    id,
    ST_Area(ST_Transform(boundary, 32750)) AS area_m2
FROM parcels;
```

Backend harus menentukan SRID tujuan berdasarkan lokasi dan kebijakan
proyek, bukan menyalin angka contoh secara universal. Nilai luas yang
disimpan harus dihitung ulang oleh backend.

------------------------------------------------------------------------

# 6. Rancangan REST API

Gunakan prefix `/api/v1`. Dokumentasikan API dengan OpenAPI/Swagger
setelah endpoint inti terbentuk.

  Modul             Endpoint                          Method
  ----------------- --------------------------------- ----------------------------------
  Auth              `/api/v1/auth/login`              POST
  Auth              `/api/v1/auth/refresh`            POST, jika memakai refresh token
  Auth              `/api/v1/auth/logout`             POST
  Users             `/api/v1/users`                   GET, POST
  Projects          `/api/v1/projects`                GET, POST
  Projects          `/api/v1/projects/:id`            GET, PUT, DELETE
  Project members   `/api/v1/projects/:id/members`    GET, POST
  Surveys           `/api/v1/surveys`                 GET, POST
  Surveys           `/api/v1/surveys/:id`             GET, PUT
  Survey points     `/api/v1/surveys/:id/points`      GET, POST
  Parcels           `/api/v1/parcels`                 GET, POST
  Parcels           `/api/v1/parcels/:id`             GET, PUT, DELETE
  Parcel geometry   `/api/v1/parcels/:id/geometry`    PUT
  Map features      `/api/v1/projects/:id/features`   GET
  Validation        `/api/v1/parcels/:id/validate`    POST
  Photos            `/api/v1/parcels/:id/photos`      GET, POST
  Reports           `/api/v1/reports`                 GET, POST
  Export            `/api/v1/projects/:id/export`     GET

Endpoint di atas adalah rancangan awal. Agent harus menentukan
request/response schema, pagination, filter, sorting, error format,
authorization, dan transaksi database secara konsisten.

### 6.1 Contoh GeoJSON response

``` json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [116.5, -8.5],
            [116.501, -8.5],
            [116.501, -8.501],
            [116.5, -8.501],
            [116.5, -8.5]
          ]
        ]
      },
      "properties": {
        "id": "00000000-0000-0000-0000-000000000001",
        "parcel_code": "PAR-001",
        "land_use": "Residential",
        "verification_status": "draft"
      }
    }
  ]
}
```

Koordinat di atas adalah data dummy. API harus mengembalikan koordinat
dalam format yang benar dan tidak menambahkan CRS nonstandar ke GeoJSON
RFC 7946.

### 6.2 Alur penyimpanan geometri

``` mermaid
flowchart TD
    A[User digitizes polygon in OpenLayers] --> B[Frontend creates GeoJSON]
    B --> C[POST/PUT geometry to REST API]
    C --> D[Go validates payload and authorization]
    D --> E[Transform to storage CRS if required]
    E --> F[PostGIS checks geometry type and validity]
    F --> G{Valid and allowed?}
    G -->|No| H[Return structured validation errors]
    H --> A
    G -->|Yes| I[Save new parcel version and geometry]
    I --> J[Calculate authoritative area]
    J --> K[Commit transaction]
    K --> L[Return normalized GeoJSON and properties]
    L --> M[Refresh map feature]
```

Simpan versi geometri sebelumnya dan perubahan baru dalam transaksi yang
konsisten. Jangan menimpa versi lama sebelum snapshot berhasil disimpan.

------------------------------------------------------------------------

# 7. Keamanan, audit, dan integritas data

Keamanan harus dibangun sejak awal, bukan ditambahkan menjelang
deployment.

Persyaratan: - Password disimpan menggunakan password hashing yang kuat,
bukan plaintext. - Gunakan session/token strategy yang aman; jangan
menyimpan token sensitif secara sembarangan di browser. - Authentication
dan authorization diterapkan pada setiap endpoint privat. - Terapkan
RBAC dan pemeriksaan keanggotaan proyek. - Validasi file upload: MIME
type, ukuran, ekstensi, dan nama file; jangan mempercayai nama file dari
pengguna. - Cegah SQL injection dengan parameterized query. - Batasi
CORS ke origin yang diizinkan. - Gunakan HTTPS pada production. - Simpan
secret di environment/secret manager. - Catat aktivitas penting: create,
update, delete, import, export, approve, reject, dan perubahan
geometri. - Audit log harus menyimpan aktor, waktu, entitas, tindakan,
serta konteks perubahan yang aman. - Sediakan backup database dan file
storage serta prosedur restore yang diuji. - Jangan memasukkan password,
token, atau data pribadi sensitif ke log.

### Workflow status yang disarankan

Contoh status bidang: - `draft` - `submitted` - `under_review` -
`approved` - `rejected`

Transisi status harus dikontrol oleh service/backend berdasarkan role
dan aturan workflow. Perubahan status dan alasan keputusan dicatat di
audit log. Jangan menganggap semua perubahan otomatis disetujui.

------------------------------------------------------------------------

# 8. Roadmap implementasi

Estimasi awal 10--14 minggu untuk pengerjaan mandiri yang konsisten. Ini
perkiraan, bukan jaminan durasi.

## Sprint 1 --- Project Foundation

Tugas: - Periksa dan siapkan repository. - Buat struktur monorepo. -
Setup React + TypeScript + Tailwind. - Setup Go + Gin. - Setup
PostgreSQL + PostGIS via Docker Compose. - Buat konfigurasi
environment. - Buat migration awal. - Hubungkan backend ke database. -
Buat endpoint `GET /health`.

Deliverable: - Frontend dapat dijalankan. - Backend dapat dijalankan. -
PostgreSQL/PostGIS berjalan. - Backend berhasil melakukan ping ke
database. - Health endpoint mengembalikan status layanan.

## Sprint 2 --- GIS Map Viewer

Tugas: - Integrasi OpenLayers ke React. - Tampilkan basemap yang sumber
dan syarat penggunaannya jelas. - Tambahkan zoom, pan, dan extent. -
Tampilkan layer GeoJSON dummy. - Tambahkan layer controls. - Tambahkan
popup fitur. - Tampilkan koordinat kursor dan informasi CRS.

Deliverable: - Peta interaktif dengan layer bidang tanah dummy.

## Sprint 3 --- Project dan Survey Management

Tugas: - CRUD proyek. - Keanggotaan proyek. - CRUD kegiatan survei. -
Area kerja survei. - Pengumpulan dan penyimpanan titik koordinat. -
Filter proyek dan survei.

Deliverable: - Pengguna dapat membuat proyek/survei dan menyimpan titik
koordinat.

## Sprint 4 --- Parcel Management

Tugas: - CRUD bidang tanah. - Atribut bidang. - Digitasi polygon. -
Editing vertex. - Simpan dan baca geometri dari PostGIS. - Perhitungan
luas di backend. - Popup dan tabel atribut.

Deliverable: - Bidang tanah dapat dibuat, diedit, disimpan, dan
ditampilkan kembali.

## Sprint 5 --- Spatial Validation

Tugas: - Pemeriksaan `ST_IsValid`. - Pemeriksaan tipe dan SRID
geometri. - Deteksi overlap dengan toleransi/aturan yang
terdokumentasi. - Pemeriksaan gap berdasarkan area kerja dan aturan yang
didefinisikan. - Pemeriksaan atribut wajib. - Simpan hasil validasi. -
Tampilkan hasil dan lokasi kesalahan pada peta.

Deliverable: - Modul validasi yang menghasilkan temuan dapat ditinjau
pengguna.

## Sprint 6 --- Geotagging dan Reporting

Tugas: - Upload foto dan metadata. - Relasi foto dengan
survei/titik/bidang. - Validasi file. - Laporan survei. - Rekap bidang
dan validasi. - Ekspor GeoJSON dan CSV. - Ekspor PDF.

Deliverable: - Dokumentasi lapangan dan laporan dapat dibuat.

## Sprint 7 --- Security dan Production Readiness

Tugas: - Authentication. - RBAC dan project-level authorization. - Audit
log. - Version history. - Automated tests. - Error handling dan
logging. - Docker production setup. - Backup dan restore. - Dokumentasi
deployment.

Deliverable: - MVP yang aman untuk demonstrasi dengan data dummy/publik.

------------------------------------------------------------------------

# 9. Kriteria penerimaan MVP

MVP belum dianggap selesai hanya karena halaman dapat dibuka. Seluruh
alur berikut harus berhasil:

1.  Administrator membuat proyek.
2.  Administrator menambahkan anggota proyek.
3.  Surveyor membuat kegiatan survei.
4.  Surveyor memasukkan titik koordinat.
5.  Surveyor mendigitasi polygon bidang tanah.
6.  Backend memvalidasi geometri dan menghitung luas menggunakan
    metode/CRS yang benar.
7.  Sistem menyimpan geometri dan riwayat versinya.
8.  Surveyor mengunggah foto dan metadata sumber lokasinya.
9.  GIS Analyst menjalankan validasi spasial.
10. Supervisor memeriksa dan mengubah status sesuai kewenangan.
11. Sistem menghasilkan laporan dan ekspor data.
12. Semua tindakan penting tercatat di audit log.

### Kriteria teknis

-   Migration dapat dijalankan dari database kosong.
-   Seed data hanya berisi data dummy.
-   Frontend dan backend dapat dijalankan sesuai README.
-   Endpoint memiliki validasi dan error response konsisten.
-   Operasi spasial menggunakan SRID yang benar.
-   Data yang tidak valid tidak diam-diam diterima.
-   Akses lintas proyek yang tidak diizinkan ditolak.
-   Tes unit dan integrasi untuk fungsi penting tersedia.
-   Tidak ada secret atau kredensial di repository.

------------------------------------------------------------------------

# 10. Fitur yang ditunda dari MVP

Jangan implementasikan fitur berikut sebelum fondasi dan MVP stabil:

-   Integrasi langsung ke KKP atau sistem internal ATR/BPN.
-   Integrasi GPS perangkat secara real-time.
-   Offline field survey dan sinkronisasi konflik.
-   Pengolahan citra satelit.
-   AI untuk deteksi batas bidang.
-   Microservices dan message broker.
-   GeoServer/WMS/WFS kompleks.
-   Otomatisasi klasifikasi KW 4/5/6 tanpa aturan dan data resmi.

Fitur tersebut dapat dipertimbangkan untuk versi berikutnya berdasarkan
kebutuhan, akses, dan evaluasi teknis.

------------------------------------------------------------------------

# 11. Referensi teknis dan repository

Gunakan dokumentasi resmi sebagai sumber utama:

  Teknologi             Dokumentasi
  --------------------- --------------------------------------------
  OpenLayers            https://openlayers.org/en/latest/doc/
  OpenLayers Examples   https://openlayers.org/en/latest/examples/
  PostgreSQL            https://www.postgresql.org/docs/
  PostGIS               https://postgis.net/documentation/
  Go                    https://go.dev/doc/
  Gin                   https://gin-gonic.com/docs/
  GeoServer             https://docs.geoserver.org/
  GDAL                  https://gdal.org/en/stable/
  GeoJSON RFC 7946      https://www.rfc-editor.org/rfc/rfc7946

Repository untuk dipelajari sebagai referensi, bukan untuk disalin
seluruhnya: - OpenLayers: https://github.com/openlayers/openlayers -
MapStore2: https://github.com/geosolutions-it/MapStore2 - GeoNode:
https://github.com/GeoNode/geonode - GeoServer:
https://github.com/geoserver/geoserver

Periksa lisensi dan ketentuan atribusi setiap dependency/repository
sebelum digunakan atau didistribusikan.

------------------------------------------------------------------------

# 12. Instruksi cara kerja AI agent

AI agent harus bekerja dengan aturan berikut:

## Sebelum implementasi

-   Baca dokumen ini secara keseluruhan.
-   Audit repository yang tersedia.
-   Identifikasi bahasa, framework, dependency, struktur folder, dan
    status implementasi.
-   Jangan menghapus atau menimpa pekerjaan yang sudah ada tanpa alasan
    dan persetujuan.
-   Buat rencana implementasi dan daftar risiko.

## Saat implementasi

-   Kerjakan satu sprint atau vertical slice pada satu waktu.
-   Utamakan kode yang sederhana, terbaca, dan mudah diuji.
-   Hindari dependency yang tidak diperlukan.
-   Gunakan migration untuk perubahan schema.
-   Gunakan data dummy untuk seed.
-   Buat test untuk business logic dan operasi spasial penting.
-   Jangan menaruh business logic di handler atau komponen UI.
-   Jangan meng-hardcode secret, CRS universal, atau data operasional.
-   Dokumentasikan keputusan teknis yang menyimpang dari dokumen ini.

## Setelah setiap sprint

Laporkan: 1. Fitur yang selesai. 2. File/folder yang dibuat atau diubah.
3. Migration dan perubahan database. 4. Endpoint yang tersedia. 5. Test
yang dijalankan dan hasilnya. 6. Cara menjalankan/menguji fitur. 7.
Masalah yang belum selesai. 8. Risiko atau keputusan yang memerlukan
persetujuan.

Jangan menyatakan fitur selesai jika hanya membuat UI statis atau
mockup. Tandai secara jujur apakah fitur berupa UI prototype, terhubung
ke API, atau sudah teruji end-to-end.

## Tahap pertama yang harus dilakukan sekarang

**Jangan langsung mengimplementasikan semua modul.**

Mulailah dengan: 1. Membaca dokumen ini. 2. Memeriksa
repository/workspace. 3. Menyusun ringkasan pemahaman sistem. 4.
Menyusun implementation plan Sprint 1. 5. Menyebutkan asumsi, risiko,
dan keputusan yang masih perlu dikonfirmasi.

Setelah rencana ditinjau, implementasikan Sprint 1 secara bertahap.

------------------------------------------------------------------------

**Akhir dokumen spesifikasi ISMW v1.0**
