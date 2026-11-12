# BMS Mobile — LOCKED BUSINESS RULES

Status: **LOCKED — DO NOT CHANGE WITHOUT EXPLICIT OWNER APPROVAL**

Dokumen ini adalah sumber kebenaran aturan bisnis yang sudah disetujui.
Perubahan kode yang bertentangan dengan aturan di bawah wajib dianggap regresi, bukan “perbaikan”.

## LOCK-001 — Dashboard Kandang Aktif
Kandang/Siklus dihitung **Aktif di Dashboard hanya setelah DOC/Chick-In tersedia**.
Assignment `active=true` tanpa Chick-In belum dihitung sebagai Kandang Aktif Dashboard.

## LOCK-002 — Pembagian ABK saat Chick-In
Dasar pembagian Populasi Awal ABK adalah **DOC In / jumlah kedatangan (`received`)**.
DOC Mati Box / DOA dicatat terpisah dan **tidak mengurangi dasar pembagian ABK**.

Contoh: DOC datang 8.100, Mati Box 2 → total pembagian ABK tetap 8.100.

## LOCK-003 — Rekap Produksi PPL
Sumber utama Rekap Produksi PPL adalah **Liga ABK kumulatif per kandang + siklus**.
Tidak menampilkan nama/jumlah ABK pada tabel rekap.
Untuk siklus historis CLOSED yang belum memiliki data Liga ABK, gunakan **snapshot final produksi yang sudah tersimpan** sebagai fallback.
Tidak boleh membuat data ABK historis palsu.

## LOCK-004 — MANDIRI memakai Kontrak Acuan Penilaian
Siklus MANDIRI tetap dinilai menggunakan **kontrak acuan pembanding** agar adil terhadap MITRA.
Jika hanya ada satu kontrak master yang valid dengan tabel harga hidup, kontrak itu dipakai sebagai acuan.
Label tampilan wajib menjelaskan **“Kontrak Acuan Penilaian”** agar tidak dianggap sebagai kontrak yang mengikat siklus MANDIRI.
Tidak boleh menghapus acuan kontrak MANDIRI hanya karena `master_contract_id` siklus kosong.

## LOCK-005 — Keaslian hasil Cetak / PDF / Excel
Hasil cetak resmi tidak boleh mengarang data.

- Nilai database benar-benar 0 → boleh tampil 0.
- Nilai NULL / tidak pernah tersimpan / tidak tersedia → tampil `-` atau keterangan tidak tersedia.
- Tidak boleh ada angka `Rp 0` hardcoded untuk komponen yang sebenarnya tidak dialokasikan.
- Tidak boleh ada baris fakta hardcoded seperti “KOMPLAIN DOC = 0”.
- Tidak boleh ada SIMULASI / DUMMY / PLACEHOLDER / TEST dalam hasil cetak resmi.
- Identitas kop dokumen memakai **Master Data Perusahaan**, bukan nama perusahaan hardcoded.
- Print, PDF, dan Excel harus memakai sumber data yang sama dengan layar audit.

## LOCK-006 — RHPP ABK OVK
OVK yang belum/tidak dialokasikan per ABK **bukan Rp 0**.
Tampilkan `Tidak dialokasikan` / `-`.

## LOCK-007 — Tambah Daging
Tambah Daging:
- ikut performa RHPP (ekor, kg, BW/performa),
- harga mengikuti harga kontrak berdasarkan BW,
- tidak masuk biaya sapronak kontrak,
- biaya Tambah Daging dikurangkan **setelah Nilai RHPP Kontrak** sebagai Penyesuaian Biaya Perusahaan.

## LOCK-008 — Tambah Sapronak / Pakan Tambahan
Tambah Sapronak/Pakan Tambahan:
- tidak masuk Pakan Kontrak RHPP,
- tidak masuk FCR/IP kontrak,
- tidak masuk biaya sapronak kontrak,
- tetap tercatat sebagai biaya perusahaan/hutang supplier,
- dikurangkan setelah Nilai RHPP Kontrak sebagai Penyesuaian Biaya Perusahaan.

## LOCK-009 — Urutan ekonomi RHPP
Urutan wajib:
1. Hitung performa RHPP.
2. Hitung biaya sapronak kontrak.
3. Hitung Laba Dasar + bonus kontrak.
4. Dapatkan **Nilai RHPP Kontrak**.
5. Kurangi Tambah Daging.
6. Kurangi Tambah Sapronak/Pakan Tambahan.
7. Hasil akhir = hasil perusahaan setelah biaya tambahan.

## Governance
Setiap perubahan terhadap LOCK-001 s/d LOCK-009 harus:
1. mendapat persetujuan eksplisit pemilik/Administrator proyek;
2. memperbarui dokumen ini;
3. memperbarui test guard terkait;
4. lulus `npm run check`.

Jika hanya “refactor”, “audit”, “rapikan”, atau “perbaikan UI”, aturan LOCKED tetap tidak boleh berubah.


## OPERATIONAL BASELINE LOCK
Baseline operasional dikunci pada **build 2343-recording-age-h1-after-arrival**, audit 2026-10-03.
Detail bukti audit: `AUDIT_HULU_HILIR_LOCK_20261003.md`.

Setiap perubahan setelah baseline ini wajib lulus:
- `npm run check`
- seluruh locked business rule guards
- audit lock guards
- Chromium browser smoke test

Build yang gagal Verify application tidak boleh dianggap siap operasi.


## OWNER CHANGE CONTROL
Mulai baseline build 2340, **setiap perubahan kode atau database harus mendapat persetujuan eksplisit Owner terlebih dahulu**.

Permintaan seperti **cek, audit, lihat, analisa, cari masalah** adalah read-only dan **bukan izin untuk melakukan perubahan**.

Dokumen governance: `OWNER_CHANGE_CONTROL.md`.


## LOCK-010 — Umur Recording PPL
Tanggal DOC datang adalah **Hari 0**.
Recording PPL **Hari 1 dimulai H+1 / sehari setelah DOC datang**.
Tanggal recording untuk Hari N = tanggal DOC datang + N hari.
Histori recording yang sudah tersimpan tidak boleh digeser massal hanya karena aturan ini.

## RHPP — koreksi disetujui Owner 2026-11-12

- DOA menjadi catatan pada RHPP baru; dasar populasi adalah DOC diterima, tanpa pengurangan DOA. Harga rata-rata DOC bersumber dari jumlah dan nilai kiriman DOC.
- Snapshot RHPP yang sudah CLOSED dipertahankan. Saat close baru, populasi diterima dipakai sebelum snapshot pertama dibuat.
- Rincian kiriman dan retur mencakup seluruh kategori barang, tanggal, dokumen, jumlah, satuan, kg, harga, nilai, dan catatan yang tersedia. Data yang tidak tercatat ditampilkan `-`.
- Cetak, PDF, dan Excel Cek RHPP mengambil tabel dan nilai dari halaman pemeriksaan yang sama, tanpa menghitung laporan kedua.
- Data tersedia tidak membuktikan panen selesai. Administrator wajib memverifikasi seluruh transaksi sebelum Deal & Close.
