# `client/features/inquiries/` — Public inquiry form

`POST /inquiries` is unauthenticated. Render **`InquiryForm`** on the pet bio and public profile. Surface `error.message` from the API as-is (invalid input, missing target, email failed). **`ContactFosterBlock`** is the visitor form on pet bio and foster-me. Owners do not see it on their own pet. On success, name the foster when we have `displayName`; `ExpandableInquiryForm` closes the dialog and keeps the success alert on the card.
