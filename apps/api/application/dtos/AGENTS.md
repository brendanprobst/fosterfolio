# `apps/api/application/dtos/` — API projections

## Public vs owner

Every domain entity that is returned over HTTP should expose two mappers:

- **`toPublicDto()`** — safe for unauthenticated / other-user responses. Never includes email, zip, lat/lng, or other private fields.
- **`toOwnerDto()`** — may include fields only the owning user should see.

Controllers and use cases choose which projection to return. Do **not** call a catch-all `toPrimitives()` from a public route.

`User` and `Pet` are the worked examples: public GETs use `toPublicDto()`; owner writes return `toOwnerDto()`. Never return private fields (`email`, `zipCode`, `lat`, `lng`) from public user endpoints.
