# `client/features/stars/` — Anonymous profile stars

`POST /users/:id/star` with `{ sessionToken }` from `localStorage` (`getStarSessionToken`). Dedup is server-side; the button also remembers starred ids locally so the UI stays honest after reload.
