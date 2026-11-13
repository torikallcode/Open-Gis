# ADR-0002 — Semantik versi bidang tanah

**Status:** Diterima untuk Sprint 4
**Tanggal:** 2026-11-13

## Konteks

Spesifikasi mewajibkan riwayat perubahan geometri dan atribut bidang tanah, dan
melarang menimpa versi lama sebelum snapshot berhasil disimpan (§5.3, §6.2).
Dibutuhkan keputusan apakah `parcel_versions` menyimpan snapshot *sebelum*
perubahan, *sesudah* perubahan, atau keduanya.

## Keputusan

`parcel_versions` menyimpan **snapshot penuh setiap keadaan** bidang:

1. Saat bidang dibuat, versi 1 = keadaan awal.
2. Setiap mutasi (atribut, geometri, status) menaikkan `parcels.current_version`
   dan menambahkan tepat satu baris versi baru berisi keadaan setelah perubahan.
3. Baris versi bersifat **immutable**; tidak ada update/delete melalui API.
4. Snapshot mencakup kode, penggunaan lahan, catatan, `attributes`, `boundary`
   (MultiPolygon 4326), `area_m2`, dan `verification_status`, plus
   `change_reason`, `changed_by`, dan `created_at`.
5. Mutasi bidang, penambahan versi, dan audit log berada dalam satu transaksi.

## Konsekuensi

**Positif**
- Tidak perlu menulis "before" dan "after" sekaligus; versi sebelumnya sudah ada
  dan tidak pernah berubah.
- Riwayat lengkap dapat direkonstruksi kapan saja (`GET /parcels/:id/versions`).
- Konsisten untuk perubahan atribut maupun geometri.

**Negatif**
- Penyimpanan tumbuh sebesar satu snapshot per perubahan (geometri + JSONB).
- Riwayat versi bukan pengganti audit log; keduanya tetap ditulis.

## Alternatif yang ditolak

1. **Hanya menyimpan snapshot sebelum perubahan** — versi terbaru tidak punya
   baris versi sendiri, sehingga "current version" tidak dapat direkonstruksi
   dari tabel versi.
2. **Menyimpan diff geometri** — kompleks, rawan, dan sulit diaudit.
3. **Menunda versi ke Sprint 7** — melanggar aturan §6.2 saat editing geometri
   sudah tersedia di Sprint 4.
