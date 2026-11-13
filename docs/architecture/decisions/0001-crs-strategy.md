# ADR-0001 — Strategi CRS dan penyimpanan geometri

**Status:** Diterima untuk Sprint 1 (menentukan tabel spasial Sprint 3–4)
**Tanggal:** 2026-11-13

## Konteks

Spesifikasi menulis kolom geometri sebagai `geometry(Point, SRID)` dan
`geometry(MultiPolygon, SRID)` dengan "SRID proyek". Setiap proyek dapat memakai
CRS yang berbeda, sedangkan **satu kolom PostGIS hanya mendukung satu SRID**.
Menetapkan SRID per baris tidak mungkin tanpa memecah tabel per proyek.

Spesifikasi juga melarang:
- menghitung luas/jarak dari koordinat derajat,
- mengasumsikan satu EPSG UTM berlaku untuk seluruh Indonesia,
- mencampur SRID pada kolom yang sama.

## Keputusan

1. **Penyimpanan:** semua kolom geometri memakai **EPSG:4326** (SRID tetap,
   konsisten, sesuai GeoJSON RFC 7946).
2. **Metadata CRS:** `projects.crs_epsg` menyimpan CRS proyeksi metrik untuk
   perhitungan luas/panjang.
3. **Perhitungan:** backend menghitung nilai otoritatif, contoh:
   `ST_Area(ST_Transform(boundary, p.crs_epsg))`. Hasil disimpan di `area_m2`
   beserta `area_method`.
4. **Validasi:** `crs_epsg` wajib mereferensikan `spatial_ref_sys` (FK) dan
   **tidak boleh CRS geografis**. Pemeriksaan proyeksi dilakukan di service
   (bukan hanya CHECK), karena tipe proyeksi bergantung metadata PROJ.
5. **API:** GeoJSON selalu WGS 84 / CRS84, urutan `longitude, latitude`, tanpa
   anggota `crs` nonstandar. Frontend tidak pernah mengirim luas.

## Konsekuensi

**Positif**
- Satu skema untuk semua proyek; tidak ada migrasi tabel saat proyek baru
  memakai CRS berbeda.
- Pertukaran data konsisten dengan RFC 7946 dan OpenLayers.
- Asal nilai luas dapat diaudit (`area_method`, `crs_epsg` proyek).

**Negatif / risiko**
- Setiap query metrik harus `ST_Transform`; index GiST pada 4326 tidak membantu
  query berbasis jarak metrik. Jika kebutuhan analitik berkembang, tambahkan
  kolom geometry terproyeksi atau materialized view per CRS.
- Transformasi bergantung pada `spatial_ref_sys`/PROJ yang terpasang.
- `crs_epsg` wajib diisi dengan CRS proyeksi yang tepat; default otomatis per
  lokasi tidak boleh ditebak backend.

## Alternatif yang ditolak

1. **SRID proyek per baris** — tidak didukung PostGIS.
2. **Tabel/partisi per CRS** — kompleks, menyulitkan query lintas proyek.
3. **Menyimpan hanya 4326 dan menghitung luas geodesik** — `ST_Area(geography)`
   kurang tepat untuk bidang tanah berskala kecil dan tidak memberi kontrol
   terhadap CRS proyek.
