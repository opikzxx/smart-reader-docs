# Smart Reader Docs

Aplikasi untuk mengunggah dokumen finansial (invoice, receipt, quotation, dll) lalu mengekstrak datanya secara otomatis dengan AI vision model. User bisa mereview, mengedit, dan mengekspor hasilnya ke CSV.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Cloudflare Workers** via OpenNext sebagai runtime production
- **Cloudflare D1** (SQLite) untuk database, **R2** untuk file storage, **Images** binding untuk thumbnail
- **NextAuth v5** dengan GitHub OAuth + JWT session, D1Adapter
- **TanStack Query** untuk data fetching dan caching, **TanStack Table** untuk dashboard
- **Tailwind v4** + shadcn/ui untuk UI
- **Gemini 2.5 Flash** sebagai vision model untuk OCR/ekstraksi
- **Vitest** + fast-check untuk unit & property-based tests

## Pendekatan OCR/AI

Saya pakai **single-shot vision LLM (Gemini 2.5 Flash)** dengan prompt yang strict-format JSON

Alasannya:

- Dokumen finansial sangat bervariasi layout-nya. Tradisional OCR butuh template engine atau model NER terpisah agar bisa mapping "nilai 100.000 ini ke field mana". Vision LLM bisa langsung memahami konteks visual + spasial dalam satu panggilan.
- Gemini 2.5 Flash relatif murah dan cepat, sudah cukup akurat untuk bahasa Indonesia + simbol Rupiah, dan bisa mengembalikan structured JSON dengan response schema enforcement.
- Saya juga minta model mengembalikan **confidence scores per field**. Ini jauh lebih useful daripada OCR confidence per karakter karena bisa langsung dipakai untuk highlight UI dan trigger manual review.
- Prompt juga eksplisit menolak gambar non-dokumen (foto orang, meme, dll) dan dokumen yang terlalu blur — model langsung return error code, bukan halusinasi data acak.

## Asumsi yang Diambil

- **User base kecil** (single tenant feel). Tidak ada role/permission complex, tidak ada multi-org.
- **File size** dibatasi 10 MB, hanya PNG/JPEG/WebP/PDF. PDF di-handle sebagai gambar (rendering halaman pertama).
- **Confidence threshold 0.7**. Skor di bawah ini dianggap "low confidence" dan field di-highlight di review form.
- **Hasil ekstraksi tidak immutable**. User bisa edit di review form sebelum mark sebagai ready.

## AI Workflow Log

Sebagian besar pengerjaan project ini saya pakai **Kiro** sebagai pair programmer. Berikut breakdown-nya:

### Tools yang digunakan

- **Kiro (Spec Mode)** — untuk drafting requirements doc, design doc, dan task list di awal project.
- **Kiro (Vibe Mode)** — untuk implementasi per-task: write file, refactor, debug deployment issues.
- **Gemini 2.5 Flash** — production-time, untuk OCR/extraction itu sendiri.


## Cara Menangani Akurasi Rendah

Beberapa lapis pertahanan:

1. **Per-field confidence scores** dari model. Field dengan skor < 0.7 di-highlight kuning di review form, supaya user fokus mengoreksi yang berisiko.
2. **Status `review` wajib sebelum `ready`**. Tidak ada auto-confirm. User harus eksplisit submit review form sebelum dokumen bisa diekspor sebagai data final.
3. **Validation runtime** di `validateExtractionResult` dan `validateReviewForm`: range numerik, ISO 4217 currency, format tanggal, panjang string. Output model yang aneh di-reject sebelum masuk D1.
4. **Error response dari model**: kalau gambar bukan dokumen atau terlalu blur, model return `{"error": ...}` bukan data ngawur. Saya tangkap dan ubah status ke `uploaded` lagi supaya user bisa upload ulang.
5. **Edit & re-extract**. User selalu bisa edit manual atau pencet "Re-extract" untuk panggil model lagi (mungkin dengan crop/rotate berbeda).

## Setup Lokal

```bash
# Node 22+ wajib (wrangler requirement)
nvm use 22
npm install

# Salin .dev.vars contoh, isi AUTH_SECRET, AUTH_GITHUB_ID/SECRET, GOOGLE_AI_API_KEY
cp .dev.vars.example .dev.vars

# Apply migration ke D1 lokal
npx wrangler d1 migrations apply DB --local

# Run dev server
npm run dev
```

## Deploy ke Cloudflare

```bash
# Apply migration ke remote D1
npx wrangler d1 migrations apply DB --remote

# Set secrets (sekali per secret)
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_GITHUB_ID
npx wrangler secret put AUTH_GITHUB_SECRET
npx wrangler secret put GOOGLE_AI_API_KEY

# Deploy
npm run deploy
```
