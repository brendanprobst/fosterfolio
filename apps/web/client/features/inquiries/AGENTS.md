# `client/features/inquiries/` — Public inquiry form

`POST /inquiries` is unauthenticated. Render **`InquiryForm`** on the pet bio and public profile. Surface `error.message` from the API as-is (invalid input, missing target, email failed). Owner previews on pet bio and foster-me use **`ContactFosterBlock`** (`LockedInquiryPreview` vs the live expandable form) so that branch is not duplicated per page. On success, name the foster when we have `displayName`; `ExpandableInquiryForm` closes the dialog and keeps the success alert on the card.
