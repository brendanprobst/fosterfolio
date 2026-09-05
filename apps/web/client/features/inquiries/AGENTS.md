# `client/features/inquiries/` — Public inquiry form

`POST /inquiries` is unauthenticated. Render **`InquiryForm`** on the pet bio and public profile. Surface `error.message` from the API as-is (invalid input, missing target, email failed).
