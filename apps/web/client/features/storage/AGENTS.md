# `client/features/storage/` — Signed media uploads

## Contract

Follow **`docs/playbooks/media-upload.md`**: downscale in the browser, `POST /storage/sign`, PUT to `uploadUrl`, persist `publicUrl`.

## Files

| File | Role |
|------|------|
| **`storageApi.ts`** | Sign + PUT helpers. |
| **`useMediaUpload.ts`** | Mutation used by composers / pet editors. |

When `STORAGE_CAP_EXCEEDED` fires, show the API `error.message` string as-is.
