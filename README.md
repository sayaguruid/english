# 🦖 Kids English — Situs Belajar untuk Anak

Situs statis untuk belajar bahasa Inggris bersama anak: ungkapan sehari-hari, permainan kuis, dialog, dan cek pengucapan lewat mikrofon. **Tanpa database, tanpa build** — cukup unggah ke GitHub Pages atau hosting apa pun.

## File

| File | Keterangan |
|---|---|
| `index.html`, `style.css`, `app.js` | **File inti (mesin aplikasi)** — beranda, profil nama anak, suara benar/salah, tes bicara |
| `pelajaran1.html`, `pelajaran2.html`, ... | Isi pelajaran — tambah pelajaran = tambah file baru |
| `template-pelajaran.html` | Template untuk pelajaran baru |
| `manifest.json`, `sw.js`, `icons/`, `sfx/` | Pendukung mode aplikasi (PWA) & efek suara |
| `petunjuk.html` | Panduan lengkap (buka di browser) |

## Pasang di HP seperti aplikasi

Setelah diunggah (HTTPS): buka alamatnya di Chrome/Safari HP → **Tambahkan ke layar utama** — muncul ikon 🦖 sendiri dan terbuka penuh layar tanpa address bar.

## Menambah pelajaran

1. Salin `template-pelajaran.html` → `pelajaran3.html` (nomor berurutan).
2. Edit blok `<script id="lesson-data" type="application/json">` di dalamnya.
3. Unggah file baru itu ke repo/hosting. Beranda mendeteksinya otomatis.

Detail lengkap ada di `petunjuk.html`.

## Upload

- **GitHub Pages**: buat repo → upload semua file → Settings → Pages → Branch `main` / root → alamat `https://username.github.io/nama-repo/`.
- **Hosting sendiri**: unggah semua file ke `public_html`.

## Catatan kunci pelajaran & progres

- Pelajaran N terbuka setelah pelajaran N−1 **selesai di browser/domain yang sama** (progres disimpan di localStorage — pindah browser, HP, atau domain berarti mulai dari kosong).
- Di layar 🔒 ada tombol **"🔓 Buka Tetap (Orang Tua)"** untuk membuka pelajaran tanpa menyelesaikan sebelumnya; pilihan tersimpan, cukup ditekan sekali per pelajaran.
