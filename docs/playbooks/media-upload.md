# Media upload contract (client)

Fosterfolio media lives in the public Supabase bucket `fosterfolio-media`. The API never accepts file bytes; the browser uploads directly to a signed URL.

## Cap

Per-user usage is summed by `public.user_storage_bytes` over objects under `{userId}/…`. The API reads the cap from `STORAGE_CAP_BYTES` (default **50MB** / `52428800`).

If the user is already at or over the cap (or `used + contentLength` would exceed it), `POST /storage/sign` returns **413** with:

```json
{
  "error": {
    "status": 413,
    "code": "STORAGE_CAP_EXCEEDED",
    "message": "You've used up your storage. Remove a photo to upload more."
  }
}
```

Render that message verbatim in the UI.

## Downscale before upload

Phone photos are often 3–5MB. Clients **must** downscale before requesting a signature:

| Rule | Value |
|---|---|
| Max long edge | 2048px |
| Formats | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Target file size | Prefer ≤ 1MB after compression (JPEG quality ~0.8 is fine) |
| `contentLength` | Pass the final byte length as `contentLength` on `/storage/sign` so the API can reject before signing |

Suggested client flow:

1. Resize/compress in the browser (canvas or a small image library).
2. `POST /storage/sign?filename=photo.jpg&contentType=image/jpeg&contentLength={bytes}` with the user JWT.
3. `PUT`/`POST` the blob to `uploadUrl` (Supabase signed upload; include the token as returned).
4. Persist `publicUrl` on the pet/post (absolute URL — required for OG/meta later).

## Object paths

The API chooses the object key: `{userId}/{uuid}-{sanitizedFilename}`. Never invent paths client-side; always use the `path` / `publicUrl` from the sign response. The random suffix prevents overwrites and path enumeration across users.
