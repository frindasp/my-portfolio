# My Portfolio (Next.js)

Aplikasi portfolio berbasis Next.js (App Router) dengan fitur auth, dashboard, chat, contact form, dan dukungan tema light/dark.

## Menjalankan Project

```bash
npm install
npm run dev
```

Buka `http://localhost:5009` (sesuai konfigurasi script `dev`).

## Testing & Quality Tools (Otomatis)

Kami sudah menambahkan tools testing agar proses pengecekan bisa dijalankan konsisten:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:full
```

### Arti tiap command

- `npm run lint` → Menjalankan custom lint checker (`scripts/lint.mjs`) untuk deteksi conflict marker git dan trailing whitespace.
- `npm run typecheck` → Cek error TypeScript tanpa menghasilkan file output.
- `npm run test` → Menjalankan lint + typecheck.
- `npm run build` → Validasi produksi (compile Next.js).
- `npm run test:full` → Menjalankan seluruh validasi utama (test + build).

## Struktur Utama

- `app/` → routing dan halaman.
- `components/` → komponen UI dan fitur.
- `lib/` → utility, constants, helper, integrasi service.
- `store/` → state management.
- `prisma/` → schema database.

## Catatan

Untuk otomatisasi CI/CD, pakai `npm run test:full` sebagai single command di pipeline.
