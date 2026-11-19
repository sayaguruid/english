# 🦖 Kids English — Situs Belajar untuk Anak

Situs statis untuk belajar bahasa Inggris bersama anak: ungkapan sehari-hari, permainan kuis, dialog, dan cek pengucapan lewat mikrofon. **Tanpa database, tanpa build** — cukup unggah ke GitHub Pages atau hosting apa pun.

## File

| File | Keterangan |
|---|---|
| `index.html`, `style.css`, `app.js` | **File inti** — tidak perlu diubah |
| `pelajaran1.html`, `pelajaran2.html`, ... | Isi pelajaran — tambah pelajaran = tambah file baru |
| `template-pelajaran.html` | Template untuk pelajaran baru |
| `petunjuk.html` | Panduan lengkap (buka di browser) |

## Menambah pelajaran

1. Salin `template-pelajaran.html` → `pelajaran3.html` (nomor berurutan).
2. Edit blok `<script id="lesson-data" type="application/json">` di dalamnya.
3. Unggah file baru itu ke repo/hosting. Beranda mendeteksinya otomatis.

Detail lengkap ada di `petunjuk.html`.

## Upload

- **GitHub Pages**: buat repo → upload semua file → Settings → Pages → Branch `main` / root → alamat `https://username.github.io/nama-repo/`.
- **Hosting sendiri**: unggah semua file ke `public_html`.
