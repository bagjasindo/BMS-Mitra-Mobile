# BMS Mitra Mobile — Status Audit Berkelanjutan

**Audit terbaru:** 2026-10-09 (WIB)  
**Repository:** `bagjasindo/BMS-Mitra-Mobile`, branch `main`  
**Target:** Build 2386-classic-restored  
**Database:** Supabase project `mqqrfhwqgcpkjeaasdsr`  
**Metode audit ini:** pembacaan kode/dokumen GitHub, query SELECT dan advisor Supabase. **Tidak melakukan transaksi uji, mutasi database, ataupun mengubah aplikasi.** File ini adalah catatan audit, bukan sertifikat PASS end-to-end.

## Cara menggunakan catatan di chat berikutnya
1. Baca `AUDIT_STATUS.md` lalu `AUDIT_HULU_HILIR_LOCK_20261003.md` dan `LOCKED_BUSINESS_RULES.md`.
2. Periksa commit terbaru. Gunakan temuan PASS di bawah sebagai baseline **pada tanggal dan cakupan yang tercantum**.
3. Jangan mengulang seluruh audit tanpa adanya perubahan relevan, insiden, atau permintaan eksplisit; lakukan pengujian dampak pada bagian yang berubah.
4. Status **PASS pengguna**, **PASS query live**, **PASS test otomatis**, dan **BELUM DIUJI** tidak boleh dicampur.
5. Jangan mengubah tema Desktop klasik, alur kerja pengguna, SOP peran, data historis, atau aturan bisnis yang terkunci tanpa persetujuan.
6. Setelah perubahan baru, tambahkan hasil audit, tanggal, jenis pengujian, dan bukti/commit di dokumen ini.

## 1. Hasil PASS TERBATAS — Database live (SELECT, 2026-10-09)
| Pemeriksaan | Hasil | Status |
|---|---:|---|
| RLS pada seluruh tabel basis data `public` | 81 dari 81 aktif | **PASS (cakupan RLS enablement)** |
| Duplikasi `finance_expedition_invoices.invoice_number` | 0 | **PASS** |
| Orphan `finance_expedition_invoice_items` → invoice/trip | 0 | **PASS** |
| Orphan `finance_expedition_payments` → invoice | 0 | **PASS** |
| Kandang dengan lebih dari satu assignment aktif (`logistics_contract_assignments`) | 0 | **PASS** |
| Recording mortalitas/culling/feed_kg negatif (`recordings`) | 0 | **PASS** |
| Quantity/quantity_kg pengiriman negatif (`logistics_shipment_items`) | 0 | **PASS** |

Catatan: RLS ENABLED **bukan** bukti seluruh kebijakan keamanan sudah benar; tidak ada duplikasi/orphan **bukan** bukti seluruh perhitungan keuangan konsisten.

## 2. Temuan terbuka — jangan tandai PASS
### Keamanan Supabase advisor (2026-10-09)
- **37 WARN** `authenticated_security_definer_function_executable`: perlu review pemeriksaan peran/objek masing-masing RPC. Jangan mencabut izin `authenticated` secara massal.
- **1 WARN** `auth_leaked_password_protection`: opsi platform Auth memerlukan penanganan tersendiri.
- **4 INFO** `rls_enabled_no_policy`: evaluasi apakah sengaja deny-by-default untuk tabel internal.
- Delapan fungsi `SECURITY DEFINER` yang sebelumnya callable oleh `anon` **sudah ditutup izin anon** dan akses `authenticated` tetap aktif (perbaikan 2026-10-09, diverifikasi query dan security advisor). Ini bukan bukti pengujian transaksi per akun.

### Performa Supabase advisor (2026-10-09)
- **13 WARN** `multiple_permissive_policies`: evaluasi biaya query dan cakupan policy, jangan menggabungkan policy tanpa regresi izin.
- **14 INFO** `no_primary_key` (snapshot/rollback `private` pada advisor sebelumnya).
- **81 INFO** `unused_index`; jangan hapus indeks otomatis.
- `unindexed_foreign_keys` sudah hilang setelah indeks `finance_cash_request_items(request_id)` ditambahkan (2026-10-09).

### Belum cukup bukti untuk PASS end-to-end
- Fungsi transaksi penuh **setiap peran** (ADMIN, OWNER, KEUANGAN, LOGISTIK, MARKETING, PPL) sedang diuji pengguna secara bertahap; belum ada matriks per-fitur/per-peran terarsip.
- Pencocokan seluruh angka **Arus Kas, Piutang/Hutang, RHPP, dan Laba Rugi Global** dengan transaksi sumber belum dijalankan ulang dalam audit ini.
- Tidak ada pengujian load 1.000–10.000 transaksi, pemulihan backup terbaru, atau test browser langsung pada audit ini.
- Tidak ada hasil aktual `npm run check` / `npm run test:browser` yang dijalankan pada audit ini. Isi test dan file workflow sudah ditinjau; ini **BUKAN PASS eksekusi CI saat ini**.

## 3. PASS yang dilaporkan pengguna, bukan hasil audit kode otomatis
Pada 2026-10-09, pengguna melaporkan **8/8 PASS** untuk daftar maksimal 10 baris, pencarian, filter tanggal/status (jika ada), pagination, reset, kontrol sesuai hak akses, Cetak/PDF/Excel, dan kesetaraan Desktop/HP. Catatan: hasil berlaku untuk skenario yang diuji, **tidak berarti setiap tabel di seluruh modul sudah 100% tersertifikasi**.

## 4. Dokumen baseline sebelumnya
`AUDIT_HULU_HILIR_LOCK_20261003.md` mencatat audit build 2340 sebagai `OPERATIONAL PASS — LOCKED`. **Jangan menganggap ini otomatis PASS build 2386.** Pastikan pengujian ulang hanya pada perubahan dan dependensi yang terdampak.

## 5. Pekerjaan berikutnya, tanpa merusak ritme kerja
1. Arsipkan PASS bertahap dari masing-masing akun ke matriks role × fitur, lengkap dengan tanggal dan versi.
2. Audit read-only guard objek/peran untuk 37 RPC privileged dan 13 grup policy yang ditandai advisor; prioritaskan temuan yang memiliki dampak keamanan nyata.
3. Validasi pencocokan transaksi sumber → laporan Arus Kas → laba rugi → RHPP per siklus, tanpa data uji atau pembetulan diam-diam.
4. Jalankan `npm run check`, `npm run test:browser`, dan uji alur peran di lingkungan uji sebelum klaim PASS menyeluruh.
5. Jangan ubah database/kode tanpa temuan terverifikasi dan uji dampak; jangan ulang tugas yang telah benar-benar diverifikasi di baseline relevan.

**Aturan status:** `PASS` hanya untuk pemeriksaan yang dijalankan dan terbukti; `PASS TERBATAS` untuk subset; `BELUM DIUJI` untuk sisa; `TEMUAN` untuk risiko yang masih memerlukan penyelesaian.


## 6. Audit khusus 37 SECURITY DEFINER & 13 temuan multiple RLS (2026-10-09)

**Metode:** SELECT pada katalog PostgreSQL (`pg_proc`, `pg_policies`) dan Supabase Security/Performance Advisors; tidak ada pemanggilan fungsi dengan efek samping atau perubahan RLS.

### 37 fungsi `SECURITY DEFINER` yang executable oleh `authenticated`
- **37/37** fungsi tidak callable oleh `anon` saat audit (hasil `has_function_privilege`).
- **37/37** definisi mengandung pemeriksaan `auth.uid()`, akses profil aktif, atau helper `private.my_bms_role()` (fungsi laporan SQL yang memanggil fungsi lain dengan guard juga perlu dilihat sebagai satu rantai otorisasi).
- Fungsi `log_user_activity` hanya memerlukan `auth.uid()` untuk menulis log pengguna sendiri; ini tidak identik dengan fungsi mutasi bisnis.
- Fungsi laporan `finance_company_profit_loss_v1`, `finance_expedition_profit_loss_v1/v2`, dan `finance_expedition_summary_v1` perlu pemeriksaan lanjutan **jalur pemanggil dan cakupan data**, sebab guard berada pada helper/pemanggil terkait, tidak terlihat langsung sebagai role check di awal SQL function.
- **Keputusan:** Tidak mencabut izin `authenticated` secara global karena aplikasi memang membutuhkan RPC tersebut. **PASS TERBATAS: anon tertutup dan guard teridentifikasi secara statis; BELUM PASS: simulasi abuse per akun dan seluruh alur pemanggil.**

### 13 peringatan `multiple_permissive_policies`
Seluruh **13/13** temuan yang dikembalikan advisor merupakan **dua kebijakan `SELECT`** pada role `authenticated`: `owner_read_all` disandingkan dengan `bms_select` atau policy baca khusus modul.

Tabel: `audit_events`, `barn_assets`, `expeditions`, `finance_cash_request_items`, `finance_cash_requests`, `finance_stock_purchase_invoices`, `harvests`, `profiles`, `rhpp_estimates`, `supplies`, `user_activity_logs`, `warehouse_stock_items`, `warehouse_stock_shipments`.

- Penggunaan `owner_read_all` pada SELECT mendukung SOP OWNER baca-saja; tabel terkait tetap memiliki kontrol mutasi terpisah.
- **Tidak ditemukan overlap kebijakan mutasi (INSERT/UPDATE/DELETE) pada daftar 13 peringatan tersebut.**
- Tanda `WARN` tetap muncul karena bentuk policy dapat menambah biaya evaluasi, **bukan bukti kebocoran akses atau salahnya hak OWNER**.
- **Keputusan:** DIPERTAHANKAN (accepted warning; alasan: tidak mengubah ritme kerja dan aturan OWNER). Optimalisasi hanya setelah benchmark serta pengujian regresi per-peran.

### Kesimpulan audit parsial
**Tidak ada perubahan kode/database/policy akibat audit khusus ini.** Tidak terdapat temuan baru yang cukup terbukti untuk memaksa perubahan alur kerja. Status keseluruhan **belum 100% PASS** sampai uji akses aktif per-peran dan jalur fungsi laporan selesai. Jangan mengulang scan katalog identik pada chat berikutnya tanpa perubahan fungsi/policy atau insiden; lanjutkan pemeriksaan yang belum teruji.


## 7. Aturan kerja stabilisasi per akun — TERKUNCI (2026-10-09)

Tahap proyek saat ini: **stabilisasi dan perbaikan bertahap berdasarkan temuan nyata pada masing-masing akun**, bukan mengulang audit keseluruhan dari nol.

1. **ADMIN:** Perbaikan berdasarkan temuan saat penggunaan.
2. **OWNER:** Seluruh menu yang menjadi cakupan OWNER dapat dibuka/dilihat, termasuk filter, cetak, PDF, dan Excel; **tanpa aksi yang mengubah transaksi atau data**.
3. **KEUANGAN:** Perbaikan alur transaksi dan laporan.
4. **LOGISTIK:** Perbaikan operasional, stok, dan pengiriman.
5. **MARKETING:** Perbaikan panen dan transaksi terkait.
6. **PPL:** Perbaikan recording, produksi, dan estimasi.

**Prosedur wajib:** temuan → perbaikan terbatas → uji ulang bagian terdampak → PASS sesuai bukti → catat tanggal, akun, fitur, dan commit di file audit.

**Larangan:** jangan mengubah ritme kerja, tema Desktop klasik/HP, aturan RHPP terkunci, hak akses sah, atau fitur PASS tanpa kebutuhan terverifikasi. Audit berstatus belum diuji tetap terbuka; hasil PASS lama tidak berarti seluruh sistem otomatis 100% PASS.

**Instruksi handoff chat:** baca bagian ini sebelum mengerjakan revisi per akun; tidak perlu mengulang scan PASS sebelumnya jika tidak ada perubahan terkait.


## 8. Perbaikan ekspor Excel RHPP PPL (2026-10-12)

- Temuan: hasil `RHPP_<kandang>_<siklus>.xlsx` memakai layout HTML grid/flex yang tidak diterjemahkan konsisten oleh aplikasi spreadsheet HP; label melebar di kolom A dan nilai tampak terpisah/terpotong.
- Perubahan terbatas: `modules/bms-production.js`, handler tombol Excel pada `pplRhppViewPage` (commit `6bd207898b4e496ef1383f6a0e36dc14d2ed55fc`).
- Ekspor kini membuat layout tabel datar, lebar tabel eksplisit, label/nilai dengan proporsi kolom, border dan header berformat; nama file ekstensi disesuaikan menjadi `.xls` karena formatnya HTML Excel-compatible, bukan berkas Office Open XML `.xlsx`.
- Perhitungan RHPP, sumber data, tombol Cetak/PDF, dan transaksi tidak diubah.
- Status: **PERBAIKAN KODE DITERAPKAN — BELUM PASS VISUAL** sampai file terbaru diunduh dan dibuka di Excel/HP serta desktop. Periksa bagian Identitas Siklus, Kinerja Produksi, Biaya Sapronak, Nilai RHPP, Rincian Panen, DOC, Pakan, dan OVK; pastikan semua nilai terbaca dan tidak terpotong.


## 9. Standar global ekspor Excel (2026-10-12)

- Perubahan global pada `bms-core.js`: seluruh ekspor yang menggunakan `BMSCore.excelBlob()` sekarang mendapat lebar kolom terstandar: kolom label pertama 18–36, kolom nilai kedua 16–28, kolom lanjutan 12–30. Ini mencegah kolom label/nilai terlalu sempit sekaligus membatasi laporan tabel yang sangat lebar.
- Perbaikan RHPP PPL pada `modules/bms-production.js` tetap mengubah layout grid menjadi susunan datar khusus laporan, sehingga data RHPP tidak bergantung pada dukungan grid/flex aplikasi spreadsheet HP.
- Ekstensi file RHPP sudah dipastikan kembali `.xlsx` karena `BMSCore.excelBlob()` menghasilkan workbook XLSX asli.
- Area terdampak: semua ekspor yang memakai mesin bersama menerima standar lebar kolom; laporan yang sudah berbentuk tabel tetap mempertahankan baris dan kolom sumber. Perhitungan, transaksi, akses peran, dan tema aplikasi tidak diubah.
- Status: **KODE DITERAPKAN — BELUM PASS GLOBAL** sampai pengujian unduh/buka dilakukan pada RHPP, keuangan, logistik, marketing, master data, dan audit/admin di HP serta desktop. Tidak mengklaim semua tombol Excel telah tervalidasi.
- Commits: global `9336bd1`; ekstensi RHPP XLSX `273e75e`.


## 10. Temuan PDF dibagikan ke WhatsApp — perbaikan mesin bersama (2026-10-12)

- Temuan dari file PDF RHPP pengguna: isi menjadi teks monospaced polos, tabel/format laporan hilang.
- Akar masalah: `BMSCore.savePdfHtml()` memakai `pdfBlobFromHtml()` yang meratakan HTML menjadi baris teks dan tidak mempertahankan layout visual.
- Perubahan terbatas pada `bms-core.js`: tombol PDF yang memakai helper bersama sekarang membuka laporan HTML bergaya cetak, dengan aturan A4, tabel, header, dan warna dipertahankan, lalu menggunakan dialog Print/Save as PDF native browser. Jika popup diblokir, helper mengunduh HTML berformat sebagai fallback.
- Tidak ada perubahan pada data, rumus, atau alur transaksi.
- Commits: `cdfda07`, `c157062`.
- **Status: BELUM PASS.** Harus diuji pada Android dan desktop. Alur native print dapat berbeda menurut browser. Fallback saat popup diblokir adalah HTML, bukan PDF; jangan menganggap tombol telah menghasilkan PDF sampai pengujian perangkat memastikan hasilnya.


## 11. RHPP PDF — lebar kolom nilai dan total (2026-10-12)

- Temuan perangkat: pada PDF yang dibagikan, kolom laporan rincian terlalu sempit sehingga angka besar seperti total terbungkus per digit/baris dan tanggal terpecah.
- Perubahan terbatas: gaya cetak RHPP pada `modules/bms-production.js` menggunakan A4 landscape, memastikan tabel memakai lebar tersedia, menambah padding sel, dan mencegah pemenggalan kata/angka sembarangan.
- Rumus RHPP dan data tidak diubah.
- Commit: `a7997cd`.
- Status: **BELUM PASS** hingga PDF baru diperiksa di HP. Pastikan kolom Total terbaca utuh dan semua tabel tetap lengkap.


## 12. Recording PPL multi-jenis pakan — penerapan awal (2026-10-12)

- Perubahan kode: form Recording PPL sekarang menerima beberapa baris pakan, jumlah masing-masing, validasi pilihan duplikat, dan estimasi total kilogram berdasarkan `kg_per_unit`.
- Perubahan database Supabase: tabel `recording_feed_items`, RPC `save_recording_mixed_atomic`, fungsi stok `production_feed_stock` yang menghitung detail campuran tanpa menghitung ganda, serta trigger `compute_recording_feed_kg` yang menjumlahkan semua jenis pakan.
- Kompatibilitas: recording lama tanpa detail tetap dihitung melalui kolom legacy; recording baru menyimpan komposisi lengkap di tabel detail. Pengeditan memuat kembali komposisi detail dan menyimpan ulang sampel bobot.
- Commit kode form: `8c7ec0ee25655ec6744cb90d4c5e23ae2d56bc12`; perbaikan form edit/reset: `b7fe02c4c7cf5d3230d54e8361290a8a7d8cb2e1`.
- Verifikasi yang sudah dilakukan: keberadaan RPC dan fungsi stok terkonfirmasi di database; perhitungan konversi satuan uji SQL menunjukkan 2 satuan × 50 kg = 100 kg; tidak ada referensi form lama `f.feed_item`/`f.feed_units` tersisa pada file setelah perbaikan.
- Batasan verifikasi: belum ada uji end-to-end lewat browser/perangkat dan belum ada uji penyimpanan recording nyata, pengeditan, dan rekonsiliasi stok setelah simpan. Perangkat remote untuk pemeriksaan sintaks tidak sedang online.
- Perbaikan lanjutan: RPC kini mengunci baris assignment saat penyimpanan dan memeriksa sisa stok dari database untuk setiap item di dalam transaksi, dengan penambahan kembali pemakaian lama saat mode edit. Ini mengurangi risiko dua recording bersamaan memakai stok yang sama.
- Pemeriksaan sintaks JavaScript pada isi file terbaru: **PASS** melalui parser JavaScript. Keberadaan RPC, fungsi stok, dan trigger terkonfirmasi di database. Belum ada recording produksi yang dibuat atau diubah sebagai uji.
- Status: **KODE + DATABASE DITERAPKAN — BELUM PASS END-TO-END**. Jangan menandai PASS sebelum alur simpan/edit dan rekonsiliasi stok diuji lewat aplikasi di perangkat.
