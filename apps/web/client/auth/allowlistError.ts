const NOT_APPROVED_FRIENDLY_MESSAGE =
  "This email isn't approved for Fosterfolio yet. Ask the person who invited you to add your address.";

export const AUTH_UNAVAILABLE_MESSAGE =
  "Sign-in isn't available right now. Try again in a moment.";

/**
 * The `auth.enforce_allowed_email` Postgres trigger raises an exception with the
 * stable prefix `EMAIL_NOT_APPROVED:` (see
 * `apps/api/supabase/migrations/allowed_emails_signup_gate.sql`). Supabase
 * surfaces that text inside the auth error message for both email/password and
 * OAuth flows, so checking for the prefix here is sufficient.
 */
export function isEmailNotApprovedError(message: string | null | undefined): boolean {
  if (!message) {
    return false;
  }
  return message.toLowerCase().includes("email_not_approved");
}

export function friendlyAuthErrorMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }
  if (isEmailNotApprovedError(message)) {
    return NOT_APPROVED_FRIENDLY_MESSAGE;
  }
  if (/supabase|jwt|environment variable|not configured/i.test(message)) {
    return AUTH_UNAVAILABLE_MESSAGE;
  }
  return message;
}
