# @lattice/notifications

App-agnostic in-app notifications with an optional email send.

The app registers types with `registerType({ type, emailTemplate, defaultEmailEnabled })`. `dispatch` writes the in-app row first, then sends email only when that recipient's preference is enabled. No preference row means the registered default.

`InAppChannel` is the repository port. `EmailChannel` is the send port. This package does not include an SES client. The app adapts whatever mailer it already has.

## Unsubscribe tokens

Unsubscribe tokens are a follow-up. They are needed once a non-transactional type exists. Inquiry mail is transactional, so v2 does not mint a token. The email footer links to `/settings/notifications`, where the recipient can turn that type's email off. In-app delivery stays on.
