# Penilaian Kinerja Akun — definisi indikator

Menu Administrator → Penilaian Kinerja Akun hanya dapat diakses ADMIN aktif. OWNER dan peran lain tidak mendapat akses melalui navigasi maupun RPC.

- Periode berdasarkan tanggal simpan audit server dalam Asia/Jakarta, maksimal 366 hari.
- Input baru dihitung dari audit INSERT/DB_INSERT transaksi utama. Rincian barang, sampel, login, dan buka menu tidak menjadi volume kerja.
- Tanggal kegiatan berasal dari kolom operasional tiap sumber (contoh recorded_on, shipment_date, harvested_on, paid_on).
- Tepat waktu: tanggal simpan sama dengan tanggal kegiatan. Terlambat: simpan setelah tanggal kegiatan. Tanggal tidak valid/kosong/di masa depan belum dinilai dan dikeluarkan dari denominator.
- Persentase = tepat waktu / (tepat waktu + terlambat). Jika denominator nol tampil -, bukan 0% atau nilai 100%.
- Rata-rata jeda memakai hari kalender, bukan jam kerja atau durasi penyelesaian tugas.
- Perubahan dan penghapusan dihitung per record, pelaku, dan hari. Pembaruan dalam transaksi pembuatan record serta no-op update dikecualikan. Koreksi bukan otomatis kesalahan dan tidak diberi penalti.
- Akun yang melakukan input menerima atribusi, bukan sekadar penanggung jawab kandang atau kolom created_by. Peran akun pada laporan adalah peran saat ini; kategori pekerjaan terpisah dari peran.
- Kelengkapan recording memakai kandang aktif dengan Chick-In: H+1 sampai kemarin dalam periode filter, satu hari dianggap terisi jika ada recording. Tanggung jawab PPL saat ini ditampilkan secara eksplisit; tidak mengarang histori penugasan. Tidak dicampurkan ke persentase ketepatan akun.
- Volume nol hanya berarti tidak ada audit sesuai filter. Histori sebelum audit tersedia tidak dibuat ulang. Akun tak teridentifikasi tidak dibebankan ke petugas.
- Cakupan sumber ditampilkan pada rincian audit. Audit Form Pengajuan Kas dimulai untuk perubahan berikutnya saja. Dokumen tersebut tetap administratif dan tidak memposting transaksi keuangan.

Grafik dan tabel memakai agregat yang sama. Tidak ada skor total atau peringkat otomatis lintas pekerjaan yang berbeda. Laporan bersifat baca saja; tidak mengubah RHPP, gaji, transaksi atau hak akses operasional.
